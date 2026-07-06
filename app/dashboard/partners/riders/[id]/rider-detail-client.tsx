'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Modal } from '@/app/components/ui/modal'
import { Button } from '@/app/components/ui/button'
import { DetailCard, InfoRow, InfoGrid, Stars, formatDate } from '@/app/components/ui/detail'
import { DocumentsSection, type DocumentField } from '@/app/components/ui/documents-section'
import { cn } from '@/app/lib/utils'
import { approveRider, suspendRider, updateRiderProfile, updateRiderDocuments, adjustRiderWallet, adjustRiderCommission } from '@/app/actions/riders'
import { UserFinanceSection } from '@/app/components/user-finance-section'
import { CommissionSection } from '@/app/components/commission-section'
import type { RiderDetail, VehicleType, VehicleBrand } from '@/app/lib/types'
import { NIGERIAN_STATES } from '@/app/lib/nigeria'

type RStatus = RiderDetail['status']

const STATUS_STYLES: Record<RStatus, string> = {
  ONLINE:    'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  OFFLINE:   'bg-slate-100 text-slate-600 ring-slate-500/20',
  BUSY:      'bg-amber-50 text-amber-700 ring-amber-600/20',
  SUSPENDED: 'bg-red-50 text-red-700 ring-red-600/20',
}

const STATUS_DOT: Record<RStatus, string> = {
  ONLINE:    'bg-emerald-500',
  OFFLINE:   'bg-slate-400',
  BUSY:      'bg-amber-400',
  SUSPENDED: 'bg-red-500',
}

const RIDER_DOCUMENT_FIELDS: DocumentField[] = [
  { key: 'profilePhoto',        label: 'Profile Photo',            clearable: true  },
  { key: 'driversLicenseFront', label: "Driver's License (Front)", clearable: false },
  { key: 'driversLicenseBack',  label: "Driver's License (Back)",  clearable: true  },
  { key: 'vehiclePhoto',        label: 'Vehicle Photo',            clearable: true  },
  { key: 'insuranceDocument',   label: 'Insurance Document',       clearable: true  },
]

interface Props {
  rider: RiderDetail
  displayName: string
  displayEmail?: string
  displayPhone?: string
  vehicleTypes: VehicleType[]
  vehicleBrands: VehicleBrand[]
}

