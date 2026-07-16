'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/app/components/ui/modal'
import { Button } from '@/app/components/ui/button'
import { DocsGrid } from '@/app/components/ui/doc-card'
import { useToast } from '@/app/components/ui/toast'
import { cn } from '@/app/lib/utils'
import { approveVendor, rejectVendor, suspendVendor, getVendorDetail } from '@/app/actions/vendors'
import type { VendorSummary, VendorDetail } from '@/app/lib/types'

type VStatus = VendorSummary['verificationStatus']

const STATUS_STYLES: Record<VStatus, string> = {
  PENDING:   'bg-amber-50 text-amber-700 ring-amber-600/20',
  VERIFIED:  'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  REJECTED:  'bg-red-50 text-red-700 ring-red-600/20',
  SUSPENDED: 'bg-slate-100 text-slate-600 ring-slate-500/20',
}

const STATUS_DOT: Record<VStatus, string> = {
  PENDING:   'bg-amber-400',
  VERIFIED:  'bg-emerald-500',
  REJECTED:  'bg-red-500',
  SUSPENDED: 'bg-slate-400',
}

const FILTERS: { label: string; value: string }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Verified', value: 'VERIFIED' },
  { label: 'Rejected', value: 'REJECTED' },
  { label: 'Suspended', value: 'SUSPENDED' },
]

interface Props {
  initialVendors: VendorSummary[]
  initialPagination: { page: number; limit: number; total: number; totalPages: number }
}

/* ─── Detail section helpers ─────────────────────────────── */

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-700">{value}</dd>
    </div>
  )
}

/* ─── Main component ─────────────────────────────────────── */

