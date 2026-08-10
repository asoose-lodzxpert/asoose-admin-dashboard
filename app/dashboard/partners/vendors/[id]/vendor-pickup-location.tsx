'use client'

import { useCallback, useEffect, useRef, useState, useTransition } from 'react'
import Script from 'next/script'
import { DetailCard } from '@/app/components/ui/detail'
import { Button } from '@/app/components/ui/button'
import { useToast } from '@/app/components/ui/toast'
import { cn } from '@/app/lib/utils'
import { updateVendorPickupAddress } from '@/app/actions/vendors'
import type { VendorPickupAddress, City } from '@/app/lib/types'

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
  setCenter(position: LatLngLiteral): void
  setZoom(zoom: number): void
}

interface GoogleMarker {
  addListener(event: string, handler: (event: { latLng?: GoogleLatLng }) => void): void
  setPosition(position: LatLngLiteral): void
  setDraggable(draggable: boolean): void
  setVisible(visible: boolean): void
}

interface GoogleAddressComponent {
  long_name: string
  short_name: string
  types: string[]
}

interface GooglePlaceAddressComponent {
  longText?: string
  shortText?: string
  types: string[]
}

interface GooglePlace {
  displayName?: string
  formattedAddress?: string
  location?: GoogleLatLng
  addressComponents?: GooglePlaceAddressComponent[]
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
  Geocoder: new () => {
    geocode(
      request: { location: LatLngLiteral },
      callback: (
        results: { formatted_address: string; address_components: GoogleAddressComponent[] }[] | null,
        status: string
      ) => void
    ): void
  }
  places: {
    PlaceAutocompleteElement: new (options?: Record<string, unknown>) => GoogleAutocomplete
  }
}

function mapsApi() {
  return (window as Window & { google?: { maps: GoogleMapsApi } }).google?.maps
}

const DEFAULT_CENTER = { lat: 6.5244, lng: 3.3792 }
const DEFAULT_COUNTRY = 'Nigeria'

interface Draft {
  street: string
  city: string
  state: string
  zipCode: string
  address: string
  latitude: number | null
  longitude: number | null
}

const EMPTY_DRAFT: Draft = {
  street: '', city: '', state: '', zipCode: '', address: '',
  latitude: null, longitude: null,
}

interface ParsedAddress {
  street: string
  zipCode: string
}

function draftFromPickupAddress(pa: VendorPickupAddress | null): Draft {
  if (!pa) return EMPTY_DRAFT
  return {
    street: pa.street ?? '',
    city: pa.city ?? '',
    state: pa.state ?? '',
    zipCode: pa.zipCode ?? '',
    address: pa.address ?? '',
    latitude: pa.latitude,
    longitude: pa.longitude,
  }
}

function componentValue(components: { name: string; types: string[] }[], type: string) {
  return components.find((c) => c.types.includes(type))?.name ?? ''
}

function parseComponents(components: { name: string; types: string[] }[]): ParsedAddress {
  const streetNumber = componentValue(components, 'street_number')
  const route = componentValue(components, 'route')
  return {
    street: [streetNumber, route].filter(Boolean).join(' ')
      || componentValue(components, 'sublocality')
      || componentValue(components, 'neighborhood'),
    zipCode: componentValue(components, 'postal_code'),
  }
}

