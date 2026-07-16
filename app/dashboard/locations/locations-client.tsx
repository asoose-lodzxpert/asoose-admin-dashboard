'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/app/components/ui/modal'
import { Button } from '@/app/components/ui/button'
import { useToast } from '@/app/components/ui/toast'
import { cn } from '@/app/lib/utils'
import { formatNaira } from '@/app/lib/utils'
import type { City, PopularRoute, CityPricing, ParcelPricing } from '@/app/lib/types'
import {
  getPopularRoutes,
  createPopularRoute,
  deletePopularRoute,
  getCityPricing,
  updateCityPricing,
  getParcelPricing,
  updateParcelPricing,
} from '@/app/actions/cities'

const INPUT_CLS =
  'w-full rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow'

type Tab = 'routes' | 'pricing' | 'parcel-pricing'

/* ─── Route form ──────────────────────────────────────── */

interface RouteForm {
  name: string
  latitude: string
  longitude: string
  maxRadiusKm: string
  maxDistanceKm: string
  fixedPrice: string
}

const EMPTY_ROUTE_FORM: RouteForm = {
  name: '', latitude: '', longitude: '', maxRadiusKm: '', maxDistanceKm: '', fixedPrice: '',
}

/* ─── Pricing form ────────────────────────────────────── */

interface PricingForm {
  baseFare: string
  perKmRate: string
  minFare: string
  maxFare: string
  serviceFeePercent: string
  serviceFeeMin: string
  serviceFeeMax: string
  vatPercent: string
  commissionPercent: string
}

function pricingToForm(p: CityPricing): PricingForm {
  return {
    baseFare: String(p.baseFare),
    perKmRate: String(p.perKmRate),
    minFare: String(p.minFare),
    maxFare: String(p.maxFare),
    serviceFeePercent: String(p.serviceFeePercent),
    serviceFeeMin: String(p.serviceFeeMin),
    serviceFeeMax: String(p.serviceFeeMax),
    vatPercent: String(p.vatPercent),
    commissionPercent: String(p.commissionPercent),
  }
}

const EMPTY_PRICING_FORM: PricingForm = {
  baseFare: '', perKmRate: '', minFare: '', maxFare: '',
  serviceFeePercent: '', serviceFeeMin: '', serviceFeeMax: '', vatPercent: '',
  commissionPercent: '',
}

/* ─── Parcel Pricing form ────────────────────────────── */

interface ParcelPricingForm {
  baseFare: string
  perKmRate: string
  minFare: string
  maxFare: string
  smallMultiplier: string
  mediumMultiplier: string
  largeMultiplier: string
  commissionPercent: string
}

function parcelPricingToForm(p: ParcelPricing): ParcelPricingForm {
  return {
    baseFare: String(p.baseFare),
    perKmRate: String(p.perKmRate),
    minFare: String(p.minFare),
    maxFare: String(p.maxFare),
    smallMultiplier: String(p.smallMultiplier),
    mediumMultiplier: String(p.mediumMultiplier),
    largeMultiplier: String(p.largeMultiplier),
    commissionPercent: String(p.commissionPercent),
  }
}

const EMPTY_PARCEL_PRICING_FORM: ParcelPricingForm = {
  baseFare: '', perKmRate: '', minFare: '', maxFare: '',
  smallMultiplier: '', mediumMultiplier: '', largeMultiplier: '',
  commissionPercent: '',
}

/* ─── Component ───────────────────────────────────────── */

