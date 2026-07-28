'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import Link from 'next/link'
import Script from 'next/script'
import { useRouter } from 'next/navigation'
import { createAdminParcel } from '@/app/actions/parcels'
import { Button } from '@/app/components/ui/button'
import { useToast } from '@/app/components/ui/toast'
import { cn } from '@/app/lib/utils'
import type { ParcelSize } from '@/app/lib/types'

type Endpoint = 'pickup' | 'dropoff'

interface LocationDraft {
  address: string
  latitude: number | null
  longitude: number | null
}

interface ContactDraft {
  name: string
  phone: string
}

interface LatLngLiteral {
  lat: number
  lng: number
}

interface GoogleLatLng {
  lat(): number
  lng(): number
}

interface GoogleMap {
  addListener(event: string, handler: (event: { latLng?: GoogleLatLng }) => void): void
  fitBounds(bounds: GoogleBounds, padding?: number): void
  setCenter(position: LatLngLiteral): void
  setZoom(zoom: number): void
}

interface GoogleMarker {
  addListener(event: string, handler: (event: { latLng?: GoogleLatLng }) => void): void
  setPosition(position: LatLngLiteral): void
}

interface GoogleBounds {
  extend(position: LatLngLiteral): void
}

interface GooglePolyline {
  setPath(path: LatLngLiteral[]): void
}

interface GooglePlace {
  displayName?: string
  formattedAddress?: string
  location?: GoogleLatLng
  fetchFields(options: { fields: string[] }): Promise<void>
}

interface GooglePlacePrediction {
  toPlace(): GooglePlace
}

interface GoogleAutocomplete extends HTMLElement {
  includedRegionCodes: string[]
  placeholder: string
  value: string
}

interface GoogleMapsApi {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMap
  Marker: new (options: Record<string, unknown>) => GoogleMarker
  LatLngBounds: new () => GoogleBounds
  Polyline: new (options: Record<string, unknown>) => GooglePolyline
  Point: new (x: number, y: number) => unknown
  Geocoder: new () => {
    geocode(
      request: { location: LatLngLiteral },
      callback: (
        results: { formatted_address: string }[] | null,
        status: string
      ) => void
    ): void
  }
  places: {
    PlaceAutocompleteElement: new (
      options?: Record<string, unknown>
    ) => GoogleAutocomplete
  }
}

const EMPTY_LOCATION: LocationDraft = {
  address: '',
  latitude: null,
  longitude: null,
}

const PHONE_PATTERN = /^\d{11}$/
const LAGOS_CENTER = { lat: 6.5244, lng: 3.3792 }

function mapsApi() {
  return (window as Window & { google?: { maps: GoogleMapsApi } }).google?.maps
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="mt-1.5 text-xs text-red-500">{message}</p>
}

function TextField({
  label,
  error,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  label: string
  error?: string
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-700">
        {label} <span className="text-red-500">*</span>
      </label>
      <input
        {...props}
        className={cn(
          'w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20',
          error
            ? 'border-red-300 bg-red-50 focus:border-red-400'
            : 'border-slate-200 bg-slate-50 focus:border-indigo-500'
        )}
      />
      <FieldError message={error} />
    </div>
  )
}

function SectionHeading({
  number,
  title,
  description,
}: {
  number: string
  title: string
  description: string
}) {
  return (
    <div className="mb-5 flex items-start gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-bold text-indigo-600">
        {number}
      </span>
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        <p className="mt-0.5 text-xs text-slate-500">{description}</p>
      </div>
    </div>
  )
}

function CoordinateBadge({ location }: { location: LocationDraft }) {
  if (location.latitude === null || location.longitude === null) {
    return <span className="text-xs text-slate-400">Choose a suggestion or select on the map</span>
  }
  return (
    <span className="text-xs font-medium text-emerald-600">
      Location selected · {location.latitude.toFixed(5)}, {location.longitude.toFixed(5)}
    </span>
  )
}

