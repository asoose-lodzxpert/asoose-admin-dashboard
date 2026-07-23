'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Modal } from '@/app/components/ui/modal'
import { Button } from '@/app/components/ui/button'
import { ActivityTimeline } from '@/app/components/ui/activity-timeline'
import { DocCard } from '@/app/components/ui/doc-card'
import { DetailCard, InfoRow, InfoGrid } from '@/app/components/ui/detail'
import { useToast } from '@/app/components/ui/toast'
import { cn } from '@/app/lib/utils'
import { formatNaira } from '@/app/lib/utils'
import { assignRiderToParcel } from '@/app/actions/parcels'
import { getRiders } from '@/app/actions/riders'
import type { TimelineResult } from '@/app/actions/timeline'
import type { ParcelDetail, ParcelStatus, RiderSummary } from '@/app/lib/types'

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY

const TERMINAL: ParcelStatus[] = [
  'DELIVERED', 'CANCELLED_BY_USER', 'CANCELLED_BY_RIDER', 'CANCELLED_BY_SYSTEM',
]

const STATUS_STYLES: Record<ParcelStatus, string> = {
  PENDING:              'bg-amber-50 text-amber-700 ring-amber-600/20',
  SEARCHING_RIDER:      'bg-amber-50 text-amber-700 ring-amber-600/20',
  RIDER_ASSIGNED:       'bg-sky-50 text-sky-700 ring-sky-600/20',
  RIDER_ACCEPTED:       'bg-sky-50 text-sky-700 ring-sky-600/20',
  PICKED_UP:            'bg-blue-50 text-blue-700 ring-blue-600/20',
  IN_TRANSIT:           'bg-blue-50 text-blue-700 ring-blue-600/20',
  DELIVERED:            'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  CANCELLED_BY_USER:    'bg-red-50 text-red-700 ring-red-600/20',
  CANCELLED_BY_RIDER:   'bg-red-50 text-red-700 ring-red-600/20',
  CANCELLED_BY_SYSTEM:  'bg-red-50 text-red-700 ring-red-600/20',
}

