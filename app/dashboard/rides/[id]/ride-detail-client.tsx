'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Modal } from '@/app/components/ui/modal'
import { Button } from '@/app/components/ui/button'
import { DetailCard, InfoRow, InfoGrid, formatDate } from '@/app/components/ui/detail'
import { cn } from '@/app/lib/utils'
import { formatNaira } from '@/app/lib/utils'
import { assignDriverToRide, requeueRide, forceCancelRide } from '@/app/actions/rides'
import { getDrivers } from '@/app/actions/drivers'
import type { RideDetail, RideStatus, RideRider, DriverSummary } from '@/app/lib/types'

const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY

const TERMINAL: RideStatus[] = [
  'COMPLETED', 'CANCELLED', 'CANCELLED_BY_USER',
  'CANCELLED_BY_DRIVER', 'CANCELLED_BY_SYSTEM', 'CANCELLED_SCHEDULED',
]

const STATUS_STYLES: Record<RideStatus, string> = {
  REQUESTED:             'bg-amber-50 text-amber-700 ring-amber-600/20',
  SEARCHING_DRIVER:      'bg-amber-50 text-amber-700 ring-amber-600/20',
  DRIVER_ASSIGNED:       'bg-sky-50 text-sky-700 ring-sky-600/20',
  DRIVER_ACCEPTED:       'bg-sky-50 text-sky-700 ring-sky-600/20',
  PAID:                  'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  IN_PROGRESS:           'bg-blue-50 text-blue-700 ring-blue-600/20',
  COMPLETED:             'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  SCHEDULED:             'bg-violet-50 text-violet-700 ring-violet-600/20',
  DRIVER_ASSIGNED_SCHED: 'bg-violet-50 text-violet-700 ring-violet-600/20',
  CANCELLED_BY_USER:     'bg-red-50 text-red-700 ring-red-600/20',
  CANCELLED_BY_DRIVER:   'bg-red-50 text-red-700 ring-red-600/20',
  CANCELLED_BY_SYSTEM:   'bg-red-50 text-red-700 ring-red-600/20',
  CANCELLED_SCHEDULED:   'bg-orange-50 text-orange-700 ring-orange-600/20',
  PENDING:               'bg-amber-50 text-amber-700 ring-amber-600/20',
  ACCEPTED:              'bg-sky-50 text-sky-700 ring-sky-600/20',
  ARRIVED:               'bg-blue-50 text-blue-700 ring-blue-600/20',
  CANCELLED:             'bg-red-50 text-red-700 ring-red-600/20',
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

function RouteMap({ ride }: { ride: RideDetail }) {
  const { pickupAddress: pickup, dropoffAddress: dropoff } = ride
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
            {/* Pickup / dropoff inline preview */}
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
      {/* Address strip below map */}
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

export function RideDetailClient({ ride: initialRide }: { ride: RideDetail }) {
  const [ride, setRide] = useState(initialRide)
  const [isPending, startTransition] = useTransition()

  const isTerminal = TERMINAL.includes(ride.status)
  const canAssign = !isTerminal && !ride.rider && ride.paymentStatus !== 'PENDING'
  const canRequeue = !isTerminal && !ride.rider && ride.paymentStatus !== 'PENDING'
  const canCancel = !isTerminal

  /* assign driver modal */
  const [showAssign, setShowAssign] = useState(false)
  const [drivers, setDrivers] = useState<DriverSummary[]>([])
  const [driversLoaded, setDriversLoaded] = useState(false)
  const [selectedDriverId, setSelectedDriverId] = useState('')
  const [assignError, setAssignError] = useState('')

  /* requeue confirm modal */
  const [showRequeue, setShowRequeue] = useState(false)
  const [requeueError, setRequeueError] = useState('')
  const [requeueSuccess, setRequeueSuccess] = useState(false)

  /* force cancel modal */
  const [showCancel, setShowCancel] = useState(false)
  const [cancelReason, setCancelReason] = useState('')
  const [cancelError, setCancelError] = useState('')

  function openAssign() {
    setSelectedDriverId('')
    setAssignError('')
    setShowAssign(true)
    if (!driversLoaded) {
      startTransition(async () => {
        const res = await getDrivers({ status: 'ONLINE', limit: 50 })
        setDrivers(res.drivers)
        setDriversLoaded(true)
      })
    }
  }

  function handleAssign() {
    if (!selectedDriverId) { setAssignError('Select a driver.'); return }
    startTransition(async () => {
      const res = await assignDriverToRide(ride.id, selectedDriverId)
      if (res.error) { setAssignError(res.error); return }
      const assigned = drivers.find((d) => d.id === selectedDriverId)
      if (assigned) {
        setRide((prev) => ({
          ...prev,
          status: 'DRIVER_ASSIGNED' as RideStatus,
          driverId: assigned.id,
          rider: {
            name: assigned.fullName,
            phone: assigned.phone,
            vehicleType: assigned.vehicleType,
            rating: assigned.rating,
          } satisfies RideRider,
        }))
      }
      setShowAssign(false)
    })
  }

  function handleRequeue() {
    startTransition(async () => {
      const res = await requeueRide(ride.id)
      if (res.error) { setRequeueError(res.error); return }
      setRequeueSuccess(true)
      setRide((prev) => ({ ...prev, status: 'SEARCHING_DRIVER' }))
    })
  }

  function handleForceCancel() {
    if (!cancelReason.trim()) { setCancelError('A reason is required.'); return }
    startTransition(async () => {
      const res = await forceCancelRide(ride.id, cancelReason.trim())
      if (res.error) { setCancelError(res.error); return }
      setRide((prev) => ({ ...prev, status: 'CANCELLED', cancelReason: cancelReason.trim() }))
      setShowCancel(false)
    })
  }

  const INPUT_CLS = 'w-full rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow'

  return (
    <>
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-8">
          <Link
            href="/dashboard/rides"
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors shrink-0"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
            </svg>
            Rides
          </Link>
          <span className="text-slate-300">/</span>
          <span className="font-mono text-sm font-medium text-slate-900 truncate">{ride.trackingId}</span>
          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', STATUS_STYLES[ride.status])}>
            {formatStatus(ride.status)}
          </span>
          <div className="ml-auto flex items-center gap-2">
            {canAssign && (
              <Button size="sm" onClick={openAssign} disabled={isPending}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path d="M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12" />
                </svg>
                Assign Driver
              </Button>
            )}
            {canRequeue && (
              <Button variant="secondary" size="sm" onClick={() => { setRequeueError(''); setRequeueSuccess(false); setShowRequeue(true) }} disabled={isPending}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                  <path fillRule="evenodd" d="M15.312 11.424a5.5 5.5 0 0 1-9.201 2.466l-.312-.311h2.433a.75.75 0 0 0 0-1.5H3.989a.75.75 0 0 0-.75.75v4.242a.75.75 0 0 0 1.5 0v-2.43l.31.31a7 7 0 0 0 11.712-3.138.75.75 0 0 0-1.449-.39Zm1.23-3.723a.75.75 0 0 0 .219-.53V2.929a.75.75 0 0 0-1.5 0V5.36l-.31-.31A7 7 0 0 0 3.239 8.188a.75.75 0 1 0 1.448.389A5.5 5.5 0 0 1 13.89 6.11l.311.31h-2.432a.75.75 0 0 0 0 1.5h4.243a.75.75 0 0 0 .53-.219Z" clipRule="evenodd" />
                </svg>
                Requeue
              </Button>
            )}
            {canCancel && (
              <Button variant="danger" size="sm" onClick={() => { setCancelReason(''); setCancelError(''); setShowCancel(true) }} disabled={isPending}>
                Force Cancel
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
            <RouteMap ride={ride} />

            {/* Ride Details */}
            <DetailCard title="Ride Details">
              <InfoGrid>
                <InfoRow label="Distance" value={`${ride.distance.toFixed(2)} km`} />
                <InfoRow label="Duration" value={ride.duration ? `${ride.duration} min` : null} />
                <InfoRow label="Vehicle Type" value={ride.vehicleType} />
                <InfoRow label="Matching Attempts" value={ride.matchingAttempts} />
                <InfoRow label="Driver ID" value={ride.driverId} />
                <InfoRow label="Customer ID" value={ride.customerId} />
              </InfoGrid>
            </DetailCard>

            {/* Timeline */}
            <DetailCard title="Timeline">
              <InfoGrid>
                <InfoRow label="Requested" value={formatDateTime(ride.createdAt)} />
                <InfoRow label="Started" value={formatDateTime(ride.startedAt)} />
                {ride.isScheduled && <InfoRow label="Scheduled For" value={formatDateTime(ride.scheduledAt)} />}
                <InfoRow label="Completed" value={formatDateTime(ride.completedAt)} />
                <InfoRow label="Cancelled" value={formatDateTime(ride.cancelledAt)} />
                <InfoRow label="Last Updated" value={formatDateTime(ride.updatedAt)} />
              </InfoGrid>
            </DetailCard>
          </div>

          {/* Right col */}
          <div className="space-y-6">
            {/* Fare & Payment */}
            <DetailCard title="Fare & Payment">
              <div className="mb-4 text-center">
                <p className="text-3xl font-bold text-slate-900">{formatNaira(ride.fare)}</p>
                <p className="mt-0.5 text-xs text-slate-400">{ride.distance.toFixed(2)} km trip</p>
              </div>
              <InfoGrid>
                <InfoRow label="Payment Method" value={ride.paymentMethod} />
                <InfoRow label="Payment Status" value={ride.paymentStatus} />
              </InfoGrid>
            </DetailCard>

            {/* Passenger */}
            {ride.bookedForOther && (
              <DetailCard title="Passenger">
                <InfoGrid>
                  <InfoRow label="Name" value={ride.passengerName} />
                  <InfoRow label="Phone" value={ride.passengerPhone} />
                  <InfoRow label="Email" value={ride.passengerEmail} />
                </InfoGrid>
              </DetailCard>
            )}

            {/* Assigned Driver */}
            {ride.rider && (
              <DetailCard title="Assigned Driver">
                <InfoGrid>
                  <InfoRow label="Name" value={ride.rider.name} />
                  <InfoRow label="Phone" value={ride.rider.phone} />
                  <InfoRow label="Vehicle Type" value={ride.rider.vehicleType} />
                  <InfoRow label="Rating" value={ride.rider.rating} />
                </InfoGrid>
              </DetailCard>
            )}

            {/* Cancellation */}
            {(ride.cancelledAt || ride.cancelReason) && (
              <DetailCard title="Cancellation">
                <InfoGrid>
                  <InfoRow label="Cancelled At" value={formatDateTime(ride.cancelledAt)} wide />
                  <InfoRow label="Reason" value={ride.cancelReason} wide />
                </InfoGrid>
              </DetailCard>
            )}
          </div>
        </div>
      </div>

      {/* Assign Driver modal */}
      <Modal
        open={showAssign}
        onClose={() => setShowAssign(false)}
        title="Assign Driver"
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
        {!driversLoaded && isPending ? (
          <div className="flex items-center justify-center py-8">
            <svg className="h-5 w-5 animate-spin text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        ) : drivers.length === 0 && driversLoaded ? (
          <p className="py-6 text-center text-sm text-slate-500">No ONLINE drivers available at the moment.</p>
        ) : (
          <div className="max-h-72 overflow-y-auto space-y-1">
            {drivers.map((d) => (
              <button
                key={d.id}
                onClick={() => { setSelectedDriverId(d.id); setAssignError('') }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition-colors ring-1 ring-inset',
                  selectedDriverId === d.id
                    ? 'bg-indigo-50 ring-indigo-300'
                    : 'bg-white ring-slate-200 hover:bg-slate-50'
                )}
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-semibold text-indigo-700">
                  {d.fullName[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-slate-900">{d.fullName}</p>
                  <p className="text-xs text-slate-400">{d.vehicleType} · {d.vehiclePlate ?? 'No plate'}</p>
                </div>
                {selectedDriverId === d.id && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0 text-indigo-600">
                    <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        )}
      </Modal>

      {/* Requeue confirm modal */}
      <Modal
        open={showRequeue}
        onClose={() => setShowRequeue(false)}
        title="Requeue Ride"
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowRequeue(false)}>Cancel</Button>
            <Button size="sm" loading={isPending} onClick={handleRequeue} disabled={requeueSuccess}>
              {requeueSuccess ? 'Queued!' : 'Requeue'}
            </Button>
          </>
        }
      >
        {requeueError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{requeueError}</div>
        )}
        {requeueSuccess ? (
          <p className="text-sm text-emerald-700">Ride has been successfully re-queued for driver matching.</p>
        ) : (
          <p className="text-sm text-slate-600">
            This will re-trigger automatic driver matching for ride <span className="font-mono font-semibold text-slate-900">{ride.trackingId}</span>.
          </p>
        )}
      </Modal>

      {/* Force cancel modal */}
      <Modal
        open={showCancel}
        onClose={() => setShowCancel(false)}
        title="Force Cancel Ride"
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowCancel(false)}>Cancel</Button>
            <Button variant="danger" size="sm" loading={isPending} onClick={handleForceCancel}>Force Cancel</Button>
          </>
        }
      >
        {cancelError && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{cancelError}</div>
        )}
        <p className="mb-3 text-sm text-slate-600">
          This will immediately cancel the ride. Provide a reason below.
        </p>
        <label className="mb-1.5 block text-[13px] font-medium text-slate-700">
          Reason <span className="text-red-500">*</span>
        </label>
        <textarea
          value={cancelReason}
          onChange={(e) => { setCancelReason(e.target.value); setCancelError('') }}
          rows={3}
          placeholder="e.g. Customer requested cancellation via phone"
          className={INPUT_CLS + ' resize-none'}
        />
      </Modal>
    </>
  )
}
