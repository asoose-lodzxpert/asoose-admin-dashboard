'use client'

import Image from 'next/image'
import { useState, useEffect, useTransition } from 'react'
import Link from 'next/link'
import { Modal } from '@/app/components/ui/modal'
import { Button } from '@/app/components/ui/button'
import { DetailCard, InfoRow, InfoGrid } from '@/app/components/ui/detail'
import { DocumentsSection, type DocumentField } from '@/app/components/ui/documents-section'
import { VendorMenuSection } from './vendor-menu'
import { VendorProductsSection } from './vendor-products'
import { cn } from '@/app/lib/utils'
import { approveVendor, rejectVendor, suspendVendor, updateVendorStore, updateVendorDocuments } from '@/app/actions/vendors'
import { uploadImage } from '@/app/actions/uploads'
import { updateStorefrontBranding } from '@/app/actions/catalog'
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

function Toast({ msg, ok, onDismiss }: { msg: string; ok: boolean; onDismiss: () => void }) {
  return (
    <div
      onClick={onDismiss}
      className={cn(
        'fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium shadow-lg cursor-pointer',
        ok ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
      )}
    >
      {ok ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0">
          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0">
          <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
        </svg>
      )}
      {msg}
    </div>
  )
}

type Tab = 'overview' | 'products' | 'menu'