function formatStatus(s: string) {
  return s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDateTime(d: string | null) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-NG', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

/* ─── Route map card ──────────────────────────────────── */

function RouteMap({ parcel }: { parcel: ParcelDetail }) {
  const { pickupAddress: pickup, dropoffAddress: dropoff } = parcel
  const mapsDirectionsUrl = `https://www.google.com/maps/dir/${pickup.latitude},${pickup.longitude}/${dropoff.latitude},${dropoff.longitude}`

  return (
    <DetailCard title="Route Map">
      <div className="overflow-hidden rounded-xl border border-slate-100">
        {MAPS_KEY ? (
          <iframe
            src={`https://www.google.com/maps/embed/v1/directions?key=${MAPS_KEY}&origin=${pickup.latitude},${pickup.longitude}&destination=${dropoff.latitude},${dropoff.longitude}&mode=driving`}
            className="h-72 w-full"
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        ) : (
          <div className="flex h-52 flex-col items-center justify-center gap-4 bg-slate-50">
            <div className="flex flex-col items-center gap-2 text-center">
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">A</span>
                <p className="text-sm font-medium text-slate-700">{pickup.address || pickup.street}</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-slate-300">
                <path fillRule="evenodd" d="M10 3a.75.75 0 0 1 .75.75v10.638l3.96-4.158a.75.75 0 1 1 1.08 1.04l-5.25 5.5a.75.75 0 0 1-1.08 0l-5.25-5.5a.75.75 0 1 1 1.08-1.04l3.96 4.158V3.75A.75.75 0 0 1 10 3Z" clipRule="evenodd" />
              </svg>
              <div className="flex items-center gap-2">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-100 text-xs font-bold text-red-600">B</span>
                <p className="text-sm font-medium text-slate-700">{dropoff.address || dropoff.street}</p>
              </div>
            </div>
            <a
              href={mapsDirectionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path fillRule="evenodd" d="M9.69 18.933l.003.001C9.89 19.02 10 19 10 19s.11.02.308-.066l.002-.001.006-.003.018-.008a5.741 5.741 0 0 0 .281-.14c.186-.096.446-.24.757-.433.62-.384 1.445-.966 2.274-1.765C15.302 14.988 17 12.493 17 9A7 7 0 1 0 3 9c0 3.492 1.698 5.988 3.355 7.584a13.731 13.731 0 0 0 2.273 1.765 11.842 11.842 0 0 0 .976.544l.062.029.018.008.006.003ZM10 11.25a2.25 2.25 0 1 0 0-4.5 2.25 2.25 0 0 0 0 4.5Z" clipRule="evenodd" />
              </svg>
              Open in Google Maps
            </a>
          </div>
        )}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div className="rounded-xl bg-indigo-50 px-4 py-3">
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-indigo-600">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-indigo-200 text-[8px] font-bold">A</span>
            Pickup
          </p>
          <p className="text-sm font-medium text-slate-800">{pickup.address || pickup.street}</p>
          <p className="text-xs text-slate-500">{pickup.city}, {pickup.state}</p>
          <p className="mt-1 font-mono text-[10px] text-slate-400">{pickup.latitude.toFixed(6)}, {pickup.longitude.toFixed(6)}</p>
        </div>
        <div className="rounded-xl bg-red-50 px-4 py-3">
          <p className="mb-1 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wide text-red-600">
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-red-200 text-[8px] font-bold">B</span>
            Dropoff
          </p>
          <p className="text-sm font-medium text-slate-800">{dropoff.address || dropoff.street}</p>
          <p className="text-xs text-slate-500">{dropoff.city}, {dropoff.state}</p>
          <p className="mt-1 font-mono text-[10px] text-slate-400">{dropoff.latitude.toFixed(6)}, {dropoff.longitude.toFixed(6)}</p>
        </div>
      </div>
    </DetailCard>
  )
}

/* ─── Main component ──────────────────────────────────── */

export function ParcelDetailClient({
  parcel: initialParcel,
  timeline,
}: {
  parcel: ParcelDetail
  timeline: TimelineResult
}) {
  const toast = useToast()
  const router = useRouter()
  const [parcel, setParcel] = useState(initialParcel)
  const [isPending, startTransition] = useTransition()

  const isTerminal = TERMINAL.includes(parcel.status)
  const canAssign = !isTerminal && parcel.paymentStatus !== 'PENDING'

  /* assign rider modal */
  const [showAssign, setShowAssign] = useState(false)
  const [riders, setRiders] = useState<RiderSummary[]>([])
  const [ridersLoaded, setRidersLoaded] = useState(false)
  const [selectedRiderId, setSelectedRiderId] = useState('')
  const [assignError, setAssignError] = useState('')

  function openAssign() {
    setSelectedRiderId('')
    setAssignError('')
    setShowAssign(true)
    if (!ridersLoaded) {
      startTransition(async () => {
        const res = await getRiders({ status: 'ONLINE', limit: 50 })
        setRiders(res.riders)
        setRidersLoaded(true)
      })
    }
  }

  function handleAssign() {
    if (!selectedRiderId) { setAssignError('Select a rider.'); return }
    startTransition(async () => {
      const res = await assignRiderToParcel(parcel.id, selectedRiderId)
      if (res.error) { setAssignError(res.error); toast.error(res.error); return }
      const assigned = riders.find((r) => r.id === selectedRiderId)
      if (assigned) {
        setParcel((prev) => ({
          ...prev,
          status: 'RIDER_ASSIGNED' as ParcelStatus,
          riderId: assigned.id,
          rider: {
            name: assigned.fullName,
            phone: assigned.phone,
            vehicleType: assigned.vehicleType,
            rating: assigned.rating,
          },
        }))
      }
      setShowAssign(false)
      toast.success('Rider assigned.')
      router.refresh()
    })
  }

  return (
    <>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-8">
          <Link
            href="/dashboard/parcels"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
            </svg>
            Parcels
          </Link>
          <span className="text-slate-300">/</span>
          <span className="font-mono text-sm font-medium text-slate-900 truncate">{parcel.trackingId}</span>
          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', STATUS_STYLES[parcel.status])}>
            {formatStatus(parcel.status)}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {canAssign && (
              <Button size="sm" onClick={openAssign} disabled={isPending}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path d="M12 18.75a6 6 0 0 0 6-6v-1.5m-6 7.5a6 6 0 0 1-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 0 1-3-3V4.5a3 3 0 1 1 6 0v8.25a3 3 0 0 1-3 3Z" />
                </svg>
                {parcel.rider ? 'Reassign Rider' : 'Assign Rider'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="mx-auto max-w-7xl px-8 py-8">
        <div className="grid grid-cols-3 gap-6">
          {/* Left col */}
          <div className="col-span-2 space-y-6">
            <RouteMap parcel={parcel} />

            {/* Parcel Details */}
            <DetailCard title="Parcel Details">
              <InfoGrid>
                <InfoRow label="Distance" value={`${parcel.distance.toFixed(2)} km`} />
                <InfoRow label="Duration" value={parcel.duration ? `${parcel.duration} min` : null} />
                <InfoRow label="Size" value={parcel.size} />
                <InfoRow label="Size Multiplier" value={`${parcel.sizeMultiplier}x`} />
                <InfoRow label="Matching Attempts" value={parcel.matchingAttempts} />
                <InfoRow label="Description" value={parcel.description} wide />
                <InfoRow label="Customer ID" value={parcel.customerId} />
                <InfoRow label="Rider ID" value={parcel.riderId} />
              </InfoGrid>
            </DetailCard>

            <ActivityTimeline
              events={timeline.events}
              error={timeline.error}
              entityLabel="Parcel"
            />
          </div>

          {/* Right col */}
          <div className="space-y-6">
            {/* Fare & Payment */}
            <DetailCard title="Fare & Payment">
              <div className="mb-4 text-center">
                <p className="text-3xl font-bold text-slate-900">{formatNaira(parcel.fare)}</p>
                <p className="mt-0.5 text-xs text-slate-400">{parcel.distance.toFixed(2)} km delivery</p>
              </div>
              <InfoGrid>
                <InfoRow label="Earning" value={formatNaira(parcel.earning)} />
                <InfoRow label="Payment Method" value={parcel.paymentMethod} />
                <InfoRow label="Payment Status" value={parcel.paymentStatus} />
              </InfoGrid>
            </DetailCard>

            {/* Recipient */}
            <DetailCard title="Recipient">
              <InfoGrid>
                <InfoRow label="Name" value={parcel.recipientName} />
                <InfoRow label="Phone" value={parcel.recipientPhone} />
              </InfoGrid>
            </DetailCard>

            {/* Customer */}
            <DetailCard title="Customer">
              <InfoGrid>
                <InfoRow label="Name" value={parcel.customer.name} />
                <InfoRow label="Phone" value={parcel.customer.phone} />
                <InfoRow label="Email" value={parcel.customer.email} />
              </InfoGrid>
            </DetailCard>

            {/* Assigned Rider */}
            {parcel.rider && (
              <DetailCard title="Assigned Rider">
                <InfoGrid>
                  <InfoRow label="Name" value={parcel.rider.name} />
                  <InfoRow label="Phone" value={parcel.rider.phone} />
                  <InfoRow label="Vehicle Type" value={parcel.rider.vehicleType} />
                  <InfoRow label="Rating" value={parcel.rider.rating} />
                </InfoGrid>
              </DetailCard>
            )}

            {/* Proof of Delivery */}
            {parcel.proofOfDelivery && (
              <DetailCard title="Proof of Delivery">
                <div className="max-w-[160px]">
                  <DocCard label="Proof of Delivery" url={parcel.proofOfDelivery} />
                </div>
              </DetailCard>
            )}

            {/* Cancellation */}
            {(parcel.cancelledAt || parcel.cancelReason) && (
              <DetailCard title="Cancellation">
                <InfoGrid>
                  <InfoRow label="Cancelled At" value={formatDateTime(parcel.cancelledAt)} wide />
                  <InfoRow label="Reason" value={parcel.cancelReason} wide />
                </InfoGrid>
              </DetailCard>
            )}
          </div>
        </div>
      </div>

      {/* Assign Rider modal */}
      <Modal
        open={showAssign}
        onClose={() => setShowAssign(false)}
        title="Assign Rider"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowAssign(false)}>Cancel</Button>
            <Button size="sm" loading={isPending} onClick={handleAssign}>Assign</Button>
          </>
        }
      >
        {assignError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{assignError}</div>
        )}
        {!ridersLoaded && isPending ? (
          <div className="flex items-center justify-center py-8">
            <svg className="h-5 w-5 animate-spin text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : riders.length === 0 && ridersLoaded ? (
          <p className="py-6 text-center text-sm text-slate-500">No ONLINE riders available at the moment.</p>
        ) : (
          <div className="max-h-72 overflow-y-auto space-y-1">
            {riders.map((r) => (
              <button
                key={r.id}
                onClick={() => { setSelectedRiderId(r.id); setAssignError('') }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ring-1 ring-inset',
                  selectedRiderId === r.id
                    ? 'bg-indigo-50 ring-indigo-300'
                    : 'bg-white ring-slate-200 hover:bg-slate-50'
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                  {r.fullName[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{r.fullName}</p>
                  <p className="text-xs text-slate-400">{r.vehicleType} · {r.phone}</p>
                </div>
                {selectedRiderId === r.id && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-indigo-600">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </Modal>
    </>
  )
}
