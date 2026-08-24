'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Script from 'next/script'

interface LatLngLiteral { lat: number; lng: number }
interface GoogleLatLng { lat(): number; lng(): number }
interface GoogleMap {
  addListener(event: string, handler: (event: { latLng?: GoogleLatLng }) => void): void
  setCenter(position: LatLngLiteral): void
  setZoom(zoom: number): void
}
interface GoogleMarker {
  addListener(event: string, handler: (event: { latLng?: GoogleLatLng }) => void): void
  setPosition(position: LatLngLiteral): void
  setVisible(visible: boolean): void
}
interface AddressComponent {
  long_name: string
  short_name: string
  types: string[]
}
interface PlaceAddressComponent {
  longText?: string
  shortText?: string
  types: string[]
}
interface GooglePlace {
  displayName?: string
  formattedAddress?: string
  location?: GoogleLatLng
  addressComponents?: PlaceAddressComponent[]
  fetchFields(options: { fields: string[] }): Promise<void>
}
interface GooglePlacePrediction { toPlace(): GooglePlace }
interface GoogleAutocomplete extends HTMLElement {
  includedRegionCodes: string[]
  placeholder: string
}
interface GoogleMapsApi {
  Map: new (element: HTMLElement, options: Record<string, unknown>) => GoogleMap
  Marker: new (options: Record<string, unknown>) => GoogleMarker
  Geocoder: new () => {
    geocode(
      request: { location: LatLngLiteral },
      callback: (results: { formatted_address: string; address_components: AddressComponent[] }[] | null, status: string) => void
    ): void
  }
  places: { PlaceAutocompleteElement: new (options?: Record<string, unknown>) => GoogleAutocomplete }
}

export interface SelectedPropertyOwnerLocation {
  address: string
  street: string
  city: string
  state: string
  latitude: number
  longitude: number
}

const NIGERIA_CENTER = { lat: 9.082, lng: 8.6753 }

function mapsApi() {
  return (window as Window & { google?: { maps: GoogleMapsApi } }).google?.maps
}

function valueFor(components: { name: string; types: string[] }[], type: string) {
  return components.find((component) => component.types.includes(type))?.name ?? ''
}

function locationFromComponents(
  address: string,
  components: { name: string; types: string[] }[],
  latitude: number,
  longitude: number
): SelectedPropertyOwnerLocation {
  const streetNumber = valueFor(components, 'street_number')
  const route = valueFor(components, 'route')
  return {
    address,
    street: [streetNumber, route].filter(Boolean).join(' ')
      || valueFor(components, 'sublocality')
      || valueFor(components, 'neighborhood'),
    city: valueFor(components, 'locality')
      || valueFor(components, 'administrative_area_level_2'),
    state: valueFor(components, 'administrative_area_level_1'),
    latitude,
    longitude,
  }
}

export function GoogleLocationPicker({
  apiKey,
  latitude,
  longitude,
  onSelect,
  error,
}: {
  apiKey: string
  latitude: number | null
  longitude: number | null
  onSelect: (location: SelectedPropertyOwnerLocation) => void
  error?: string
}) {
  const [mapsReady, setMapsReady] = useState(false)
  const [mapError, setMapError] = useState('')
  const mapElementRef = useRef<HTMLDivElement>(null)
  const searchHostRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<GoogleMap | null>(null)
  const markerRef = useRef<GoogleMarker | null>(null)

  const reverseGeocode = useCallback((lat: number, lng: number) => {
    const api = mapsApi()
    if (!api) return
    new api.Geocoder().geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK' && results?.[0]) {
        const components = results[0].address_components.map((component) => ({
          name: component.long_name,
          types: component.types,
        }))
        onSelect(locationFromComponents(results[0].formatted_address, components, lat, lng))
      } else {
        onSelect({
          address: `${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          street: '',
          city: '',
          state: '',
          latitude: lat,
          longitude: lng,
        })
      }
    })
  }, [onSelect])

  useEffect(() => {
    const api = mapsApi()
    if (!mapsReady || !api || !mapElementRef.current || mapRef.current) return
    const hasCoordinates = latitude != null && longitude != null
    const center = hasCoordinates ? { lat: latitude, lng: longitude } : NIGERIA_CENTER
    const map = new api.Map(mapElementRef.current, {
      center,
      zoom: hasCoordinates ? 16 : 6,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      clickableIcons: false,
    })
    mapRef.current = map
    const marker = new api.Marker({ map, position: center, draggable: true, visible: hasCoordinates })
    marker.addListener('dragend', (event) => {
      if (event.latLng) reverseGeocode(event.latLng.lat(), event.latLng.lng())
    })
    markerRef.current = marker
    map.addListener('click', (event) => {
      if (event.latLng) reverseGeocode(event.latLng.lat(), event.latLng.lng())
    })
  }, [latitude, longitude, mapsReady, reverseGeocode])

  useEffect(() => {
    const api = mapsApi()
    const host = searchHostRef.current
    if (!mapsReady || !api || !host) return
    const autocomplete = new api.places.PlaceAutocompleteElement({ includedRegionCodes: ['ng'] })
    autocomplete.placeholder = 'Search for an address in Nigeria'
    autocomplete.includedRegionCodes = ['ng']
    host.replaceChildren(autocomplete)
    autocomplete.addEventListener('gmp-error', () => {
      setMapError('Google Places could not load suggestions. Check that Places API (New) is enabled.')
    })
    autocomplete.addEventListener('gmp-select', async (event) => {
      const prediction = (event as Event & { placePrediction?: GooglePlacePrediction }).placePrediction
      if (!prediction) return
      const place = prediction.toPlace()
      await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location', 'addressComponents'] })
      if (!place.location) return
      const components = (place.addressComponents ?? []).map((component) => ({
        name: component.longText ?? component.shortText ?? '',
        types: component.types,
      }))
      onSelect(locationFromComponents(
        place.formattedAddress ?? place.displayName ?? '',
        components,
        place.location.lat(),
        place.location.lng()
      ))
    })
    return () => { host.replaceChildren() }
  }, [mapsReady, onSelect])

  useEffect(() => {
    const marker = markerRef.current
    const map = mapRef.current
    if (!marker || !map || latitude == null || longitude == null) return
    const position = { lat: latitude, lng: longitude }
    marker.setPosition(position)
    marker.setVisible(true)
    map.setCenter(position)
    map.setZoom(16)
  }, [latitude, longitude])

  return (
    <div className="space-y-3">
      {apiKey && (
        <Script
          id="google-maps-property-owner"
          src={`https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(apiKey)}&libraries=places`}
          strategy="afterInteractive"
          onLoad={() => setMapsReady(true)}
          onReady={() => setMapsReady(true)}
          onError={() => setMapError('Google Maps could not be loaded. Check the API key and enabled APIs.')}
        />
      )}
      <div ref={searchHostRef} className="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-1">
        {!mapsReady && <span className="flex h-10 items-center px-3 text-sm text-slate-400">Loading Google Maps…</span>}
      </div>
      <div ref={mapElementRef} className="h-64 overflow-hidden rounded-xl border border-slate-200 bg-slate-100" />
      {latitude != null && longitude != null && (
        <p className="text-xs font-medium text-emerald-600">
          Location selected · {latitude.toFixed(5)}, {longitude.toFixed(5)}
        </p>
      )}
      {(error || mapError || !apiKey) && (
        <p className="text-xs text-red-600">
          {error || mapError || 'Google Maps is not configured.'}
        </p>
      )}
    </div>
  )
}