const VENDOR_DOCUMENT_FIELDS: DocumentField[] = [
  { key: 'businessLicenseFile', label: 'Business License', clearable: true },
  { key: 'foodPermitFile',      label: 'Food Permit',      clearable: true },
  { key: 'taxDocumentFile',     label: 'Tax Document',     clearable: true },
  { key: 'idDocumentFile',      label: 'ID Document',      clearable: true },
]

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
  const [showBranding, setShowBranding] = useState(false)
  const [brandingPending, setBrandingPending] = useState(false)
  const [reason, setReason] = useState('')
  const [actionError, setActionError] = useState('')
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

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

  async function handleBrandingUpload(field: 'logo' | 'banner', file: File) {
    setBrandingPending(true)
    try {
      const fd = new FormData(); fd.append('file', file)
      const up = await uploadImage(fd, 'general')
      if (up.error) { setToast({ msg: up.error, ok: false }); return }
      const res = await updateStorefrontBranding(store!.id, { [field]: up.url })
      if (res.error) { setToast({ msg: res.error, ok: false }); return }
      patch({ store: { ...vendor.store!, logo: res.data!.logo, banner: res.data!.banner } as VendorStoreDetail })
      setToast({ msg: 'Branding updated successfully', ok: true })
    } finally {
      setBrandingPending(false)
    }
  }

  async function handleBrandingRemove(field: 'logo' | 'banner') {
    setBrandingPending(true)
    try {
      const res = await updateStorefrontBranding(store!.id, { [field]: null })
      if (res.error) { setToast({ msg: res.error, ok: false }); return }
      patch({ store: { ...vendor.store!, logo: res.data!.logo, banner: res.data!.banner } as VendorStoreDetail })
      setToast({ msg: `${field === 'logo' ? 'Logo' : 'Banner'} removed`, ok: true })
    } finally {
      setBrandingPending(false)
    }
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
          <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900">Store</h2>
            {store && (
              <Button variant="secondary" size="sm" onClick={() => setShowBranding(true)}>Branding</Button>
            )}
          </div>
          {store ? (
            <>
              {/* Banner */}
              <div className="relative w-full h-52">
                {/* Banner image — own overflow-hidden so it doesn't clip the logo */}
                <div className="absolute inset-0 overflow-hidden bg-linear-to-br from-slate-100 via-slate-200 to-indigo-100">
                  {store.banner ? (
                    <Image src={store.banner} alt="Store banner" fill className="object-cover" unoptimized />
                  ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8 text-slate-300">
                        <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 0 1 2.25-2.25h16.5A2.25 2.25 0 0 1 22.5 6v12a2.25 2.25 0 0 1-2.25 2.25H3.75A2.25 2.25 0 0 1 1.5 18V6ZM3 16.06V18c0 .414.336.75.75.75h16.5a.75.75 0 0 0 .75-.75v-2.69l-2.69-2.689a1.5 1.5 0 0 0-2.12 0l-2.5 2.5-1.4-1.401a1.5 1.5 0 0 0-2.12 0L3 16.061Zm10.125-7.81a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Z" clipRule="evenodd" />
                      </svg>
                      <p className="text-xs text-slate-400">No banner uploaded</p>
                    </div>
                  )}
                  {/* Gradient scrim at bottom for logo contrast */}
                  <div className="absolute inset-x-0 bottom-0 h-16 bg-linear-to-t from-black/30 to-transparent" />
                </div>
                {/* Logo — outside the overflow-hidden layer so it can spill below */}
                <div className="absolute bottom-0 left-6 translate-y-1/2 z-10">
                  {store.logo ? (
                    <div className="relative h-20 w-20 overflow-hidden rounded-2xl border-[3px] border-white shadow-xl bg-white">
                      <Image src={store.logo} alt="Store logo" fill className="object-cover" unoptimized />
                    </div>
                  ) : (
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl border-[3px] border-white shadow-xl bg-indigo-100 text-2xl font-bold text-indigo-700">{initials}</div>
                  )}
                </div>
              </div>

              {/* Name + meta row below banner */}
              <div className="px-6 pt-14 pb-3 flex items-end justify-between gap-4">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 leading-tight">{store.name}</h3>
                  <p className="mt-0.5 text-xs text-slate-400 font-mono">{store.slug}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0 pb-0.5">
                  <span className={cn(
                    'inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset',
                    store.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
                    : store.status === 'SUSPENDED' ? 'bg-red-50 text-red-700 ring-red-600/20'
                    : store.status === 'CLOSED_PERMANENTLY' ? 'bg-slate-100 text-slate-500 ring-slate-500/20'
                    : 'bg-amber-50 text-amber-700 ring-amber-600/20'
                  )}>{store.status}</span>
                  {store.isOpen && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Open
                    </span>
                  )}
                </div>
              </div>

              {/* Store detail grid */}
              <div className="px-6 pb-5">
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
          <DocumentsSection
            fields={VENDOR_DOCUMENT_FIELDS}
            documents={vendor.documents}
            patchDocuments={async (changes) => {
              const res = await updateVendorDocuments(vendor.id, changes)
              if (res.error) return { error: res.error }
              return { data: res.data as Record<string, string | null | boolean> }
            }}
            onUpdate={(docs) => patch({ documents: docs as VendorDetail['documents'] })}
          />
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

      {/* Branding modal */}
      <Modal open={showBranding} onClose={() => setShowBranding(false)} title="Storefront Branding" size="md">
        <div className="space-y-6">
          {/* Banner */}
          <div>
            <p className="mb-2 text-[13px] font-medium text-slate-700">Banner</p>
            <div className="relative h-28 w-full overflow-hidden rounded-xl bg-slate-100">
              {store?.banner ? (
                <Image src={store.banner} alt="Banner" fill className="object-cover" unoptimized />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <p className="text-xs text-slate-400">No banner</p>
                </div>
              )}
            </div>
            <div className="mt-2 flex gap-2">
              <label className={cn(
                'inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors',
                brandingPending && 'pointer-events-none opacity-50'
              )}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleBrandingUpload('banner', f)
                    e.target.value = ''
                  }}
                />
                {brandingPending ? 'Uploading…' : store?.banner ? 'Replace Banner' : 'Upload Banner'}
              </label>
              {store?.banner && (
                <Button variant="secondary" size="sm" disabled={brandingPending} onClick={() => handleBrandingRemove('banner')}>
                  Remove
                </Button>
              )}
            </div>
          </div>

          {/* Logo */}
          <div>
            <p className="mb-2 text-[13px] font-medium text-slate-700">Logo</p>
            <div className="relative h-16 w-16 overflow-hidden rounded-2xl bg-slate-100">
              {store?.logo ? (
                <Image src={store.logo} alt="Logo" fill className="object-cover" unoptimized />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-sm font-bold text-slate-300">{initials}</div>
              )}
            </div>
            <div className="mt-2 flex gap-2">
              <label className={cn(
                'inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 transition-colors',
                brandingPending && 'pointer-events-none opacity-50'
              )}>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic"
                  className="sr-only"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleBrandingUpload('logo', f)
                    e.target.value = ''
                  }}
                />
                {brandingPending ? 'Uploading…' : store?.logo ? 'Replace Logo' : 'Upload Logo'}
              </label>
              {store?.logo && (
                <Button variant="secondary" size="sm" disabled={brandingPending} onClick={() => handleBrandingRemove('logo')}>
                  Remove
                </Button>
              )}
            </div>
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

      {toast && <Toast msg={toast.msg} ok={toast.ok} onDismiss={() => setToast(null)} />}
    </div>
  )
}
