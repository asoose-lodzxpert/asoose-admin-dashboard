'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/app/components/ui/modal'
import { Button } from '@/app/components/ui/button'
import { DocsGrid } from '@/app/components/ui/doc-card'
import { useToast } from '@/app/components/ui/toast'
import { cn } from '@/app/lib/utils'
import { approveRider, suspendRider, getRiderDetail } from '@/app/actions/riders'
import type { RiderSummary } from '@/app/lib/types'

type RStatus = RiderSummary['status']

const STATUS_STYLES: Record<RStatus, string> = {
  ONLINE:      'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  OFFLINE:     'bg-slate-100 text-slate-600 ring-slate-500/20',
  BUSY:        'bg-amber-50 text-amber-700 ring-amber-600/20',
  ON_DELIVERY: 'bg-sky-50 text-sky-700 ring-sky-600/20',
  SUSPENDED:   'bg-red-50 text-red-700 ring-red-600/20',
}

const STATUS_DOT: Record<RStatus, string> = {
  ONLINE:      'bg-emerald-500',
  OFFLINE:     'bg-slate-400',
  BUSY:        'bg-amber-400',
  ON_DELIVERY: 'bg-sky-500',
  SUSPENDED:   'bg-red-500',
}

interface Props {
  initialRiders: RiderSummary[]
  initialPagination: { page: number; limit: number; total: number; totalPages: number }
}

function InfoRow({ label, value }: { label: string; value?: string | number | null }) {
  if (value == null || value === '') return null
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-700">{String(value)}</dd>
    </div>
  )
}

function Stars({ rating }: { rating: number }) {
  const r = Math.round(rating)
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg key={s} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
          fill={s <= r ? '#f59e0b' : 'none'} stroke="#f59e0b" strokeWidth={1}
          className="h-3 w-3">
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 0 0 .951-.69l1.07-3.292Z" />
        </svg>
      ))}
      <span className="ml-1 text-xs text-slate-500">{rating.toFixed(1)}</span>
    </span>
  )
}