export function CreateParcelClient({
  googleMapsApiKey,
}: {
  googleMapsApiKey: string
}) {
  const router = useRouter()
  const toast = useToast()
  const [sender, setSender] = useState<ContactDraft>({ name: '', phone: '' })
  const [recipient, setRecipient] = useState<ContactDraft>({ name: '', phone: '' })
  const [pickup, setPickup] = useState<LocationDraft>(EMPTY_LOCATION)
  const [dropoff, setDropoff] = useState<LocationDraft>(EMPTY_LOCATION)
  const [size, setSize] = useState<ParcelSize>('SMALL')
  const [description, setDescription] = useState('')
  const [activeEndpoint, setActiveEndpoint] = useState<Endpoint>('pickup')
  const [mapsReady, setMapsReady] = useState(false)
  const [mapError, setMapError] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [serverError, setServerError] = useState('')
  const [isPending, startTransition] = useTransition()

  const mapElementRef = useRef<HTMLDivElement>(null)
  const pickupInputRef = useRef<HTMLDivElement>(null)
  const dropoffInputRef = useRef<HTMLDivElement>(null)
  const pickupAutocompleteRef = useRef<GoogleAutocomplete | null>(null)
  const dropoffAutocompleteRef = useRef<GoogleAutocomplete | null>(null)
  const mapRef = useRef<GoogleMap | null>(null)
  const pickupMarkerRef = useRef<GoogleMarker | null>(null)
  const dropoffMarkerRef = useRef<GoogleMarker | null>(null)
  const routeLineRef = useRef<GooglePolyline | null>(null)
  const activeEndpointRef = useRef<Endpoint>('pickup')

  useEffect(() => {
    activeEndpointRef.current = activeEndpoint
  }, [activeEndpoint])

  const updateLocation = useCallback((
    endpoint: Endpoint,
    address: string,
    latitude: number,
    longitude: number
  ) => {
    const value = { address, latitude, longitude }
    if (endpoint === 'pickup') setPickup(value)
    else setDropoff(value)
    const autocomplete =
      endpoint === 'pickup'
        ? pickupAutocompleteRef.current
        : dropoffAutocompleteRef.current
    if (autocomplete) autocomplete.value = address
    setErrors((previous) => {
      const next = { ...previous }
      delete next[endpoint]
      return next
    })
  }, [])

  const reverseGeocode = useCallback((endpoint: Endpoint, latitude: number, longitude: number) => {
    const api = mapsApi()
    if (!api) return
    new api.Geocoder().geocode(
      { location: { lat: latitude, lng: longitude } },
      (results, status) => {
        const address =
          status === 'OK' && results?.[0]
            ? results[0].formatted_address
            : `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`
        updateLocation(endpoint, address, latitude, longitude)
      }
    )
  }, [updateLocation])

  useEffect(() => {
    const api = mapsApi()
    if (!mapsReady || !api || !mapElementRef.current || mapRef.current) return

    const map = new api.Map(mapElementRef.current, {
      center: LAGOS_CENTER,
      zoom: 11,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      clickableIcons: false,
    })
    mapRef.current = map
    routeLineRef.current = new api.Polyline({
      map,
      path: [],
      strokeColor: '#4f46e5',
      strokeOpacity: 0.75,
      strokeWeight: 4,
    })

    map.addListener('click', (event) => {
      if (!event.latLng) return
      reverseGeocode(
        activeEndpointRef.current,
        event.latLng.lat(),
        event.latLng.lng()
      )
    })

    const connectAutocomplete = (
      endpoint: Endpoint,
      host: HTMLDivElement | null
    ) => {
      if (!host) return
      const autocomplete = new api.places.PlaceAutocompleteElement({
        includedRegionCodes: ['ng'],
      })
      autocomplete.className = 'parcel-place-autocomplete'
      autocomplete.placeholder =
        endpoint === 'pickup' ? 'Search pickup address' : 'Search drop-off address'
      autocomplete.includedRegionCodes = ['ng']
      host.replaceChildren(autocomplete)
      if (endpoint === 'pickup') pickupAutocompleteRef.current = autocomplete
      else dropoffAutocompleteRef.current = autocomplete

      autocomplete.addEventListener('focusin', () => setActiveEndpoint(endpoint))
      autocomplete.addEventListener('input', () => {
        const next = { address: autocomplete.value, latitude: null, longitude: null }
        if (endpoint === 'pickup') setPickup(next)
        else setDropoff(next)
      })
      autocomplete.addEventListener('gmp-error', () => {
        setMapError('Google Places could not load suggestions. Check that Places API (New) is enabled for this key.')
      })
      autocomplete.addEventListener('gmp-select', async (event) => {
        const prediction = (
          event as Event & { placePrediction?: GooglePlacePrediction }
        ).placePrediction
        if (!prediction) return
        const place = prediction.toPlace()
        await place.fetchFields({
          fields: ['displayName', 'formattedAddress', 'location'],
        })
        const location = place.location
        if (!location) {
          setErrors((previous) => ({
            ...previous,
            [endpoint]: 'Select a location from the Google Maps suggestions.',
          }))
          return
        }
        updateLocation(
          endpoint,
          place.formattedAddress ?? place.displayName ?? autocomplete.value,
          location.lat(),
          location.lng()
        )
      })
    }

    connectAutocomplete('pickup', pickupInputRef.current)
    connectAutocomplete('dropoff', dropoffInputRef.current)
  }, [mapsReady, reverseGeocode, updateLocation])

  useEffect(() => {
    const api = mapsApi()
    const map = mapRef.current
    if (!mapsReady || !api || !map) return

    const syncMarker = (
      endpoint: Endpoint,
      location: LocationDraft,
      markerRef: React.MutableRefObject<GoogleMarker | null>,
      label: string,
      color: string
    ) => {
      if (location.latitude === null || location.longitude === null) return
      const position = { lat: location.latitude, lng: location.longitude }
      if (!markerRef.current) {
        markerRef.current = new api.Marker({
          map,
          position,
          draggable: true,
          label: { text: label, color: '#ffffff', fontWeight: '700' },
          title: endpoint === 'pickup' ? 'Pickup location' : 'Drop-off location',
          icon: {
            path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
            fillColor: color,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            scale: 1.45,
            anchor: new api.Point(12, 22),
            labelOrigin: new api.Point(12, 9),
          },
        })
        markerRef.current.addListener('dragend', (event) => {
          if (!event.latLng) return
          reverseGeocode(endpoint, event.latLng.lat(), event.latLng.lng())
        })
      } else {
        markerRef.current.setPosition(position)
      }
    }

    syncMarker('pickup', pickup, pickupMarkerRef, 'A', '#4f46e5')
    syncMarker('dropoff', dropoff, dropoffMarkerRef, 'B', '#e11d48')

    const positions: LatLngLiteral[] = []
    if (pickup.latitude !== null && pickup.longitude !== null) {
      positions.push({ lat: pickup.latitude, lng: pickup.longitude })
    }
    if (dropoff.latitude !== null && dropoff.longitude !== null) {
      positions.push({ lat: dropoff.latitude, lng: dropoff.longitude })
    }
    routeLineRef.current?.setPath(positions)

    if (positions.length === 2) {
      const bounds = new api.LatLngBounds()
      positions.forEach((position) => bounds.extend(position))
      map.fitBounds(bounds, 70)
    } else if (positions.length === 1) {
      map.setCenter(positions[0])
      map.setZoom(15)
    }
  }, [dropoff, mapsReady, pickup, reverseGeocode])

  function validate() {
    const nextErrors: Record<string, string> = {}
    if (!sender.name.trim()) nextErrors.senderName = 'Enter the sender’s name.'
    if (!PHONE_PATTERN.test(sender.phone.trim())) {
      nextErrors.senderPhone = 'Phone number must contain exactly 11 digits.'
    }
    if (!recipient.name.trim()) nextErrors.recipientName = 'Enter the recipient’s name.'
    if (!PHONE_PATTERN.test(recipient.phone.trim())) {
      nextErrors.recipientPhone = 'Phone number must contain exactly 11 digits.'
    }
    if (
      !pickup.address.trim() ||
      pickup.latitude === null ||
      pickup.longitude === null
    ) {
      nextErrors.pickup = 'Select a valid pickup location.'
    }
    if (
      !dropoff.address.trim() ||
      dropoff.latitude === null ||
      dropoff.longitude === null
    ) {
      nextErrors.dropoff = 'Select a valid drop-off location.'
    }
    if (!description.trim()) nextErrors.description = 'Describe the item being delivered.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!validate()) return
    if (
      pickup.latitude === null ||
      pickup.longitude === null ||
      dropoff.latitude === null ||
      dropoff.longitude === null
    ) return
    const pickupCoordinates = {
      latitude: pickup.latitude,
      longitude: pickup.longitude,
    }
    const dropoffCoordinates = {
      latitude: dropoff.latitude,
      longitude: dropoff.longitude,
    }

    setServerError('')
    startTransition(async () => {
      const result = await createAdminParcel({
        senderName: sender.name.trim(),
        senderPhone: sender.phone.trim(),
        pickup: {
          address: pickup.address.trim(),
          latitude: pickupCoordinates.latitude,
          longitude: pickupCoordinates.longitude,
        },
        dropoff: {
          address: dropoff.address.trim(),
          latitude: dropoffCoordinates.latitude,
          longitude: dropoffCoordinates.longitude,
        },
        recipientName: recipient.name.trim(),
        recipientPhone: recipient.phone.trim(),
        size,
        description: description.trim(),
      })
      if (result.error) {
        setServerError(result.error)
        toast.error(result.error)
        return
      }
      toast.success('Delivery request created successfully.')
      router.push(
        result.data?.id
          ? `/dashboard/parcels/${result.data.id}`
          : '/dashboard/parcels'
      )
    })
  }

  const locationInputClass = (endpoint: Endpoint) =>
    cn(
      'min-h-11 w-full rounded-xl border bg-slate-50 pl-8 transition-shadow focus-within:ring-2 focus-within:ring-indigo-500/20',
      errors[endpoint]
        ? 'border-red-300 bg-red-50 focus:border-red-400'
        : activeEndpoint === endpoint
          ? 'border-indigo-400 bg-white focus:border-indigo-500'
          : 'border-slate-200 bg-slate-50 focus:border-indigo-500'
    )

  return (
    <main className="px-8 py-8">
      {googleMapsApiKey && (
        <Script
          id="google-maps-admin-delivery"
          src={`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleMapsApiKey)}&libraries=places`}
          strategy="afterInteractive"
          onLoad={() => setMapsReady(true)}
          onReady={() => setMapsReady(true)}
          onError={() => setMapError('Google Maps could not be loaded. Check the API key and enabled APIs.')}
        />
      )}

      <div className="mx-auto max-w-6xl">
        <div className="mb-7 flex items-center gap-4">
          <Link
            href="/dashboard/parcels"
            aria-label="Back to deliveries"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-800"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="h-4 w-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Create delivery request</h1>
            <p className="mt-0.5 text-sm text-slate-500">
              Book a parcel delivery for a customer without an Asoose account.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(380px,0.9fr)]">
          <div className="space-y-6">
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <SectionHeading
                number="1"
                title="Contact details"
                description="Who is sending the parcel and who should receive it?"
              />
              <div className="grid gap-6 sm:grid-cols-2">
                <div className="space-y-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Sender</p>
                  <TextField
                    label="Full name"
                    placeholder="Chidi Okafor"
                    value={sender.name}
                    onChange={(event) => setSender((previous) => ({ ...previous, name: event.target.value }))}
                    error={errors.senderName}
                  />
                  <TextField
                    label="Phone number"
                    type="tel"
                    inputMode="tel"
                    maxLength={11}
                    placeholder="Enter phone number"
                    value={sender.phone}
                    onChange={(event) => setSender((previous) => ({ ...previous, phone: event.target.value }))}
                    error={errors.senderPhone}
                  />
                </div>
                <div className="space-y-4">
                  <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Recipient</p>
                  <TextField
                    label="Full name"
                    placeholder="Ada Okafor"
                    value={recipient.name}
                    onChange={(event) => setRecipient((previous) => ({ ...previous, name: event.target.value }))}
                    error={errors.recipientName}
                  />
                  <TextField
                    label="Phone number"
                    type="tel"
                    inputMode="tel"
                    maxLength={11}
                    placeholder="Enter phone number"
                    value={recipient.phone}
                    onChange={(event) => setRecipient((previous) => ({ ...previous, phone: event.target.value }))}
                    error={errors.recipientPhone}
                  />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <SectionHeading
                number="2"
                title="Delivery route"
                description="Search Google Maps or click the map to place each marker."
              />
              <div className="space-y-5">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Pickup location <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-700">A</span>
                    <div
                      ref={pickupInputRef}
                      className={locationInputClass('pickup')}
                    >
                      {!mapsReady && <span className="flex h-10 items-center px-3 text-sm text-slate-400">Loading Google Maps…</span>}
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-3">
                    <CoordinateBadge location={pickup} />
                    <button type="button" onClick={() => setActiveEndpoint('pickup')} className="shrink-0 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                      Select A on map
                    </button>
                  </div>
                  <FieldError message={errors.pickup} />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                    Drop-off location <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 flex h-5 w-5 -translate-y-1/2 items-center justify-center rounded-full bg-rose-100 text-[10px] font-bold text-rose-700">B</span>
                    <div
                      ref={dropoffInputRef}
                      className={locationInputClass('dropoff')}
                    >
                      {!mapsReady && <span className="flex h-10 items-center px-3 text-sm text-slate-400">Loading Google Maps…</span>}
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-3">
                    <CoordinateBadge location={dropoff} />
                    <button type="button" onClick={() => setActiveEndpoint('dropoff')} className="shrink-0 text-xs font-semibold text-indigo-600 hover:text-indigo-700">
                      Select B on map
                    </button>
                  </div>
                  <FieldError message={errors.dropoff} />
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <SectionHeading
                number="3"
                title="Parcel details"
                description="Add the parcel size and a short description for the rider."
              />
              <fieldset>
                <legend className="mb-2 block text-xs font-semibold text-slate-700">
                  Parcel size <span className="text-red-500">*</span>
                </legend>
                <div className="grid grid-cols-3 gap-3">
                  {(['SMALL', 'MEDIUM', 'LARGE'] as ParcelSize[]).map((option) => (
                    <button
                      key={option}
                      type="button"
                      onClick={() => setSize(option)}
                      className={cn(
                        'rounded-xl border px-3 py-3 text-left transition-colors',
                        size === option
                          ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300'
                      )}
                    >
                      <span className={cn('block text-xs font-bold', size === option ? 'text-indigo-700' : 'text-slate-700')}>
                        {option.charAt(0) + option.slice(1).toLowerCase()}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-slate-400">
                        {option === 'SMALL' ? 'Documents, small bag' : option === 'MEDIUM' ? 'Box or suitcase' : 'Large or bulky item'}
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>
              <div className="mt-5">
                <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                  Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  maxLength={500}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="e.g. Documents in a sealed envelope"
                  className={cn(
                    'w-full resize-none rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20',
                    errors.description
                      ? 'border-red-300 bg-red-50 focus:border-red-400'
                      : 'border-slate-200 bg-slate-50 focus:border-indigo-500'
                  )}
                />
                <div className="flex items-start justify-between gap-3">
                  <FieldError message={errors.description} />
                  <span className="mt-1.5 text-[11px] text-slate-400">{description.length}/500</span>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-4 lg:sticky lg:top-8">
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Route map</h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Selecting: <span className="font-semibold text-indigo-600">{activeEndpoint === 'pickup' ? 'Pickup (A)' : 'Drop-off (B)'}</span>
                  </p>
                </div>
                <div className="flex gap-1 rounded-lg bg-slate-100 p-1">
                  <button type="button" onClick={() => setActiveEndpoint('pickup')} className={cn('rounded-md px-2.5 py-1 text-xs font-semibold', activeEndpoint === 'pickup' ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500')}>
                    A
                  </button>
                  <button type="button" onClick={() => setActiveEndpoint('dropoff')} className={cn('rounded-md px-2.5 py-1 text-xs font-semibold', activeEndpoint === 'dropoff' ? 'bg-white text-rose-700 shadow-sm' : 'text-slate-500')}>
                    B
                  </button>
                </div>
              </div>
              <div className="relative h-[460px] bg-slate-100">
                <div ref={mapElementRef} className="h-full w-full" aria-label="Google map for selecting pickup and drop-off locations" />
                {!mapsReady && !mapError && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-100">
                    <div className="text-center">
                      <svg className="mx-auto h-5 w-5 animate-spin text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <p className="mt-2 text-xs text-slate-500">Loading Google Maps…</p>
                    </div>
                  </div>
                )}
                {(mapError || !googleMapsApiKey) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-100 p-8 text-center">
                    <div>
                      <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.7} stroke="currentColor" className="h-5 w-5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
                        </svg>
                      </span>
                      <p className="mt-3 text-sm font-semibold text-slate-700">Map unavailable</p>
                      <p className="mt-1 text-xs leading-5 text-slate-500">
                        {mapError || 'Set GOOGLE_MAPS_API_KEY to enable address search and map selection.'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
              <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">
                <p className="text-xs leading-5 text-slate-500">
                  Click the map to place the active marker. Drag a marker to adjust its exact position.
                </p>
              </div>
            </section>

            {serverError && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {serverError}
              </div>
            )}

            <div className="flex items-center justify-end gap-3">
              <Link href="/dashboard/parcels" className="inline-flex h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100">
                Cancel
              </Link>
              <Button type="submit" size="lg" loading={isPending} className="min-w-40">
                Create delivery
              </Button>
            </div>
          </div>
        </form>
      </div>
    </main>
  )
}
