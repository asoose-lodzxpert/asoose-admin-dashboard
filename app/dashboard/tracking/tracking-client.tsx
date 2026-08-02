'use client'

import Script from 'next/script'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io } from 'socket.io-client'
import { cn } from '@/app/lib/utils'

type ActorType = 'DRIVER' | 'RIDER'
type ActorFilter = 'ALL' | ActorType
type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error'

interface ActorProfile {
  firstName?: string | null
  lastName?: string | null
  fullName?: string | null
  phone?: string | null
  avatar?: string | null
  profilePhoto?: string | null
  status?: string | null
  isOnline?: boolean | null
  rating?: number | null
  vehicle?: {
    type?: string | null
    brand?: string | null
    model?: string | null
    color?: string | null
    plate?: string | null
  } | null
}

interface TrackingLocation {
  actorType: ActorType
  actorId: string
  latitude: number
  longitude: number
  heading?: number | null
  speed?: number | null
  sequence?: number | null
  profile?: ActorProfile | null
  updatedAt: string
}

interface LatLngLiteral {
  lat: number
  lng: number
}

interface GoogleMap {
  fitBounds(bounds: GoogleBounds, padding?: number): void
  panTo(position: LatLngLiteral): void
  setZoom(zoom: number): void
}

interface GoogleBounds {
  extend(position: LatLngLiteral): void
}

interface GoogleOverlayProjection {
  fromLatLngToDivPixel(position: LatLngLiteral): { x: number; y: number } | null
}

interface GoogleOverlayPanes {
  overlayMouseTarget: Element
}

interface GoogleOverlayView {
  setMap(map: GoogleMap | null): void
  getProjection(): GoogleOverlayProjection
  getPanes(): GoogleOverlayPanes | null
}

interface GoogleMapsApi {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMap
  LatLngBounds: new () => GoogleBounds
  OverlayView: new () => GoogleOverlayView
}

interface LiveMarker extends GoogleOverlayView {
  setLocation(location: TrackingLocation): void
  setSelected(selected: boolean): void
}

const NIGERIA_CENTER = { lat: 9.082, lng: 8.6753 }
const FILTERS: { label: string; value: ActorFilter }[] = [
  { label: 'All', value: 'ALL' },
  { label: 'Drivers', value: 'DRIVER' },
  { label: 'Riders', value: 'RIDER' },
]

function mapsApi() {
  return (window as Window & { google?: { maps: GoogleMapsApi } }).google?.maps
}

function actorKey(location: Pick<TrackingLocation, 'actorType' | 'actorId'>) {
  return `${location.actorType}:${location.actorId}`
}

function actorName(location: TrackingLocation) {
  const profile = location.profile
  return (
    profile?.fullName?.trim() ||
    [profile?.firstName, profile?.lastName].filter(Boolean).join(' ').trim() ||
    `${location.actorType === 'DRIVER' ? 'Driver' : 'Rider'} ${location.actorId.slice(0, 6)}`
  )
}

function actorPhoto(location: TrackingLocation) {
  return location.profile?.profilePhoto?.trim() || location.profile?.avatar?.trim() || null
}