export function RidersClient({ initialRiders, initialPagination }: Props) {
  const toast = useToast()
  const [riders, setRiders] = useState(initialRiders)
  const [pagination] = useState(initialPagination)
  const [isPending, startTransition] = useTransition()

  // Detail modal
  const [detail, setDetail] = useState<Record<string, unknown> | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Suspend
  const [suspendTarget, setSuspendTarget] = useState<RiderSummary | null>(null)
  const [reason, setReason] = useState('')
  const [actionError, setActionError] = useState('')

  function updateRider(id: string, patch: Partial<RiderSummary>) {
    setRiders((prev) => prev.map((r) => r.id === id ? { ...r, ...patch } : r))
  }

  function openDetail(rider: RiderSummary) {
    setDetail(null)
    setLoadingDetail(true)
    startTransition(async () => {
      const d = await getRiderDetail(rider.id)
      setDetail((d ?? rider) as unknown as Record<string, unknown>)
      setLoadingDetail(false)
    })
  }

  function handleApprove(rider: RiderSummary) {
    startTransition(async () => {
      const res = await approveRider(rider.id)
      if (res.error) { toast.error(res.error); return }
      updateRider(rider.id, { isVerified: true })
      toast.success('Rider approved.')
    })
  }

  function handleSuspend() {
    if (!suspendTarget) return
    startTransition(async () => {
      const res = await suspendRider(suspendTarget.id, reason)
      if (res.error) { setActionError(res.error); toast.error(res.error); return }
      updateRider(suspendTarget.id, { status: 'SUSPENDED' })
      setSuspendTarget(null); setReason('')
      toast.success('Rider suspended.')
    })
  }

  const docs = detail
    ? Object.fromEntries(
        Object.entries(detail).filter(([k, v]) =>
          typeof v === 'string' && (
            v.startsWith('http') ||
            ['photo', 'image', 'license', 'document', 'doc', 'picture', 'certificate'].some((w) =>
              k.toLowerCase().includes(w)
            )
          )
        )
      )
    : {}

  return (
    <main className="px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Riders</h1>
        <p className="mt-0.5 text-sm text-slate-500">{pagination.total} riders on the platform.</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {riders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm font-medium text-slate-700">No riders found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Rider</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Vehicle Type</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Status</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Verified</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Deliveries</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Rating</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {riders.map((rider) => (
                  <tr key={rider.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-900">{rider.fullName}</p>
                      <p className="text-xs text-slate-400">{rider.email}</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{rider.vehicleType || '—'}</td>
                    <td className="px-5 py-3.5">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                        STATUS_STYLES[rider.status]
                      )}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[rider.status])} />
                        {rider.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {rider.isVerified
                        ? <span className="text-xs font-medium text-emerald-600">Verified</span>
                        : <span className="text-xs text-slate-400">Unverified</span>}
                    </td>
                    <td className="px-5 py-3.5 text-slate-700 font-medium">{rider.totalDeliveries.toLocaleString()}</td>
                    <td className="px-5 py-3.5"><Stars rating={rider.rating} /></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openDetail(rider)}
                          className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-100 transition-colors"
                        >
                          View
                        </button>
                        {!rider.isVerified && rider.status !== 'SUSPENDED' && (
                          <Button size="sm" loading={isPending} onClick={() => handleApprove(rider)} className="h-7 px-2.5 text-xs">
                            Approve
                          </Button>
                        )}
                        {rider.status !== 'SUSPENDED' && (
                          <Button variant="secondary" size="sm" onClick={() => { setActionError(''); setReason(''); setSuspendTarget(rider) }} className="h-7 px-2.5 text-xs">
                            Suspend
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Detail modal ──────────────────────────────────────── */}
      <Modal
        open={detail != null || loadingDetail}
        onClose={() => { setDetail(null); setLoadingDetail(false) }}
        title={detail ? String(detail.fullName ?? detail.name ?? 'Rider') : 'Loading…'}
        description={detail ? String(detail.email ?? '') : undefined}
        size="lg"
        footer={<Button variant="secondary" size="sm" onClick={() => setDetail(null)}>Close</Button>}
      >
        {loadingDetail && !detail ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
          </div>
        ) : detail ? (
          <div className="space-y-6">
            {/* Profile info */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Profile</h3>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                <InfoRow label="Full Name" value={detail.fullName as string} />
                <InfoRow label="Email" value={detail.email as string} />
                <InfoRow label="Phone" value={detail.phone as string} />
                <InfoRow label="Vehicle Type" value={detail.vehicleType as string} />
                <InfoRow label="Vehicle Brand" value={detail.vehicleBrand as string} />
                <InfoRow label="Plate Number" value={detail.plateNumber as string} />
                <InfoRow label="License Number" value={(detail.driversLicenseNumber ?? detail.licenseNumber) as string} />
                <InfoRow label="Vehicle Year" value={detail.vehicleYear as string} />
                <InfoRow label="Vehicle Color" value={detail.vehicleColor as string} />
                <InfoRow label="Total Deliveries" value={detail.totalDeliveries as number} />
                <InfoRow label="Rating" value={detail.rating as number} />
              </dl>
            </div>

            {/* Documents */}
            {Object.keys(docs).length > 0 && (
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Documents</h3>
                <DocsGrid docs={docs as Record<string, string>} />
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* Suspend modal */}
      <Modal
        open={suspendTarget != null}
        onClose={() => setSuspendTarget(null)}
        title="Suspend Rider"
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setSuspendTarget(null)}>Cancel</Button>
            <Button variant="danger" size="sm" loading={isPending} onClick={handleSuspend}>Suspend</Button>
          </>
        }
      >
        {actionError && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{actionError}</div>}
        <p className="mb-3 text-sm text-slate-600">Suspend <span className="font-semibold text-slate-900">{suspendTarget?.fullName}</span>? They will not be able to take deliveries.</p>
        <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Reason (optional)</label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Reason for suspension…"
          className="w-full resize-none rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
      </Modal>
    </main>
  )
}