export function RiderDetailClient({ rider: initial, displayName, displayEmail, displayPhone, vehicleTypes, vehicleBrands }: Props) {
  const [rider, setRider] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const [showSuspend, setShowSuspend] = useState(false)
  const [showEdit, setShowEdit] = useState(false)
  const [reason, setReason] = useState('')
  const [actionError, setActionError] = useState('')

  const [editForm, setEditForm] = useState({
    vehicleType: rider.vehicleType ?? '',
    vehicleBrand: rider.vehicleBrand ?? '',
    vehicleModel: rider.vehicleModel ?? '',
    vehicleYear: rider.vehicleYear ?? '',
    vehicleColor: rider.vehicleColor ?? '',
    vehiclePlate: rider.vehiclePlate ?? '',
    driversLicenseNumber: rider.driversLicenseNumber ?? '',
    driversLicenseExpiry: rider.driversLicenseExpiry ? rider.driversLicenseExpiry.slice(0, 10) : '',
    driversLicenseState: rider.driversLicenseState ?? '',
    maxDeliveryDistance: rider.maxDeliveryDistance ?? '',
    status: rider.status,
    isVerified: rider.isVerified,
  })
  const [editError, setEditError] = useState('')

  function ef<K extends keyof typeof editForm>(k: K, v: (typeof editForm)[K]) {
    setEditForm((f) => ({ ...f, [k]: v }))
  }

  function handleEdit() {
    startTransition(async () => {
      setEditError('')
      const res = await updateRiderProfile(rider.id, {
        vehicleType: editForm.vehicleType || undefined,
        vehicleBrand: editForm.vehicleBrand || null,
        vehicleModel: editForm.vehicleModel || null,
        vehicleYear: editForm.vehicleYear !== '' ? Number(editForm.vehicleYear) : null,
        vehicleColor: editForm.vehicleColor || null,
        vehiclePlate: editForm.vehiclePlate || null,
        driversLicenseNumber: editForm.driversLicenseNumber || undefined,
        driversLicenseExpiry: editForm.driversLicenseExpiry ? new Date(editForm.driversLicenseExpiry).toISOString() : undefined,
        driversLicenseState: editForm.driversLicenseState || undefined,
        maxDeliveryDistance: editForm.maxDeliveryDistance !== '' ? Number(editForm.maxDeliveryDistance) : undefined,
        status: editForm.status,
        isVerified: editForm.isVerified,
      })
      if (res.error) { setEditError(res.error); return }
      if (res.rider) patch(res.rider)
      setShowEdit(false)
    })
  }

  function patch(p: Partial<RiderDetail>) { setRider((r) => ({ ...r, ...p })) }

  function handleApprove() {
    startTransition(async () => {
      const res = await approveRider(rider.id)
      if (!res.error) patch({ isVerified: true })
    })
  }

  function handleSuspend() {
    startTransition(async () => {
      const res = await suspendRider(rider.id, reason)
      if (res.error) { setActionError(res.error); return }
      patch({ status: 'SUSPENDED', isVerified: false })
      setShowSuspend(false); setReason('')
    })
  }

  const initials = displayName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-8 py-4">
        <Link href="/dashboard/partners/riders" className="mb-3 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors w-fit">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
          Riders
        </Link>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-base font-bold text-sky-700">{initials}</div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-900 truncate">{displayName}</h1>
                <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', STATUS_STYLES[rider.status])}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[rider.status])} />
                  {rider.status}
                </span>
                {rider.isVerified && (
                  <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">Verified</span>
                )}
              </div>
              <p className="text-sm text-slate-500">{[rider.userEmail ?? displayEmail, rider.userPhone ?? displayPhone].filter(Boolean).join(' · ')}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="secondary" size="sm" onClick={() => { setEditError(''); setShowEdit(true) }}>Edit Profile</Button>
            {!rider.isVerified && rider.status !== 'SUSPENDED' && (
              <Button size="sm" loading={isPending} onClick={handleApprove}>Approve</Button>
            )}
            {rider.status !== 'SUSPENDED' && (
              <Button variant="danger" size="sm" onClick={() => { setActionError(''); setReason(''); setShowSuspend(true) }}>Suspend</Button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="px-8 py-6 space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <DetailCard title="Vehicle Information">
              <InfoGrid>
                <InfoRow label="Type" value={rider.vehicleType} />
                <InfoRow label="Brand" value={rider.vehicleBrand} />
                <InfoRow label="Model" value={rider.vehicleModel} />
                <InfoRow label="Year" value={rider.vehicleYear} />
                <InfoRow label="Color" value={rider.vehicleColor} />
                <InfoRow label="Plate" value={rider.vehiclePlate} />
              </InfoGrid>
            </DetailCard>

            <DetailCard title="License">
              <InfoGrid>
                <InfoRow label="License Number" value={rider.driversLicenseNumber} />
                <InfoRow label="Expiry" value={formatDate(rider.driversLicenseExpiry)} />
                <InfoRow label="State" value={rider.driversLicenseState} />
              </InfoGrid>
            </DetailCard>

            <UserFinanceSection
              userId={rider.userId}
              adjustWalletAction={(payload) => adjustRiderWallet(rider.id, payload)}
            />
          </div>

          <div className="space-y-6">
            <DetailCard title="Stats">
              <InfoGrid className="grid-cols-1">
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Rating</dt>
                  <dd className="mt-1"><Stars rating={rider.rating} /></dd>
                </div>
                <InfoRow label="Total Deliveries" value={rider.totalDeliveries} />
                <InfoRow label="Total Reviews" value={rider.totalReviews} />
                <InfoRow label="Max Distance" value={rider.maxDeliveryDistance != null ? `${rider.maxDeliveryDistance} km` : null} />
              </InfoGrid>
            </DetailCard>

            <CommissionSection
              commissionPercent={rider.customCommissionPercent}
              onAdjust={async (payload) => {
                const res = await adjustRiderCommission(rider.id, payload)
                if (res.error) return { error: res.error }
                if (res.rider) patch({ customCommissionPercent: res.rider.customCommissionPercent })
                return { commissionPercent: res.rider?.customCommissionPercent ?? null }
              }}
            />

            {rider.preferredZones?.length > 0 && (
              <DetailCard title="Preferred Zones">
                <div className="flex flex-wrap gap-2">
                  {rider.preferredZones.map((z) => (
                    <span key={z} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{z}</span>
                  ))}
                </div>
              </DetailCard>
            )}

            <DetailCard title="Status">
              <InfoGrid className="grid-cols-1">
                <InfoRow label="Verified" value={rider.isVerified ? 'Yes' : 'No'} />
                <InfoRow label="Onboarding" value={rider.onboardingCompleted ? 'Completed' : 'Incomplete'} />
                <InfoRow label="Completed At" value={formatDate(rider.onboardingCompletedAt)} />
                <InfoRow label="Joined" value={formatDate(rider.createdAt)} />
              </InfoGrid>
            </DetailCard>
          </div>
        </div>

        <DetailCard title="Documents">
          <DocumentsSection
            fields={RIDER_DOCUMENT_FIELDS}
            documents={rider.documents}
            patchDocuments={async (changes) => {
              const res = await updateRiderDocuments(rider.id, changes)
              if (res.error) return { error: res.error }
              return { data: res.data as Record<string, string | null | boolean> }
            }}
            onUpdate={(docs) => patch({ documents: docs as RiderDetail['documents'] })}
          />
        </DetailCard>
      </div>

      {/* Edit Profile modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Rider Profile" size="lg"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button size="sm" loading={isPending} onClick={handleEdit}>Save Changes</Button>
          </>
        }
      >
        {editError && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{editError}</div>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Vehicle Type</label>
            <select value={editForm.vehicleType} onChange={(e) => ef('vehicleType', e.target.value)}
              className="w-full rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="">— Select —</option>
              {vehicleTypes.filter((t) => t.appliesTo === 'RIDER').map((t) => (
                <option key={t.id} value={t.code}>{t.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Vehicle Brand</label>
            <select value={editForm.vehicleBrand} onChange={(e) => ef('vehicleBrand', e.target.value)}
              className="w-full rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="">— Select —</option>
              {vehicleBrands.map((b) => (
                <option key={b.id} value={b.name}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Vehicle Model</label>
            <input value={editForm.vehicleModel} onChange={(e) => ef('vehicleModel', e.target.value)}
              className="w-full rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Vehicle Year</label>
            <input type="number" value={editForm.vehicleYear} onChange={(e) => ef('vehicleYear', e.target.value)}
              className="w-full rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Color</label>
            <input value={editForm.vehicleColor} onChange={(e) => ef('vehicleColor', e.target.value)}
              className="w-full rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Plate Number</label>
            <input value={editForm.vehiclePlate} onChange={(e) => ef('vehiclePlate', e.target.value)}
              className="w-full rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">License Number</label>
            <input value={editForm.driversLicenseNumber} onChange={(e) => ef('driversLicenseNumber', e.target.value)}
              className="w-full rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">License Expiry</label>
            <input type="date" value={editForm.driversLicenseExpiry} onChange={(e) => ef('driversLicenseExpiry', e.target.value)}
              className="w-full rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">License State</label>
            <select value={editForm.driversLicenseState} onChange={(e) => ef('driversLicenseState', e.target.value)}
              className="w-full rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="">— Select State —</option>
              {NIGERIAN_STATES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Max Delivery Distance (km)</label>
            <input type="number" min={1} value={editForm.maxDeliveryDistance} onChange={(e) => ef('maxDeliveryDistance', e.target.value)}
              className="w-full rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Status</label>
            <select value={editForm.status} onChange={(e) => ef('status', e.target.value as typeof editForm.status)}
              className="w-full rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="ONLINE">Online</option>
              <option value="OFFLINE">Offline</option>
              <option value="BUSY">Busy</option>
              <option value="SUSPENDED">Suspended</option>
            </select>
          </div>
          <div className="flex items-center gap-3 pt-6">
            <button type="button" role="switch" aria-checked={editForm.isVerified}
              onClick={() => ef('isVerified', !editForm.isVerified)}
              className={cn('relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2', editForm.isVerified ? 'bg-indigo-600' : 'bg-slate-200')}>
              <span className={cn('pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform', editForm.isVerified ? 'translate-x-5' : 'translate-x-0')} />
            </button>
            <span className="text-sm font-medium text-slate-700">Verified</span>
          </div>
        </div>
      </Modal>

      <Modal open={showSuspend} onClose={() => setShowSuspend(false)} title="Suspend Rider" size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowSuspend(false)}>Cancel</Button>
            <Button variant="danger" size="sm" loading={isPending} onClick={handleSuspend}>Suspend</Button>
          </>
        }
      >
        {actionError && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{actionError}</div>}
        <p className="mb-3 text-sm text-slate-600">Suspend <span className="font-semibold text-slate-900">{displayName}</span>? They will not be able to take deliveries.</p>
        <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Reason (required)</label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
          className="w-full resize-none rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
      </Modal>
    </div>
  )
}