export function VendorsClient({ initialVendors, initialPagination }: Props) {
  const toast = useToast()
  const [vendors, setVendors] = useState(initialVendors)
  const [pagination] = useState(initialPagination)
  const [filter, setFilter] = useState('')
  const [isPending, startTransition] = useTransition()

  // Detail modal
  const [detail, setDetail] = useState<VendorDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)

  // Reject/suspend
  const [rejectTarget, setRejectTarget] = useState<VendorSummary | null>(null)
  const [suspendTarget, setSuspendTarget] = useState<VendorSummary | null>(null)
  const [reason, setReason] = useState('')
  const [actionError, setActionError] = useState('')

  const displayed = filter ? vendors.filter((v) => v.verificationStatus === filter) : vendors

  function updateVendor(id: string, patch: Partial<VendorSummary>) {
    setVendors((prev) => prev.map((v) => v.id === id ? { ...v, ...patch } : v))
    if (detail?.id === id) setDetail((d) => d ? { ...d, ...(patch as Partial<VendorDetail>) } : d)
  }

  function openDetail(vendor: VendorSummary) {
    setDetail(null)
    setLoadingDetail(true)
    startTransition(async () => {
      const d = await getVendorDetail(vendor.id)
      setDetail(d ?? { ...vendor } as unknown as VendorDetail)
      setLoadingDetail(false)
    })
  }

  function handleApprove(vendor: VendorSummary) {
    startTransition(async () => {
      const res = await approveVendor(vendor.id)
      if (res.error) { toast.error(res.error); return }
      updateVendor(vendor.id, { verificationStatus: 'VERIFIED', isVerified: true })
      toast.success('Vendor approved.')
    })
  }

  function handleReject() {
    if (!rejectTarget) return
    startTransition(async () => {
      const res = await rejectVendor(rejectTarget.id, reason)
      if (res.error) { setActionError(res.error); toast.error(res.error); return }
      updateVendor(rejectTarget.id, { verificationStatus: 'REJECTED' })
      setRejectTarget(null); setReason('')
      toast.success('Vendor rejected.')
    })
  }

  function handleSuspend() {
    if (!suspendTarget) return
    startTransition(async () => {
      const res = await suspendVendor(suspendTarget.id, reason)
      if (res.error) { setActionError(res.error); toast.error(res.error); return }
      updateVendor(suspendTarget.id, { verificationStatus: 'SUSPENDED' })
      setSuspendTarget(null); setReason('')
      toast.success('Vendor suspended.')
    })
  }

  return (
    <main className="px-8 py-8">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vendors</h1>
          <p className="mt-0.5 text-sm text-slate-500">{pagination.total} vendors registered on the platform.</p>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="mb-5 flex gap-2 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              filter === f.value
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm font-medium text-slate-700">No vendors found</p>
            <p className="mt-0.5 text-xs text-slate-400">Try a different filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Business</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Type</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Email</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Status</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Joined</th>
                  <th className="px-5 py-3.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {displayed.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-900">{vendor.businessName}</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{vendor.businessType || '—'}</td>
                    <td className="px-5 py-3.5 text-slate-500">{vendor.businessEmail}</td>
                    <td className="px-5 py-3.5">
                      <span className={cn(
                        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
                        STATUS_STYLES[vendor.verificationStatus]
                      )}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[vendor.verificationStatus])} />
                        {vendor.verificationStatus}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-400 text-xs">
                      {new Date(vendor.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => openDetail(vendor)}
                          className="rounded-lg px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-100 transition-colors"
                        >
                          View
                        </button>
                        {vendor.verificationStatus === 'PENDING' && (
                          <>
                            <Button size="sm" loading={isPending} onClick={() => handleApprove(vendor)} className="h-7 px-2.5 text-xs">
                              Approve
                            </Button>
                            <Button variant="danger" size="sm" onClick={() => { setActionError(''); setReason(''); setRejectTarget(vendor) }} className="h-7 px-2.5 text-xs">
                              Reject
                            </Button>
                          </>
                        )}
                        {vendor.verificationStatus === 'VERIFIED' && (
                          <Button variant="secondary" size="sm" onClick={() => { setActionError(''); setReason(''); setSuspendTarget(vendor) }} className="h-7 px-2.5 text-xs">
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
        title={detail?.businessName ?? 'Loading…'}
        description={detail ? `${detail.businessType || 'Vendor'} · ${detail.businessEmail}` : undefined}
        size="lg"
        footer={
          detail ? (
            <>
              {detail.verificationStatus === 'PENDING' && (
                <>
                  <Button variant="danger" size="sm" onClick={() => { setDetail(null); setActionError(''); setReason(''); setRejectTarget(detail as unknown as VendorSummary) }}>
                    Reject
                  </Button>
                  <Button size="sm" onClick={() => { handleApprove(detail as unknown as VendorSummary); setDetail(null) }}>
                    Approve
                  </Button>
                </>
              )}
              {detail.verificationStatus === 'VERIFIED' && (
                <Button variant="secondary" size="sm" onClick={() => { setDetail(null); setActionError(''); setReason(''); setSuspendTarget(detail as unknown as VendorSummary) }}>
                  Suspend
                </Button>
              )}
              {!['PENDING', 'VERIFIED'].includes(detail.verificationStatus) && (
                <Button variant="secondary" size="sm" onClick={() => setDetail(null)}>Close</Button>
              )}
            </>
          ) : (
            <Button variant="secondary" size="sm" onClick={() => setLoadingDetail(false)}>Close</Button>
          )
        }
      >
        {loadingDetail && !detail ? (
          <div className="flex items-center justify-center py-10">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-slate-200 border-t-indigo-600" />
          </div>
        ) : detail ? (
          <div className="space-y-6">
            {/* Status badge */}
            <span className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset',
              STATUS_STYLES[detail.verificationStatus]
            )}>
              <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[detail.verificationStatus])} />
              {detail.verificationStatus}
            </span>

            {/* Business info */}
            <div>
              <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Business Information</h3>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                <InfoRow label="Business Name" value={detail.businessName} />
                <InfoRow label="Business Type" value={detail.businessType} />
                <InfoRow label="Email" value={detail.businessEmail} />
                <InfoRow label="Phone" value={detail.businessPhone} />
                <InfoRow label="Tax ID" value={detail.taxId} />
                {detail.businessDescription && (
                  <div className="col-span-2">
                    <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Description</dt>
                    <dd className="mt-0.5 text-sm text-slate-700">{detail.businessDescription}</dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Address */}
            {(detail.street || detail.city || detail.state) && (
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Address</h3>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                  <InfoRow label="Street" value={detail.street} />
                  <InfoRow label="City" value={detail.city} />
                  <InfoRow label="State" value={detail.state} />
                  <InfoRow label="Country" value={detail.country} />
                  <InfoRow label="Zip Code" value={detail.zipCode} />
                </dl>
              </div>
            )}

            {/* Bank details */}
            {detail.bankDetails && Object.keys(detail.bankDetails).length > 0 && (
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Bank Details</h3>
                <dl className="grid grid-cols-2 gap-x-6 gap-y-3">
                  {Object.entries(detail.bankDetails).map(([k, v]) => (
                    <InfoRow key={k} label={k.replace(/([A-Z])/g, ' $1').trim()} value={v ?? undefined} />
                  ))}
                </dl>
              </div>
            )}

            {/* Documents */}
            {detail.documents && Object.keys(detail.documents).length > 0 && (
              <div>
                <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Documents</h3>
                <DocsGrid docs={detail.documents} />
              </div>
            )}
          </div>
        ) : null}
      </Modal>

      {/* Reject modal */}
      <Modal
        open={rejectTarget != null}
        onClose={() => setRejectTarget(null)}
        title="Reject Vendor"
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setRejectTarget(null)}>Cancel</Button>
            <Button variant="danger" size="sm" loading={isPending} onClick={handleReject}>Reject</Button>
          </>
        }
      >
        {actionError && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{actionError}</div>}
        <p className="mb-3 text-sm text-slate-600">Reject <span className="font-semibold text-slate-900">{rejectTarget?.businessName}</span>?</p>
        <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Reason (optional)</label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Reason for rejection…"
          className="w-full resize-none rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
      </Modal>

      {/* Suspend modal */}
      <Modal
        open={suspendTarget != null}
        onClose={() => setSuspendTarget(null)}
        title="Suspend Vendor"
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setSuspendTarget(null)}>Cancel</Button>
            <Button variant="danger" size="sm" loading={isPending} onClick={handleSuspend}>Suspend</Button>
          </>
        }
      >
        {actionError && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{actionError}</div>}
        <p className="mb-3 text-sm text-slate-600">Suspend <span className="font-semibold text-slate-900">{suspendTarget?.businessName}</span>? They will not be able to receive orders.</p>
        <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Reason (optional)</label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} placeholder="Reason for suspension…"
          className="w-full resize-none rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
      </Modal>
    </main>
  )
}
