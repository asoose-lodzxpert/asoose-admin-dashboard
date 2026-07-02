'use client'

import Image from 'next/image'
import { useState, useTransition } from 'react'
import Link from 'next/link'
import { Modal } from '@/app/components/ui/modal'
import { Button } from '@/app/components/ui/button'
import { DocsGrid } from '@/app/components/ui/doc-card'
import { DetailCard, InfoRow, InfoGrid } from '@/app/components/ui/detail'
import { VendorMenuSection } from './vendor-menu'
import { VendorProductsSection } from './vendor-products'
import { cn } from '@/app/lib/utils'
import { approveVendor, rejectVendor, suspendVendor, updateVendorStore } from '@/app/actions/vendors'
import { UserFinanceSection } from '@/app/components/user-finance-section'
import type { VendorDetail, VendorMenu, Product, VendorStoreDetail } from '@/app/lib/types'

type VStatus = VendorDetail['verificationStatus']

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

type Tab = 'overview' | 'products' | 'menu'

interface Props {
  vendor: VendorDetail
  menu?: VendorMenu | null
  initialProducts: Product[]
  productTotal: number
}

export function VendorDetailClient({ vendor: initial, menu, initialProducts, productTotal }: Props) {
  const [vendor, setVendor] = useState(initial)
  const [isPending, startTransition] = useTransition()

  const hasMenu = !!menu
  const [tab, setTab] = useState<Tab>('overview')
  const [menuTotal, setMenuTotal] = useState(menu?.totalItems ?? 0)

  const [showReject, setShowReject] = useState(false)
  const [showSuspend, setShowSuspend] = useState(false)
  const [showEditStore, setShowEditStore] = useState(false)
  const [reason, setReason] = useState('')
  const [actionError, setActionError] = useState('')

  const store = vendor.store

  const [storeForm, setStoreForm] = useState({
    name: store?.name ?? '',
    description: vendor.businessDescription ?? '',
    address: store?.address ?? '',
    status: store?.status ?? 'PENDING' as VendorStoreDetail['status'],
    isOpen: store?.isOpen ?? false,
    preparationTime: store?.preparationTime ?? '',
  })
  const [storeFormError, setStoreFormError] = useState('')

  function sf<K extends keyof typeof storeForm>(k: K, v: (typeof storeForm)[K]) {
    setStoreForm((f) => ({ ...f, [k]: v }))
  }

  function handleEditStore() {
    startTransition(async () => {
      setStoreFormError('')
      const res = await updateVendorStore(vendor.id, {
        name: storeForm.name || undefined,
        description: storeForm.description || null,
        address: storeForm.address || undefined,
        status: storeForm.status,
        isOpen: storeForm.isOpen,
        preparationTime: storeForm.preparationTime !== '' ? Number(storeForm.preparationTime) : null,
      })
      if (res.error) { setStoreFormError(res.error); return }
      if (res.store) patch({ store: { ...(vendor.store ?? {}), ...res.store } as VendorStoreDetail })
      setShowEditStore(false)
    })
  }

  function patch(p: Partial<VendorDetail>) { setVendor((v) => ({ ...v, ...p })) }

  function handleApprove() {
    startTransition(async () => {
      const res = await approveVendor(vendor.id)
      if (!res.error) patch({ verificationStatus: 'VERIFIED', isVerified: true })
    })
  }

  function handleReject() {
    startTransition(async () => {
      const res = await rejectVendor(vendor.id, reason)
      if (res.error) { setActionError(res.error); return }
      patch({ verificationStatus: 'REJECTED' })
      setShowReject(false); setReason('')
    })
  }

  function handleSuspend() {
    startTransition(async () => {
      const res = await suspendVendor(vendor.id, reason)
      if (res.error) { setActionError(res.error); return }
      patch({ verificationStatus: 'SUSPENDED' })
      setShowSuspend(false); setReason('')
    })
  }

  const initials = vendor.businessName.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="min-h-full">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-8 py-4">
        <Link href="/dashboard/partners/vendors" className="mb-3 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors w-fit">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
          Vendors
        </Link>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            {/* Store logo or initials */}
            {store?.logo ? (
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-50">
                <Image src={store.logo} alt={vendor.businessName} fill className="object-cover" unoptimized />
              </div>
            ) : (
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-base font-bold text-indigo-700">{initials}</div>
            )}
            <div className="min-w-0">
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-900 truncate">{store?.name ?? vendor.businessName}</h1>
                <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', STATUS_STYLES[vendor.verificationStatus])}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[vendor.verificationStatus])} />
                  {vendor.verificationStatus}
                </span>
              </div>
              <p className="text-sm text-slate-500">{vendor.businessType} · {vendor.businessEmail}</p>
              {vendor.userEmail && vendor.userEmail !== vendor.businessEmail && (
                <p className="text-xs text-slate-400">Account email: <span className="font-medium text-slate-600">{vendor.userEmail}</span></p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="secondary" size="sm" onClick={() => { setStoreFormError(''); setShowEditStore(true) }}>Edit Store</Button>
            {vendor.verificationStatus === 'PENDING' && (
              <>
                <Button variant="secondary" size="sm" onClick={() => { setActionError(''); setReason(''); setShowReject(true) }}>Reject</Button>
                <Button size="sm" loading={isPending} onClick={handleApprove}>Approve</Button>
              </>
            )}
            {vendor.verificationStatus === 'VERIFIED' && (
              <Button variant="danger" size="sm" onClick={() => { setActionError(''); setReason(''); setShowSuspend(true) }}>Suspend</Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-4 -mb-px flex gap-6">
          {([
            ['overview', 'Overview'],
            ['products', `Products (${productTotal})`],
            ...(hasMenu ? [['menu', `Menu (${menuTotal})`]] : []),
          ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={cn(
                'border-b-2 pb-2.5 text-sm font-medium transition-colors',
                tab === key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Products tab */}
      {tab === 'products' && (
        <div className="px-8 py-6">
          <VendorProductsSection vendorId={vendor.id} initialProducts={initialProducts} total={productTotal} />
        </div>
      )}

      {/* Menu tab */}
      {hasMenu && tab === 'menu' && (
        <div className="px-8 py-6">
          <VendorMenuSection menu={menu!} onTotalItemsChange={setMenuTotal} />
        </div>
      )}

      {/* Overview tab */}
      <div className={cn('px-8 py-6 space-y-6', tab !== 'overview' && 'hidden')}>

        {/* Store banner + logo hero */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Store</h2>
          </div>
          {store ? (
            <>
              {/* Banner */}
              <div className="relative w-full h-40 bg-linear-to-r from-slate-100 to-slate-200 overflow-hidden">
                {store.banner ? (
                  <Image src={store.banner} alt="Store banner" fill className="object-cover" unoptimized />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <p className="text-xs text-slate-400">No banner uploaded</p>
                  </div>
                )}
                {/* Logo pinned to bottom-left, half overlapping banner edge */}
                <div className="absolute bottom-0 left-6 translate-y-1/2">
                  {store.logo ? (
                    <div className="relative h-16 w-16 overflow-hidden rounded-2xl border-2 border-white shadow-lg bg-white">
                      <Image src={store.logo} alt="Store logo" fill className="object-cover" unoptimized />
                    </div>
                  ) : (
                    <div className="flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-white shadow-lg bg-indigo-100 text-xl font-bold text-indigo-700">{initials}</div>
                  )}
                </div>
              </div>

              {/* Store details below banner */}
              <div className="px-6 pt-12 pb-5">
                <InfoGrid className="grid-cols-2 sm:grid-cols-3 lg:grid-cols-4">
                  <InfoRow label="Store Name" value={store.name} wide />
                  <InfoRow label="Store Status" value={store.status} />
                  <InfoRow label="Slug" value={store.slug} />
                  <InfoRow label="Rating" value={store.rating > 0 ? store.rating.toFixed(1) : '—'} />
                  <InfoRow label="Is Open" value={store.isOpen ? 'Yes' : 'No'} />
                  <InfoRow label="Prep Time" value={store.preparationTime != null ? `${store.preparationTime} min` : null} />
                  <InfoRow label="Min Order" value={store.minOrder != null ? `₦${store.minOrder.toLocaleString()}` : null} />
                  <InfoRow label="Delivery Fee" value={store.deliveryFee != null ? `₦${store.deliveryFee.toLocaleString()}` : null} />
                </InfoGrid>
              </div>
              {store.openingHours && store.openingHours.length > 0 && (
                <div className="border-t border-slate-100 px-6 py-5">
                  <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Opening Hours</p>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-1.5 sm:grid-cols-3 lg:grid-cols-4">
                    {store.openingHours.map((h) => {
                      const day = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][h.dayOfWeek]
                      return (
                        <div key={h.dayOfWeek} className="flex items-center justify-between gap-2 text-sm">
                          <span className="font-medium text-slate-700 w-8">{day}</span>
                          {h.isClosed
                            ? <span className="text-xs text-slate-400">Closed</span>
                            : <span className="text-slate-500">{h.openTime} – {h.closeTime}</span>
                          }
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center py-10">
              <p className="text-sm text-slate-400">No store created yet.</p>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: main info */}
          <div className="lg:col-span-2 space-y-6">
            <DetailCard title="Business Information">
              <InfoGrid>
                <InfoRow label="Business Name" value={vendor.businessName} />
                <InfoRow label="Type" value={vendor.businessType} />
                <InfoRow label="Email" value={vendor.businessEmail} />
                <InfoRow label="Phone" value={vendor.businessPhone} />
                <InfoRow label="Tax ID" value={vendor.taxId} />
                <InfoRow label="Prep Time" value={vendor.estimatedPrepTime != null ? `${vendor.estimatedPrepTime} min` : null} />
                <InfoRow label="Description" value={vendor.businessDescription} wide />
              </InfoGrid>
            </DetailCard>

            <DetailCard title="Location">
              <InfoGrid>
                <InfoRow label="Street" value={vendor.street} wide />
                <InfoRow label="City" value={vendor.city} />
                <InfoRow label="State" value={vendor.state} />
                <InfoRow label="Zip Code" value={vendor.zipCode} />
                <InfoRow label="Country" value={vendor.country} />
                {vendor.deliveryRadius != null && (
                  <InfoRow label="Delivery Radius" value={`${vendor.deliveryRadius} km`} />
                )}
              </InfoGrid>
            </DetailCard>

            <UserFinanceSection userId={vendor.userId} />
          </div>

          {/* Right: status + meta */}
          <div className="space-y-6">
            <DetailCard title="Status">
              <InfoGrid className="grid-cols-1">
                <InfoRow label="Verification" value={vendor.verificationStatus} />
                <InfoRow label="Onboarding" value={vendor.onboardingCompleted ? 'Completed' : 'Incomplete'} />
                <InfoRow label="Joined" value={new Date(vendor.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })} />
                <InfoRow label="Last Updated" value={new Date(vendor.updatedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })} />
              </InfoGrid>
            </DetailCard>

            {vendor.cuisineTypes.length > 0 && (
              <DetailCard title="Cuisine Types">
                <div className="flex flex-wrap gap-2">
                  {vendor.cuisineTypes.map((c) => (
                    <span key={c} className="rounded-full bg-orange-50 px-2.5 py-1 text-xs font-medium text-orange-700 ring-1 ring-inset ring-orange-600/20">{c}</span>
                  ))}
                </div>
              </DetailCard>
            )}
          </div>
        </div>

        <DetailCard title="Documents">
          <DocsGrid docs={vendor.documents} />
        </DetailCard>
      </div>

      {/* Edit Store modal */}
      <Modal open={showEditStore} onClose={() => setShowEditStore(false)} title="Edit Store" size="lg"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowEditStore(false)}>Cancel</Button>
            <Button size="sm" loading={isPending} onClick={handleEditStore}>Save Changes</Button>
          </>
        }
      >
        {storeFormError && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{storeFormError}</div>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Store Name</label>
            <input value={storeForm.name} onChange={(e) => sf('name', e.target.value)}
              className="w-full rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Description</label>
            <textarea value={storeForm.description} onChange={(e) => sf('description', e.target.value)} rows={3}
              className="w-full resize-none rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Address</label>
            <input value={storeForm.address} onChange={(e) => sf('address', e.target.value)}
              className="w-full rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Status</label>
            <select value={storeForm.status} onChange={(e) => sf('status', e.target.value as typeof storeForm.status)}
              className="w-full rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none">
              <option value="PENDING">Pending</option>
              <option value="ACTIVE">Active</option>
              <option value="SUSPENDED">Suspended</option>
              <option value="CLOSED_PERMANENTLY">Closed Permanently</option>
            </select>
          </div>
          <div className="flex items-center gap-3 pt-6">
            <button type="button" role="switch" aria-checked={storeForm.isOpen}
              onClick={() => sf('isOpen', !storeForm.isOpen)}
              className={cn('relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2', storeForm.isOpen ? 'bg-indigo-600' : 'bg-slate-200')}>
              <span className={cn('pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform', storeForm.isOpen ? 'translate-x-5' : 'translate-x-0')} />
            </button>
            <span className="text-sm font-medium text-slate-700">Store is Open</span>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Prep Time (min)</label>
            <input type="number" min={1} value={storeForm.preparationTime} onChange={(e) => sf('preparationTime', e.target.value)}
              className="w-full rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
          </div>
        </div>
      </Modal>

      {/* Reject modal */}
      <Modal open={showReject} onClose={() => setShowReject(false)} title="Reject Vendor" size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowReject(false)}>Cancel</Button>
            <Button variant="danger" size="sm" loading={isPending} onClick={handleReject}>Reject</Button>
          </>
        }
      >
        {actionError && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{actionError}</div>}
        <p className="mb-3 text-sm text-slate-600">Reject <span className="font-semibold text-slate-900">{vendor.businessName}</span>?</p>
        <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Reason (optional)</label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
          className="w-full resize-none rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
      </Modal>

      {/* Suspend modal */}
      <Modal open={showSuspend} onClose={() => setShowSuspend(false)} title="Suspend Vendor" size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowSuspend(false)}>Cancel</Button>
            <Button variant="danger" size="sm" loading={isPending} onClick={handleSuspend}>Suspend</Button>
          </>
        }
      >
        {actionError && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{actionError}</div>}
        <p className="mb-3 text-sm text-slate-600">Suspend <span className="font-semibold text-slate-900">{vendor.businessName}</span>?</p>
        <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Reason (optional)</label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3}
          className="w-full resize-none rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
      </Modal>
    </div>
  )
}