function initials(location: TrackingLocation) {
  const name = actorName(location)
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function isTrackingLocation(value: unknown): value is TrackingLocation {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<TrackingLocation>
  return (
    (item.actorType === 'DRIVER' || item.actorType === 'RIDER') &&
    typeof item.actorId === 'string' &&
    item.actorId.length > 0 &&
    typeof item.updatedAt === 'string' &&
    typeof item.latitude === 'number' &&
    Number.isFinite(item.latitude) &&
    item.latitude >= -90 &&
    item.latitude <= 90 &&
    typeof item.longitude === 'number' &&
    Number.isFinite(item.longitude) &&
    item.longitude >= -180 &&
    item.longitude <= 180
  )
}

function unwrapLocation(value: unknown): unknown {
  if (value && typeof value === 'object' && 'data' in value) {
    return (value as { data?: unknown }).data
  }
  return value
}

function formatLastSeen(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Just now'
  return new Intl.DateTimeFormat('en-NG', {
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  }).format(date)
}

function speedLabel(speed?: number | null) {
  if (typeof speed !== 'number' || !Number.isFinite(speed)) return '—'
  return `${Math.max(0, Math.round(speed))} km/h`
}

function connectionCopy(status: ConnectionStatus) {
  switch (status) {
    case 'connected':
      return 'Live'
    case 'connecting':
      return 'Connecting'
    case 'error':
      return 'Connection issue'
    default:
      return 'Offline'
  }
}

function createLiveMarker(
  maps: GoogleMapsApi,
  initialLocation: TrackingLocation,
  onSelect: (key: string) => void
): LiveMarker {
  class ActorOverlay extends maps.OverlayView implements LiveMarker {
    private location = initialLocation
    private element: HTMLButtonElement | null = null
    private selected = false

    onAdd() {
      const element = document.createElement('button')
      element.type = 'button'
      element.style.cssText = [
        'position:absolute',
        'display:flex',
        'align-items:center',
        'gap:7px',
        'height:44px',
        'max-width:190px',
        'padding:4px 10px 4px 4px',
        'border:2px solid white',
        'border-radius:999px',
        'background:#fff',
        'box-shadow:0 6px 20px rgba(15,23,42,.24)',
        'cursor:pointer',
        'transform:translate(-22px,-50%)',
        'transition:transform .15s ease, box-shadow .15s ease',
        'font:600 12px Arial,sans-serif',
        'color:#0f172a',
        'white-space:nowrap',
      ].join(';')
      element.addEventListener('click', () => onSelect(actorKey(this.location)))
      this.element = element
      this.renderContent()
      this.getPanes()?.overlayMouseTarget.appendChild(element)
    }

    draw() {
      if (!this.element) return
      const point = this.getProjection().fromLatLngToDivPixel({
        lat: this.location.latitude,
        lng: this.location.longitude,
      })
      if (!point) return
      this.element.style.left = `${point.x}px`
      this.element.style.top = `${point.y}px`
    }

    onRemove() {
      this.element?.remove()
      this.element = null
    }

    setLocation(location: TrackingLocation) {
      this.location = location
      this.renderContent()
      this.draw()
    }

    setSelected(selected: boolean) {
      this.selected = selected
      this.updateSelectedStyle()
    }

    private updateSelectedStyle() {
      if (!this.element) return
      this.element.style.transform = this.selected
        ? 'translate(-22px,-50%) scale(1.08)'
        : 'translate(-22px,-50%)'
      this.element.style.boxShadow = this.selected
        ? '0 8px 28px rgba(79,70,229,.42)'
        : '0 6px 20px rgba(15,23,42,.24)'
      this.element.style.borderColor = this.selected ? '#6366f1' : '#fff'
      this.element.style.zIndex = this.selected ? '2' : '1'
    }

    private renderContent() {
      if (!this.element) return
      this.element.replaceChildren()
      this.element.title = `${actorName(this.location)} · ${this.location.actorType}`
      this.element.setAttribute('aria-label', this.element.title)

      const avatar = document.createElement('span')
      avatar.style.cssText = [
        'display:flex',
        'align-items:center',
        'justify-content:center',
        'width:32px',
        'height:32px',
        'flex:0 0 32px',
        'overflow:hidden',
        'border-radius:999px',
        `background:${this.location.actorType === 'DRIVER' ? '#e0e7ff' : '#d1fae5'}`,
        `color:${this.location.actorType === 'DRIVER' ? '#4338ca' : '#047857'}`,
        'font-size:11px',
        'font-weight:700',
      ].join(';')

      const photo = actorPhoto(this.location)
      if (photo) {
        const image = document.createElement('img')
        image.src = photo
        image.alt = ''
        image.style.cssText = 'width:100%;height:100%;object-fit:cover'
        image.addEventListener('error', () => {
          image.remove()
          avatar.textContent = initials(this.location)
        })
        avatar.appendChild(image)
      } else {
        avatar.textContent = initials(this.location)
      }

      const label = document.createElement('span')
      label.textContent = actorName(this.location)
      label.style.cssText = 'overflow:hidden;text-overflow:ellipsis;max-width:132px'
      this.element.append(avatar, label)
      this.updateSelectedStyle()
    }
  }

  return new ActorOverlay()
}

function ActorAvatar({ location }: { location: TrackingLocation }) {
  const [failed, setFailed] = useState(false)
  const photo = actorPhoto(location)

  return (
    <div
      className={cn(
        'flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full text-xs font-bold',
        location.actorType === 'DRIVER'
          ? 'bg-indigo-100 text-indigo-700'
          : 'bg-emerald-100 text-emerald-700'
      )}
    >
      {photo && !failed ? (
        // Remote actor photos are supplied by the API and can come from different hosts.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={photo}
          alt=""
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        initials(location)
      )}
    </div>
  )
}

export function TrackingClient({
  accessToken,
  socketUrl,
  googleMapsApiKey,
}: {
  accessToken: string
  socketUrl: string
  googleMapsApiKey: string
}) {
  const mapElementRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<GoogleMap | null>(null)
  const markersRef = useRef(new Map<string, LiveMarker>())
  const hasCenteredRef = useRef(false)
  const actorsRef = useRef<Record<string, TrackingLocation>>({})
  const [mapsReady, setMapsReady] = useState(false)
  const [mapError, setMapError] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>(
    socketUrl && accessToken ? 'connecting' : 'error'
  )
  const [actors, setActors] = useState<Record<string, TrackingLocation>>({})
  const [filter, setFilter] = useState<ActorFilter>('ALL')
  const [selectedKey, setSelectedKey] = useState<string | null>(null)

  useEffect(() => {
    actorsRef.current = actors
  }, [actors])

  useEffect(() => {
    if (!socketUrl || !accessToken) return

    const socket = io(socketUrl, {
      path: '/socket.io',
      auth: { token: accessToken },
      transports: ['websocket'],
    })

    socket.on('connect', () => setConnectionStatus('connected'))
    socket.on('disconnect', () => setConnectionStatus('disconnected'))
    socket.on('connect_error', () => setConnectionStatus('error'))
    socket.on('tracking.location', (incoming: unknown) => {
      const location = unwrapLocation(incoming)
      if (!isTrackingLocation(location)) return

      const key = actorKey(location)
      setActors((current) => {
        const previous = current[key]
        if (
          previous &&
          typeof previous.sequence === 'number' &&
          typeof location.sequence === 'number' &&
          location.sequence <= previous.sequence
        ) {
          return current
        }
        return {
          ...current,
          [key]: {
            ...location,
            profile: location.profile ?? previous?.profile ?? null,
          },
        }
      })
    })

    return () => {
      socket.disconnect()
    }
  }, [accessToken, socketUrl])

  useEffect(() => {
    if (!mapsReady || !mapElementRef.current || mapRef.current) return
    const maps = mapsApi()
    if (!maps) return
    mapRef.current = new maps.Map(mapElementRef.current, {
      center: NIGERIA_CENTER,
      zoom: 6,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      clickableIcons: false,
    })
  }, [mapsReady])

  const selectActor = useCallback((key: string) => {
    setSelectedKey(key)
    const location = actorsRef.current[key]
    if (!location || !mapRef.current) return
    mapRef.current.panTo({ lat: location.latitude, lng: location.longitude })
    mapRef.current.setZoom(16)
  }, [])

  useEffect(() => {
    const maps = mapsApi()
    const map = mapRef.current
    if (!maps || !map) return

    const visibleKeys = new Set<string>()
    Object.values(actors).forEach((location) => {
      if (filter !== 'ALL' && location.actorType !== filter) return
      const key = actorKey(location)
      visibleKeys.add(key)
      let marker = markersRef.current.get(key)
      if (!marker) {
        marker = createLiveMarker(maps, location, selectActor)
        markersRef.current.set(key, marker)
        marker.setMap(map)
      } else {
        marker.setLocation(location)
        marker.setMap(map)
      }
      marker.setSelected(key === selectedKey)

      if (!hasCenteredRef.current) {
        map.panTo({ lat: location.latitude, lng: location.longitude })
        map.setZoom(15)
        hasCenteredRef.current = true
      }
    })

    markersRef.current.forEach((marker, key) => {
      if (!visibleKeys.has(key)) marker.setMap(null)
    })
  }, [actors, filter, mapsReady, selectActor, selectedKey])

  useEffect(() => {
    const markers = markersRef.current
    return () => {
      markers.forEach((marker) => marker.setMap(null))
      markers.clear()
    }
  }, [])

  const actorList = useMemo(
    () =>
      Object.values(actors)
        .filter((actor) => filter === 'ALL' || actor.actorType === filter)
        .sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
    [actors, filter]
  )
  const driverCount = Object.values(actors).filter((actor) => actor.actorType === 'DRIVER').length
  const riderCount = Object.values(actors).filter((actor) => actor.actorType === 'RIDER').length

  function fitVisibleActors() {
    const maps = mapsApi()
    const map = mapRef.current
    if (!maps || !map || actorList.length === 0) return
    if (actorList.length === 1) {
      map.panTo({ lat: actorList[0].latitude, lng: actorList[0].longitude })
      map.setZoom(16)
      return
    }
    const bounds = new maps.LatLngBounds()
    actorList.forEach((actor) => bounds.extend({ lat: actor.latitude, lng: actor.longitude }))
    map.fitBounds(bounds, 80)
  }

  return (
    <main className="flex min-h-full flex-col px-5 py-6 lg:px-8 lg:py-8">
      {googleMapsApiKey && (
        <Script
          id="google-maps-live-tracking"
          src={`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleMapsApiKey)}`}
          strategy="afterInteractive"
          onLoad={() => setMapsReady(true)}
          onReady={() => setMapsReady(true)}
          onError={() => setMapError('Google Maps could not be loaded. Check the API key and enabled APIs.')}
        />
      )}

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">Live tracking</h1>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                connectionStatus === 'connected'
                  ? 'bg-emerald-50 text-emerald-700'
                  : connectionStatus === 'connecting'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-red-50 text-red-700'
              )}
            >
              <span
                className={cn(
                  'h-1.5 w-1.5 rounded-full',
                  connectionStatus === 'connected'
                    ? 'animate-pulse bg-emerald-500'
                    : connectionStatus === 'connecting'
                      ? 'animate-pulse bg-amber-500'
                      : 'bg-red-500'
                )}
              />
              {connectionCopy(connectionStatus)}
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Real-time locations from the tracking.location stream.
          </p>
        </div>
        <div className="flex gap-3">
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Drivers</p>
            <p className="mt-0.5 text-lg font-bold text-slate-900">{driverCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 shadow-sm">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Riders</p>
            <p className="mt-0.5 text-lg font-bold text-slate-900">{riderCount}</p>
          </div>
        </div>
      </div>

      <section className="grid min-h-[620px] flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="flex min-h-0 flex-col border-b border-slate-200 lg:border-r lg:border-b-0">
          <div className="border-b border-slate-100 p-4">
            <div className="flex rounded-xl bg-slate-100 p-1">
              {FILTERS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setFilter(item.value)}
                  className={cn(
                    'flex-1 rounded-lg px-3 py-2 text-xs font-semibold transition-colors',
                    filter === item.value
                      ? 'bg-white text-indigo-700 shadow-sm'
                      : 'text-slate-500 hover:text-slate-800'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>

          <div className="max-h-64 flex-1 overflow-y-auto p-2 lg:max-h-none">
            {actorList.length === 0 ? (
              <div className="flex h-full min-h-44 items-center justify-center px-6 py-10 text-center">
                <div>
                  <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-4.2 7-11a7 7 0 1 0-14 0c0 6.8 7 11 7 11Z" />
                      <circle cx="12" cy="10" r="2.25" />
                    </svg>
                  </span>
                  <p className="mt-3 text-sm font-semibold text-slate-700">Waiting for locations</p>
                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    Active {filter === 'ALL' ? 'drivers and riders' : `${filter.toLowerCase()}s`} will appear here.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-1">
                {actorList.map((actor) => {
                  const key = actorKey(actor)
                  const vehicle = actor.profile?.vehicle
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => selectActor(key)}
                      className={cn(
                        'w-full rounded-xl p-3 text-left transition-colors',
                        selectedKey === key ? 'bg-indigo-50 ring-1 ring-indigo-100' : 'hover:bg-slate-50'
                      )}
                    >
                      <div className="flex gap-3">
                        <div className="relative">
                          <ActorAvatar location={actor} />
                          <span className="absolute right-0 bottom-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-semibold text-slate-900">{actorName(actor)}</p>
                            <span
                              className={cn(
                                'rounded-full px-1.5 py-0.5 text-[9px] font-bold tracking-wide',
                                actor.actorType === 'DRIVER'
                                  ? 'bg-indigo-100 text-indigo-700'
                                  : 'bg-emerald-100 text-emerald-700'
                              )}
                            >
                              {actor.actorType}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {vehicle
                              ? [vehicle.brand, vehicle.model, vehicle.plate].filter(Boolean).join(' · ')
                              : actor.profile?.phone || 'No vehicle details'}
                          </p>
                          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400">
                            <span>{speedLabel(actor.speed)}</span>
                            <span>Updated {formatLastSeen(actor.updatedAt)}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </aside>

        <div className="relative min-h-[440px] bg-slate-100">
          <div ref={mapElementRef} className="absolute inset-0" aria-label="Live driver and rider locations on Google Maps" />

          {actorList.length > 0 && mapsReady && !mapError && (
            <button
              type="button"
              onClick={fitVisibleActors}
              className="absolute top-4 right-4 z-10 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-md transition-colors hover:bg-slate-50"
            >
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.5 2.5h-4v4m15-4h-4m4 0v4m0 7v4h-4m-11-4v4h4" />
              </svg>
              Show all
            </button>
          )}

          {!mapsReady && !mapError && googleMapsApiKey && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
              <div className="text-center">
                <svg className="mx-auto h-6 w-6 animate-spin text-indigo-500" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.37 0 0 5.37 0 12h4Z" />
                </svg>
                <p className="mt-2 text-sm text-slate-500">Loading Google Maps…</p>
              </div>
            </div>
          )}

          {(mapError || !googleMapsApiKey) && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-100 p-8 text-center">
              <div>
                <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-5 w-5" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                  </svg>
                </span>
                <p className="mt-3 text-sm font-semibold text-slate-700">Map unavailable</p>
                <p className="mt-1 text-xs leading-5 text-slate-500">
                  {mapError || 'Set GOOGLE_MAPS_API_KEY to enable the live tracking map.'}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>
    </main>
  )
}