export function LocationsClient({ initialCities }: { initialCities: City[] }) {
  const toast = useToast()
  const [selectedCity, setSelectedCity] = useState<City | null>(null)
  const [activeTab, setActiveTab] = useState<Tab>('routes')

  /* routes state */
  const [routes, setRoutes] = useState<PopularRoute[]>([])
  const [routesLoaded, setRoutesLoaded] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [routeForm, setRouteForm] = useState<RouteForm>(EMPTY_ROUTE_FORM)
  const [createError, setCreateError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<PopularRoute | null>(null)
  const [deleteError, setDeleteError] = useState('')

  /* pricing state */
  const [pricing, setPricing] = useState<CityPricing | null>(null)
  const [pricingLoaded, setPricingLoaded] = useState(false)
  const [pricingForm, setPricingForm] = useState<PricingForm>(EMPTY_PRICING_FORM)
  const [pricingError, setPricingError] = useState('')
  const [pricingSuccess, setPricingSuccess] = useState(false)

  /* parcel pricing state */
  const [parcelPricing, setParcelPricing] = useState<ParcelPricing | null>(null)
  const [parcelPricingLoaded, setParcelPricingLoaded] = useState(false)
  const [parcelPricingForm, setParcelPricingForm] = useState<ParcelPricingForm>(EMPTY_PARCEL_PRICING_FORM)
  const [parcelPricingError, setParcelPricingError] = useState('')
  const [parcelPricingSuccess, setParcelPricingSuccess] = useState(false)

  const [isPending, startTransition] = useTransition()

  /* ── city selection ────────────────────────────────── */

  function selectCity(city: City) {
    if (selectedCity?.id === city.id) return
    setSelectedCity(city)
    setRoutes([])
    setRoutesLoaded(false)
    setPricing(null)
    setPricingLoaded(false)
    setPricingForm(EMPTY_PRICING_FORM)
    setPricingError('')
    setPricingSuccess(false)
    setParcelPricing(null)
    setParcelPricingLoaded(false)
    setParcelPricingForm(EMPTY_PARCEL_PRICING_FORM)
    setParcelPricingError('')
    setParcelPricingSuccess(false)
    // Load the active tab's data
    loadTabData(city, activeTab)
  }

  function switchTab(tab: Tab) {
    setActiveTab(tab)
    if (!selectedCity) return
    if (tab === 'routes' && !routesLoaded) {
      startTransition(async () => {
        const data = await getPopularRoutes(selectedCity.id)
        setRoutes(data)
        setRoutesLoaded(true)
      })
    } else if (tab === 'pricing' && !pricingLoaded) {
      startTransition(async () => {
        const data = await getCityPricing(selectedCity.id)
        setPricing(data)
        setPricingForm(data ? pricingToForm(data) : EMPTY_PRICING_FORM)
        setPricingLoaded(true)
      })
    } else if (tab === 'parcel-pricing' && !parcelPricingLoaded) {
      startTransition(async () => {
        const data = await getParcelPricing(selectedCity.id)
        setParcelPricing(data)
        setParcelPricingForm(data ? parcelPricingToForm(data) : EMPTY_PARCEL_PRICING_FORM)
        setParcelPricingLoaded(true)
      })
    }
  }

  function loadTabData(city: City, tab: Tab) {
    if (tab === 'routes') {
      startTransition(async () => {
        const data = await getPopularRoutes(city.id)
        setRoutes(data)
        setRoutesLoaded(true)
      })
    } else if (tab === 'pricing') {
      startTransition(async () => {
        const data = await getCityPricing(city.id)
        setPricing(data)
        setPricingForm(data ? pricingToForm(data) : EMPTY_PRICING_FORM)
        setPricingLoaded(true)
      })
    } else if (tab === 'parcel-pricing') {
      startTransition(async () => {
        const data = await getParcelPricing(city.id)
        setParcelPricing(data)
        setParcelPricingForm(data ? parcelPricingToForm(data) : EMPTY_PARCEL_PRICING_FORM)
        setParcelPricingLoaded(true)
      })
    }
  }

  /* ── route actions ─────────────────────────────────── */

  function setRouteField(key: keyof RouteForm, val: string) {
    setRouteForm((prev) => ({ ...prev, [key]: val }))
  }

  function openCreate() {
    setRouteForm(EMPTY_ROUTE_FORM)
    setCreateError('')
    setShowCreate(true)
  }

  function handleCreate() {
    if (!selectedCity) return
    const lat = parseFloat(routeForm.latitude)
    const lng = parseFloat(routeForm.longitude)
    const radius = parseFloat(routeForm.maxRadiusKm)
    const distance = parseFloat(routeForm.maxDistanceKm)
    const price = parseFloat(routeForm.fixedPrice)

    if (!routeForm.name.trim()) { setCreateError('Name is required.'); return }
    if (isNaN(lat) || isNaN(lng)) { setCreateError('Latitude and longitude must be valid numbers.'); return }
    if (isNaN(radius) || radius <= 0) { setCreateError('Max radius must be a positive number.'); return }
    if (isNaN(distance) || distance <= 0) { setCreateError('Max distance must be a positive number.'); return }
    if (isNaN(price) || price < 0) { setCreateError('Fixed price must be a valid number.'); return }

    startTransition(async () => {
      const res = await createPopularRoute(selectedCity.id, {
        name: routeForm.name.trim(), latitude: lat, longitude: lng,
        maxRadiusKm: radius, maxDistanceKm: distance, fixedPrice: price,
      })
      if (res.error) { setCreateError(res.error); toast.error(res.error); return }
      setRoutes((prev) => [...prev, res.data as PopularRoute])
      setShowCreate(false)
      toast.success('Route added.')
    })
  }

  function handleDelete() {
    if (!deleteTarget || !selectedCity) return
    startTransition(async () => {
      const res = await deletePopularRoute(selectedCity.id, deleteTarget.id)
      if (res.error) { setDeleteError(res.error); toast.error(res.error); return }
      setRoutes((prev) => prev.filter((r) => r.id !== deleteTarget.id))
      setDeleteTarget(null)
      toast.success('Route deleted.')
    })
  }

  /* ── pricing actions ───────────────────────────────── */

  function setPricingField(key: keyof PricingForm, val: string) {
    setPricingForm((prev) => ({ ...prev, [key]: val }))
    setPricingError('')
    setPricingSuccess(false)
  }

  function parsePositive(val: string, label: string): number | string {
    const n = parseFloat(val)
    if (isNaN(n) || n < 0) return `${label} must be a valid positive number.`
    return n
  }

  function parseOptional(val: string, label: string): number | string {
    if (val.trim() === '') return 0
    return parsePositive(val, label)
  }

  function handleSavePricing() {
    if (!selectedCity) return

    const baseFare = parsePositive(pricingForm.baseFare, 'Base fare')
    const perKmRate = parsePositive(pricingForm.perKmRate, 'Per km rate')
    const minFare = parseOptional(pricingForm.minFare, 'Min fare')
    const maxFare = parseOptional(pricingForm.maxFare, 'Max fare')
    const serviceFeePercent = parseOptional(pricingForm.serviceFeePercent, 'Service fee %')
    const serviceFeeMin = parseOptional(pricingForm.serviceFeeMin, 'Service fee min')
    const serviceFeeMax = parseOptional(pricingForm.serviceFeeMax, 'Service fee max')
    const vatPercent = parseOptional(pricingForm.vatPercent, 'VAT %')
    const commissionPercent = parseOptional(pricingForm.commissionPercent, 'Commission %')

    for (const v of [baseFare, perKmRate, minFare, maxFare, serviceFeePercent, serviceFeeMin, serviceFeeMax, vatPercent, commissionPercent]) {
      if (typeof v === 'string') { setPricingError(v); return }
    }

    startTransition(async () => {
      const res = await updateCityPricing(selectedCity.id, {
        baseFare: baseFare as number,
        perKmRate: perKmRate as number,
        minFare: minFare as number,
        maxFare: maxFare as number,
        serviceFeePercent: serviceFeePercent as number,
        serviceFeeMin: serviceFeeMin as number,
        serviceFeeMax: serviceFeeMax as number,
        vatPercent: vatPercent as number,
        commissionPercent: commissionPercent as number,
      })
      if (res.error) { setPricingError(res.error); toast.error(res.error); return }
      setPricing(res.data as CityPricing)
      setPricingSuccess(true)
      toast.success('Ride pricing saved.')
    })
  }

  /* ── parcel pricing actions ─────────────────────────── */

  function setParcelPricingField(key: keyof ParcelPricingForm, val: string) {
    setParcelPricingForm((prev) => ({ ...prev, [key]: val }))
    setParcelPricingError('')
    setParcelPricingSuccess(false)
  }

  function handleSaveParcelPricing() {
    if (!selectedCity) return

    const baseFare = parsePositive(parcelPricingForm.baseFare, 'Base fare')
    const perKmRate = parsePositive(parcelPricingForm.perKmRate, 'Per km rate')
    const minFare = parseOptional(parcelPricingForm.minFare, 'Min fare')
    const maxFare = parseOptional(parcelPricingForm.maxFare, 'Max fare')
    const smallMultiplier = parseOptional(parcelPricingForm.smallMultiplier, 'Small multiplier')
    const mediumMultiplier = parseOptional(parcelPricingForm.mediumMultiplier, 'Medium multiplier')
    const largeMultiplier = parseOptional(parcelPricingForm.largeMultiplier, 'Large multiplier')
    const commissionPercent = parseOptional(parcelPricingForm.commissionPercent, 'Commission %')

    for (const v of [baseFare, perKmRate, minFare, maxFare, smallMultiplier, mediumMultiplier, largeMultiplier, commissionPercent]) {
      if (typeof v === 'string') { setParcelPricingError(v); return }
    }

    startTransition(async () => {
      const res = await updateParcelPricing(selectedCity.id, {
        baseFare: baseFare as number,
        perKmRate: perKmRate as number,
        minFare: minFare as number,
        maxFare: maxFare as number,
        smallMultiplier: smallMultiplier as number,
        mediumMultiplier: mediumMultiplier as number,
        largeMultiplier: largeMultiplier as number,
        commissionPercent: commissionPercent as number,
      })
      if (res.error) { setParcelPricingError(res.error); toast.error(res.error); return }
      setParcelPricing(res.data as ParcelPricing)
      setParcelPricingSuccess(true)
      toast.success('Parcel pricing saved.')
    })
  }

  /* ── render ────────────────────────────────────────── */

  return (
    <main className="flex h-full flex-col px-8 py-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Locations</h1>
        <p className="mt-0.5 text-sm text-slate-500">Manage popular routes, ride pricing, and parcel pricing per city.</p>
      </div>

      <div className="flex flex-1 gap-6 min-h-0">
        {/* City list */}
        <div className="w-64 shrink-0">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="border-b border-slate-100 px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">Cities</p>
            </div>
            {initialCities.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <p className="text-sm text-slate-500">No cities found.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-50">
                {initialCities.map((city) => (
                  <li key={city.id}>
                    <button
                      onClick={() => selectCity(city)}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                        selectedCity?.id === city.id ? 'bg-indigo-50' : 'hover:bg-slate-50'
                      )}
                    >
                      <span className={cn(
                        'h-2 w-2 shrink-0 rounded-full',
                        city.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                      )} />
                      <div className="min-w-0 flex-1">
                        <p className={cn(
                          'truncate text-sm font-medium',
                          selectedCity?.id === city.id ? 'text-indigo-700' : 'text-slate-900'
                        )}>
                          {city.name}
                        </p>
                        <p className="truncate text-xs text-slate-400">{city.state}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 min-w-0">
          {!selectedCity ? (
            <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white">
              <p className="text-sm text-slate-400">Select a city to manage its routes and pricing.</p>
            </div>
          ) : (
            <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              {/* Header + tabs */}
              <div className="border-b border-slate-100 px-5 pt-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-sm font-semibold text-slate-900">{selectedCity.name}</h2>
                    <p className="text-xs text-slate-400">{selectedCity.state} · {selectedCity.country}</p>
                  </div>
                  {activeTab === 'routes' && (
                    <Button size="sm" onClick={openCreate} disabled={isPending}>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                      </svg>
                      Add Route
                    </Button>
                  )}
                  {activeTab === 'pricing' && (
                    <Button size="sm" loading={isPending} onClick={handleSavePricing}>
                      Save Pricing
                    </Button>
                  )}
                  {activeTab === 'parcel-pricing' && (
                    <Button size="sm" loading={isPending} onClick={handleSaveParcelPricing}>
                      Save Parcel Pricing
                    </Button>
                  )}
                </div>
                <div className="flex gap-1">
                  {([['routes', 'Popular Routes'], ['pricing', 'Ride Pricing'], ['parcel-pricing', 'Parcel Pricing']] as [Tab, string][]).map(([tab, label]) => (
                    <button
                      key={tab}
                      onClick={() => switchTab(tab)}
                      className={cn(
                        'rounded-t-lg px-4 py-2 text-sm font-medium transition-colors border-b-2',
                        activeTab === tab
                          ? 'border-indigo-600 text-indigo-700'
                          : 'border-transparent text-slate-500 hover:text-slate-700'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-auto">
                {activeTab === 'routes' && <RoutesTab
                  routes={routes}
                  loaded={routesLoaded}
                  isPending={isPending}
                  cityName={selectedCity.name}
                  onDelete={(r) => { setDeleteError(''); setDeleteTarget(r) }}
                />}
                {activeTab === 'pricing' && <PricingTab
                  form={pricingForm}
                  loaded={pricingLoaded}
                  isPending={isPending}
                  error={pricingError}
                  success={pricingSuccess}
                  onChange={setPricingField}
                />}
                {activeTab === 'parcel-pricing' && <ParcelPricingTab
                  form={parcelPricingForm}
                  loaded={parcelPricingLoaded}
                  isPending={isPending}
                  error={parcelPricingError}
                  success={parcelPricingSuccess}
                  onChange={setParcelPricingField}
                />}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create route modal */}
      <Modal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        title="Add Popular Route"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button size="sm" loading={isPending} onClick={handleCreate}>Create</Button>
          </>
        }
      >
        {createError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{createError}</div>
        )}
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Name <span className="text-red-500">*</span></label>
            <input
              type="text"
              value={routeForm.name}
              onChange={(e) => { setRouteField('name', e.target.value); setCreateError('') }}
              placeholder="e.g. Lekki Phase 1 Zone"
              className={INPUT_CLS}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Latitude <span className="text-red-500">*</span></label>
              <input type="number" step="any" value={routeForm.latitude}
                onChange={(e) => { setRouteField('latitude', e.target.value); setCreateError('') }}
                placeholder="e.g. 6.5244" className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Longitude <span className="text-red-500">*</span></label>
              <input type="number" step="any" value={routeForm.longitude}
                onChange={(e) => { setRouteField('longitude', e.target.value); setCreateError('') }}
                placeholder="e.g. 3.3792" className={INPUT_CLS} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Max Radius (km) <span className="text-red-500">*</span></label>
              <input type="number" step="any" min="0" value={routeForm.maxRadiusKm}
                onChange={(e) => { setRouteField('maxRadiusKm', e.target.value); setCreateError('') }}
                placeholder="e.g. 2" className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Max Distance (km) <span className="text-red-500">*</span></label>
              <input type="number" step="any" min="0" value={routeForm.maxDistanceKm}
                onChange={(e) => { setRouteField('maxDistanceKm', e.target.value); setCreateError('') }}
                placeholder="e.g. 10" className={INPUT_CLS} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Fixed Price (₦) <span className="text-red-500">*</span></label>
            <input type="number" step="any" min="0" value={routeForm.fixedPrice}
              onChange={(e) => { setRouteField('fixedPrice', e.target.value); setCreateError('') }}
              placeholder="e.g. 1500" className={INPUT_CLS} />
          </div>
        </div>
      </Modal>

      {/* Delete confirm modal */}
      <Modal
        open={deleteTarget != null}
        onClose={() => setDeleteTarget(null)}
        title="Delete Route"
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" size="sm" loading={isPending} onClick={handleDelete}>Delete</Button>
          </>
        }
      >
        {deleteError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{deleteError}</div>
        )}
        <p className="text-sm text-slate-600">
          Are you sure you want to delete{' '}
          <span className="font-semibold text-slate-900">{deleteTarget?.name}</span>?
          This will remove the fixed-price zone.
        </p>
      </Modal>
    </main>
  )
}

/* ─── Routes tab ──────────────────────────────────────── */

function RoutesTab({
  routes, loaded, isPending, cityName, onDelete,
}: {
  routes: PopularRoute[]
  loaded: boolean
  isPending: boolean
  cityName: string
  onDelete: (r: PopularRoute) => void
}) {
  if (isPending && !loaded) return <Spinner />

  if (!loaded) {
    return (
      <div className="flex items-center justify-center py-16">
        <p className="text-sm text-slate-400">Loading routes…</p>
      </div>
    )
  }

  if (routes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-slate-400">
            <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-sm font-medium text-slate-700">No popular routes yet</p>
        <p className="mt-0.5 text-xs text-slate-400">Add a route to define a fixed-price zone for {cityName}.</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-slate-100 bg-slate-50/60">
          <tr>
            <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Name</th>
            <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Coordinates</th>
            <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Max Radius</th>
            <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Max Distance</th>
            <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Fixed Price</th>
            <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Status</th>
            <th className="px-5 py-3.5" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {routes.map((route) => (
            <tr key={route.id} className="hover:bg-slate-50/60 transition-colors">
              <td className="px-5 py-3.5 font-medium text-slate-900">{route.name}</td>
              <td className="px-5 py-3.5 font-mono text-xs text-slate-500">
                {route.latitude.toFixed(6)}, {route.longitude.toFixed(6)}
              </td>
              <td className="px-5 py-3.5 text-slate-500">{route.maxRadiusKm} km</td>
              <td className="px-5 py-3.5 text-slate-500">{route.maxDistanceKm} km</td>
              <td className="px-5 py-3.5 font-medium text-slate-900">{formatNaira(route.fixedPrice)}</td>
              <td className="px-5 py-3.5">
                <span className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                  route.isActive
                    ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                    : 'bg-slate-100 text-slate-600 ring-slate-500/20'
                )}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', route.isActive ? 'bg-emerald-500' : 'bg-slate-400')} />
                  {route.isActive ? 'Active' : 'Inactive'}
                </span>
              </td>
              <td className="px-5 py-3.5">
                <div className="flex justify-end">
                  <button
                    onClick={() => onDelete(route)}
                    disabled={isPending}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50"
                    title="Delete"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                      <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/* ─── Pricing tab ─────────────────────────────────────── */

const PRICING_FIELDS: { key: keyof PricingForm; label: string; suffix: string; placeholder: string; required?: boolean }[] = [
  { key: 'baseFare',          label: 'Base Fare',         suffix: '₦',  placeholder: 'e.g. 500', required: true },
  { key: 'perKmRate',         label: 'Per Km Rate',       suffix: '₦',  placeholder: 'e.g. 150', required: true },
  { key: 'minFare',           label: 'Min Fare',          suffix: '₦',  placeholder: 'e.g. 800' },
  { key: 'maxFare',           label: 'Max Fare',          suffix: '₦',  placeholder: 'e.g. 50000' },
  { key: 'serviceFeePercent', label: 'Service Fee',       suffix: '%',  placeholder: 'e.g. 5' },
  { key: 'serviceFeeMin',     label: 'Service Fee Min',   suffix: '₦',  placeholder: 'e.g. 100' },
  { key: 'serviceFeeMax',     label: 'Service Fee Max',   suffix: '₦',  placeholder: 'e.g. 2000' },
  { key: 'vatPercent',        label: 'VAT',               suffix: '%',  placeholder: 'e.g. 7.5' },
  { key: 'commissionPercent', label: 'Commission',        suffix: '%',  placeholder: 'e.g. 15' },
]

function PricingTab({
  form, loaded, isPending, error, success, onChange,
}: {
  form: PricingForm
  loaded: boolean
  isPending: boolean
  error: string
  success: boolean
  onChange: (key: keyof PricingForm, val: string) => void
}) {
  if (isPending && !loaded) return <Spinner />

  return (
    <div className="px-6 py-6">
      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}
      {success && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Pricing saved successfully.
        </div>
      )}
      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        {PRICING_FIELDS.map(({ key, label, suffix, placeholder, required }) => (
          <div key={key}>
            <label className="mb-1.5 flex items-center gap-1 text-[13px] font-medium text-slate-700">
              {label} {required && <span className="text-red-500">*</span>}
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">{suffix}</span>
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={form[key]}
              onChange={(e) => onChange(key, e.target.value)}
              placeholder={placeholder}
              className={
                'w-full rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow'
              }
              disabled={isPending}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Parcel Pricing tab ─────────────────────────────── */

const PARCEL_PRICING_FIELDS: { key: keyof ParcelPricingForm; label: string; suffix: string; placeholder: string; required?: boolean }[] = [
  { key: 'baseFare',          label: 'Base Fare',           suffix: '₦', placeholder: 'e.g. 500', required: true },
  { key: 'perKmRate',         label: 'Per Km Rate',         suffix: '₦', placeholder: 'e.g. 100', required: true },
  { key: 'minFare',           label: 'Min Fare',            suffix: '₦', placeholder: 'e.g. 800' },
  { key: 'maxFare',           label: 'Max Fare',            suffix: '₦', placeholder: 'e.g. 5000' },
  { key: 'smallMultiplier',   label: 'Small Multiplier',    suffix: 'x', placeholder: 'e.g. 1.0' },
  { key: 'mediumMultiplier',  label: 'Medium Multiplier',   suffix: 'x', placeholder: 'e.g. 1.3' },
  { key: 'largeMultiplier',   label: 'Large Multiplier',    suffix: 'x', placeholder: 'e.g. 1.8' },
  { key: 'commissionPercent', label: 'Commission',          suffix: '%', placeholder: 'e.g. 15' },
]

function ParcelPricingTab({
  form, loaded, isPending, error, success, onChange,
}: {
  form: ParcelPricingForm
  loaded: boolean
  isPending: boolean
  error: string
  success: boolean
  onChange: (key: keyof ParcelPricingForm, val: string) => void
}) {
  if (isPending && !loaded) return <Spinner />

  return (
    <div className="px-6 py-6">
      {error && (
        <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>
      )}
      {success && (
        <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          Parcel pricing saved successfully.
        </div>
      )}
      <div className="grid grid-cols-2 gap-x-6 gap-y-5">
        {PARCEL_PRICING_FIELDS.map(({ key, label, suffix, placeholder, required }) => (
          <div key={key}>
            <label className="mb-1.5 flex items-center gap-1 text-[13px] font-medium text-slate-700">
              {label} {required && <span className="text-red-500">*</span>}
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">{suffix}</span>
            </label>
            <input
              type="number"
              step="any"
              min="0"
              value={form[key]}
              onChange={(e) => onChange(key, e.target.value)}
              placeholder={placeholder}
              className={
                'w-full rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow'
              }
              disabled={isPending}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

/* ─── Shared ──────────────────────────────────────────── */

function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <svg className="h-5 w-5 animate-spin text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  )
}