export function VendorPickupLocation({
  vendorId,
  vendorType,
  initialPickupAddress,
  googleMapsApiKey,
  cities,
}: {
  vendorId: string
  vendorType: 'RESTAURANT' | 'STORE'
  initialPickupAddress: VendorPickupAddress | null
  googleMapsApiKey: string
  cities: City[]
}) {
  const toast = useToast()
  const [pickupAddress, setPickupAddress] = useState(initialPickupAddress)
  const [isEditing, setIsEditing] = useState(false)
  const [draft, setDraft] = useState<Draft>(draftFromPickupAddress(initialPickupAddress))
  const [selectedCityId, setSelectedCityId] = useState('')
  const [mapsReady, setMapsReady] = useState(false)
  const [mapError, setMapError] = useState('')
  const [formError, setFormError] = useState('')
  const [isPending, startTransition] = useTransition()

  const mapElementRef = useRef<HTMLDivElement>(null)
  const searchHostRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<GoogleMap | null>(null)
  const markerRef = useRef<GoogleMarker | null>(null)
  const isEditingRef = useRef(isEditing)

  useEffect(() => { isEditingRef.current = isEditing }, [isEditing])

  function d<K extends keyof Draft>(key: K, value: Draft[K]) {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const applyGeocodeResult = useCallback((
    latitude: number,
    longitude: number,
    formattedAddress: string,
    parsed: ParsedAddress
  ) => {
    setDraft((prev) => ({
      ...prev,
      latitude,
      longitude,
      address: formattedAddress,
      street: parsed.street || prev.street,
      zipCode: parsed.zipCode || prev.zipCode,
    }))
  }, [])

  const reverseGeocode = useCallback((latitude: number, longitude: number) => {
    const api = mapsApi()
    if (!api) return
    new api.Geocoder().geocode({ location: { lat: latitude, lng: longitude } }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        const normalized = results[0].address_components.map((c) => ({ name: c.long_name, types: c.types }))
        applyGeocodeResult(latitude, longitude, results[0].formatted_address, parseComponents(normalized))
      } else {
        applyGeocodeResult(latitude, longitude, `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`, { street: '', zipCode: '' })
      }
    })
  }, [applyGeocodeResult])

  function handleSelectCity(cityId: string) {
    setSelectedCityId(cityId)
    const city = cities.find((c) => c.id === cityId)
    setDraft((prev) => ({ ...prev, city: city?.name ?? '', state: city?.state ?? '' }))
  }

  useEffect(() => {
    const api = mapsApi()
    if (!mapsReady || !api || !mapElementRef.current || mapRef.current) return
    const hasCoords = pickupAddress?.latitude != null && pickupAddress?.longitude != null
    const center = hasCoords
      ? { lat: pickupAddress!.latitude as number, lng: pickupAddress!.longitude as number }
      : DEFAULT_CENTER
    const map = new api.Map(mapElementRef.current, {
      center,
      zoom: hasCoords ? 16 : 11,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      clickableIcons: false,
    })
    mapRef.current = map

    const marker = new api.Marker({ map, position: center, draggable: false, visible: hasCoords })
    marker.addListener('dragend', (event) => {
      if (!event.latLng || !isEditingRef.current) return
      reverseGeocode(event.latLng.lat(), event.latLng.lng())
    })
    markerRef.current = marker

    map.addListener('click', (event) => {
      if (!event.latLng || !isEditingRef.current) return
      reverseGeocode(event.latLng.lat(), event.latLng.lng())
    })
  }, [mapsReady, pickupAddress, reverseGeocode])

  useEffect(() => {
    const marker = markerRef.current
    const map = mapRef.current
    if (!marker || !map) return
    marker.setDraggable(isEditing)
    const lat = isEditing ? draft.latitude : pickupAddress?.latitude ?? null
    const lng = isEditing ? draft.longitude : pickupAddress?.longitude ?? null
    if (lat != null && lng != null) {
      marker.setPosition({ lat, lng })
      marker.setVisible(true)
      map.setCenter({ lat, lng })
      map.setZoom(16)
    } else {
      marker.setVisible(false)
    }
  }, [isEditing, draft.latitude, draft.longitude, pickupAddress])

  useEffect(() => {
    const api = mapsApi()
    if (!isEditing || !mapsReady || !api || !searchHostRef.current) return
    const host = searchHostRef.current
    const autocomplete = new api.places.PlaceAutocompleteElement({ includedRegionCodes: ['ng'] })
    autocomplete.placeholder = 'Search for an address'
    autocomplete.includedRegionCodes = ['ng']
    host.replaceChildren(autocomplete)

    autocomplete.addEventListener('gmp-error', () => {
      setMapError('Google Places could not load suggestions. Check that Places API (New) is enabled for this key.')
    })
    autocomplete.addEventListener('gmp-select', async (event) => {
      const prediction = (event as Event & { placePrediction?: GooglePlacePrediction }).placePrediction
      if (!prediction) return
      const place = prediction.toPlace()
      await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location', 'addressComponents'] })
      const location = place.location
      if (!location) return
      const normalized = (place.addressComponents ?? []).map((c) => ({ name: c.longText ?? c.shortText ?? '', types: c.types }))
      applyGeocodeResult(location.lat(), location.lng(), place.formattedAddress ?? place.displayName ?? '', parseComponents(normalized))
    })

    return () => { host.replaceChildren() }
  }, [isEditing, mapsReady, applyGeocodeResult])

  function handleStartEdit() {
    const nextDraft = draftFromPickupAddress(pickupAddress)
    setDraft(nextDraft)
    const matchedCity = cities.find((c) => c.name === nextDraft.city && c.state === nextDraft.state)
    setSelectedCityId(matchedCity?.id ?? '')
    setFormError('')
    setIsEditing(true)
  }

  function handleCancelEdit() {
    setIsEditing(false)
    setFormError('')
  }

  function handleSave() {
    if (draft.latitude == null || draft.longitude == null) {
      setFormError('Select a location on the map, drag the pin, or search for an address.')
      return
    }
    if (vendorType === 'RESTAURANT') {
      if (!draft.street.trim() || !draft.city.trim() || !draft.state.trim()) {
        setFormError('Fill in the street and select a city.')
        return
      }
    } else if (!draft.address.trim()) {
      setFormError('Enter an address.')
      return
    }
    setFormError('')
    startTransition(async () => {
      const payload = vendorType === 'RESTAURANT'
        ? {
            street: draft.street.trim(),
            city: draft.city.trim(),
            state: draft.state.trim(),
            country: DEFAULT_COUNTRY,
            ...(draft.zipCode.trim() ? { zipCode: draft.zipCode.trim() } : {}),
            latitude: draft.latitude as number,
            longitude: draft.longitude as number,
          }
        : {
            address: draft.address.trim(),
            latitude: draft.latitude as number,
            longitude: draft.longitude as number,
          }
      const res = await updateVendorPickupAddress(vendorId, payload)
      if (res.error) { setFormError(res.error); toast.error(res.error); return }
      if (res.pickupAddress) setPickupAddress(res.pickupAddress)
      setIsEditing(false)
      toast.success('Pickup location updated.')
    })
  }

  const summary = pickupAddress
    ? vendorType === 'RESTAURANT'
      ? [pickupAddress.street, pickupAddress.city, pickupAddress.state, pickupAddress.zipCode].filter(Boolean).join(', ')
      : pickupAddress.address
    : null

  const inputClass = 'w-full rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none'

  return (
    <DetailCard title="Pickup Location">
      {googleMapsApiKey && (
        <Script
          id="google-maps-vendor-pickup"
          src={`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(googleMapsApiKey)}&libraries=places`}
          strategy="afterInteractive"
          onLoad={() => setMapsReady(true)}
          onReady={() => setMapsReady(true)}
          onError={() => setMapError('Google Maps could not be loaded. Check the API key and enabled APIs.')}
        />
      )}

      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          {summary ? (
            <p className="text-sm text-slate-700">{summary}</p>
          ) : (
            <p className="text-sm text-slate-400 italic">No pickup location set yet.</p>
          )}
          {pickupAddress?.latitude != null && pickupAddress?.longitude != null && (
            <p className="mt-0.5 text-xs text-slate-400">
              {pickupAddress.latitude.toFixed(5)}, {pickupAddress.longitude.toFixed(5)}
            </p>
          )}
        </div>
        {!isEditing && (
          <Button variant="secondary" size="sm" onClick={handleStartEdit} className="shrink-0">
            {pickupAddress?.latitude != null ? 'Edit Location' : 'Set Location'}
          </Button>
        )}
      </div>

      {isEditing && (
        <div className="mb-4 space-y-3">
          <div ref={searchHostRef} className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-1">
            {!mapsReady && <span className="flex h-10 items-center px-3 text-sm text-slate-400">Loading Google Maps…</span>}
          </div>
          {vendorType === 'RESTAURANT' ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Street</label>
                <input value={draft.street} onChange={(e) => d('street', e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-slate-700">City</label>
                <select value={selectedCityId} onChange={(e) => handleSelectCity(e.target.value)} className={inputClass}>
                  <option value="">Select a city</option>
                  {cities.map((city) => (
                    <option key={city.id} value={city.id}>{city.name}, {city.state}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-[13px] font-medium text-slate-700">State</label>
                <input value={draft.state} readOnly disabled placeholder="Set via city"
                  className={cn(inputClass, 'cursor-not-allowed text-slate-400')} />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
                  Zip Code <span className="font-normal text-slate-400">(from map, optional)</span>
                </label>
                <input value={draft.zipCode} onChange={(e) => d('zipCode', e.target.value)} className={inputClass} />
              </div>
            </div>
          ) : (
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Address</label>
              <input value={draft.address} onChange={(e) => d('address', e.target.value)} className={inputClass} />
            </div>
          )}
          {formError && <p className="text-xs text-red-500">{formError}</p>}
        </div>
      )}

      <div className="relative h-72 overflow-hidden rounded-xl bg-slate-100">
        <div ref={mapElementRef} className="h-full w-full" aria-label="Vendor pickup location map" />
        {!mapsReady && !mapError && googleMapsApiKey && (
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
                {mapError || 'Set GOOGLE_MAPS_API_KEY to enable the pickup location map.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {isEditing && (
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className="text-xs text-slate-400">Search above, click the map, or drag the pin to set the exact pickup point.</p>
          <div className="flex shrink-0 gap-2">
            <Button variant="secondary" size="sm" onClick={handleCancelEdit}>Cancel</Button>
            <Button size="sm" loading={isPending} onClick={handleSave}>Save Location</Button>
          </div>
        </div>
      )}
    </DetailCard>
  )
}
