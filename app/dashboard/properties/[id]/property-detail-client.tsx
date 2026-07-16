'use client'

import { useState, useTransition } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Modal } from '@/app/components/ui/modal'
import { Button } from '@/app/components/ui/button'
import { DetailCard, InfoRow, InfoGrid, Stars, formatDate } from '@/app/components/ui/detail'
import { ImageUploader } from '@/app/components/ui/image-uploader'
import { TagInput } from '@/app/components/ui/tag-input'
import { useToast } from '@/app/components/ui/toast'
import { cn } from '@/app/lib/utils'
import { updateProperty, publishProperty, suspendProperty } from '@/app/actions/properties'
import { PropertyRoomTypesSection } from './property-room-types'
import type { PropertyDetail, PropertyStatus, PropertyType, City } from '@/app/lib/types'

const STATUS_STYLES: Record<PropertyStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  PUBLISHED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  SUSPENDED: 'bg-red-50 text-red-700 ring-red-600/20',
}

const STATUS_DOT: Record<PropertyStatus, string> = {
  DRAFT: 'bg-slate-400',
  PUBLISHED: 'bg-emerald-500',
  SUSPENDED: 'bg-red-500',
}

const INPUT_CLS = 'w-full rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none'

interface Props {
  property: PropertyDetail
  propertyTypes: PropertyType[]
  cities: City[]
}

export function PropertyDetailClient({ property: initial, propertyTypes, cities }: Props) {
  const toast = useToast()
  const [property, setProperty] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const [showEdit, setShowEdit] = useState(false)
  const [actionError, setActionError] = useState('')

  const [editForm, setEditForm] = useState({
    name: property.name,
    propertyTypeId: property.propertyTypeId,
    description: property.description ?? '',
    address: property.address,
    cityId: property.city.id,
    lat: property.lat != null ? String(property.lat) : '',
    lng: property.lng != null ? String(property.lng) : '',
    checkInTime: property.checkInTime ?? '',
    checkOutTime: property.checkOutTime ?? '',
  })
  const [editImages, setEditImages] = useState<string[]>(property.images)
  const [editAmenities, setEditAmenities] = useState<string[]>(property.amenities)
  const [editError, setEditError] = useState('')

  function ef<K extends keyof typeof editForm>(k: K, v: (typeof editForm)[K]) {
    setEditForm((f) => ({ ...f, [k]: v }))
  }

  function patch(p: Partial<PropertyDetail>) { setProperty((pr) => ({ ...pr, ...p })) }

  function openEdit() {
    setEditForm({
      name: property.name,
      propertyTypeId: property.propertyTypeId,
      description: property.description ?? '',
      address: property.address,
      cityId: property.city.id,
      lat: property.lat != null ? String(property.lat) : '',
      lng: property.lng != null ? String(property.lng) : '',
      checkInTime: property.checkInTime ?? '',
      checkOutTime: property.checkOutTime ?? '',
    })
    setEditImages(property.images)
    setEditAmenities(property.amenities)
    setEditError('')
    setShowEdit(true)
  }

  function handleEdit() {
    startTransition(async () => {
      setEditError('')
      const res = await updateProperty(property.id, {
        propertyTypeId: editForm.propertyTypeId,
        name: editForm.name.trim(),
        description: editForm.description.trim() || undefined,
        address: editForm.address.trim(),
        cityId: editForm.cityId,
        lat: editForm.lat ? Number(editForm.lat) : undefined,
        lng: editForm.lng ? Number(editForm.lng) : undefined,
        images: editImages,
        image: editImages[0],
        amenities: editAmenities,
        checkInTime: editForm.checkInTime || undefined,
        checkOutTime: editForm.checkOutTime || undefined,
      })
      if (res.error) { setEditError(res.error); toast.error(res.error); return }
      if (res.property) patch(res.property)
      setShowEdit(false)
      toast.success('Property updated.')
    })
  }

  function handlePublish() {
    startTransition(async () => {
      setActionError('')
      const res = await publishProperty(property.id)
      if (res.error) { setActionError(res.error); toast.error(res.error); return }
      if (res.property) patch(res.property)
      toast.success('Property published.')
    })
  }

  function handleSuspend() {
    startTransition(async () => {
      setActionError('')
      const res = await suspendProperty(property.id)
      if (res.error) { setActionError(res.error); toast.error(res.error); return }
      if (res.property) patch(res.property)
      toast.success('Property suspended.')
    })
  }

  return (
    <div className="min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-8 py-4">
        <Link href="/dashboard/properties" className="mb-3 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors w-fit">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
          </svg>
          Properties
        </Link>
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl bg-slate-100">
              {property.image ? (
                <Image src={property.image} alt={property.name} fill className="object-cover" unoptimized />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-violet-100 text-base font-bold text-violet-700">
                  {property.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl font-bold text-slate-900 truncate">{property.name}</h1>
                <span className={cn('inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', STATUS_STYLES[property.status])}>
                  <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[property.status])} />
                  {property.status}
                </span>
              </div>
              <p className="text-sm text-slate-500">{property.propertyType} · {property.city.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="secondary" size="sm" onClick={openEdit}>Edit</Button>
            {property.status === 'DRAFT' && (
              <Button size="sm" loading={isPending} onClick={handlePublish}>Publish</Button>
            )}
            {property.status === 'PUBLISHED' && (
              <Button variant="danger" size="sm" loading={isPending} onClick={handleSuspend}>Suspend</Button>
            )}
          </div>
        </div>
        {actionError && <p className="mt-2 text-sm text-red-600">{actionError}</p>}
      </div>

      {/* Content */}
      <div className="px-8 py-6 space-y-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <DetailCard title="Basic Info">
              <InfoGrid>
                <InfoRow label="Property Type" value={property.propertyType} />
                <InfoRow label="Slug" value={property.slug} />
              </InfoGrid>
              {property.description && (
                <p className="mt-3 text-sm text-slate-600 leading-relaxed">{property.description}</p>
              )}
            </DetailCard>

            <DetailCard title="Location">
              <InfoGrid>
                <InfoRow label="Address" value={property.address} wide />
                <InfoRow label="City" value={`${property.city.name}, ${property.city.state}`} />
                <InfoRow label="Coordinates" value={property.lat != null && property.lng != null ? `${property.lat}, ${property.lng}` : null} />
              </InfoGrid>
            </DetailCard>

            {property.amenities.length > 0 && (
              <DetailCard title="Amenities">
                <div className="flex flex-wrap gap-2">
                  {property.amenities.map((a) => (
                    <span key={a} className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">{a}</span>
                  ))}
                </div>
              </DetailCard>
            )}

            {property.images.length > 0 && (
              <DetailCard title="Gallery">
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {property.images.map((url, idx) => (
                    <div key={url + idx} className="relative aspect-square overflow-hidden rounded-xl bg-slate-100">
                      <Image src={url} alt="" fill className="object-cover" unoptimized />
                    </div>
                  ))}
                </div>
              </DetailCard>
            )}

            <PropertyRoomTypesSection propertyId={property.id} initialRoomTypes={property.roomTypes} />
          </div>

          <div className="space-y-6">
            <DetailCard title="Stats">
              <InfoGrid className="grid-cols-1">
                <div>
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Rating</dt>
                  <dd className="mt-1"><Stars rating={property.rating} /></dd>
                </div>
                <InfoRow label="Total Reviews" value={property.totalReviews} />
                <InfoRow label="Room Types" value={property.roomTypes.length} />
              </InfoGrid>
            </DetailCard>

            <DetailCard title="Check-in / Check-out">
              <InfoGrid className="grid-cols-1">
                <InfoRow label="Check-in" value={property.checkInTime} />
                <InfoRow label="Check-out" value={property.checkOutTime} />
              </InfoGrid>
            </DetailCard>

            <DetailCard title="Status">
              <InfoGrid className="grid-cols-1">
                <InfoRow label="Created" value={formatDate(property.createdAt)} />
                <InfoRow label="Last Updated" value={formatDate(property.updatedAt)} />
              </InfoGrid>
            </DetailCard>
          </div>
        </div>
      </div>

      {/* Edit modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Edit Property" size="lg"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button size="sm" loading={isPending} onClick={handleEdit}>Save Changes</Button>
          </>
        }
      >
        {editError && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{editError}</div>}
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Name</label>
            <input value={editForm.name} onChange={(e) => ef('name', e.target.value)} className={INPUT_CLS} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Property Type</label>
              <select value={editForm.propertyTypeId} onChange={(e) => ef('propertyTypeId', e.target.value)} className={INPUT_CLS}>
                {propertyTypes.map((t) => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-slate-700">City</label>
              <select value={editForm.cityId} onChange={(e) => ef('cityId', e.target.value)} className={INPUT_CLS}>
                {cities.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}, {c.state}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Description</label>
            <textarea value={editForm.description} onChange={(e) => ef('description', e.target.value)} rows={3}
              className={cn(INPUT_CLS, 'resize-none')} />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Address</label>
            <input value={editForm.address} onChange={(e) => ef('address', e.target.value)} className={INPUT_CLS} />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Latitude</label>
              <input type="number" step="any" value={editForm.lat} onChange={(e) => ef('lat', e.target.value)} className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Longitude</label>
              <input type="number" step="any" value={editForm.lng} onChange={(e) => ef('lng', e.target.value)} className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Check-in time</label>
              <input type="time" value={editForm.checkInTime} onChange={(e) => ef('checkInTime', e.target.value)} className={INPUT_CLS} />
            </div>
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Check-out time</label>
              <input type="time" value={editForm.checkOutTime} onChange={(e) => ef('checkOutTime', e.target.value)} className={INPUT_CLS} />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Amenities</label>
            <TagInput value={editAmenities} onChange={setEditAmenities} placeholder="e.g. Swimming Pool, then press Enter…" />
          </div>
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Images</label>
            <ImageUploader value={editImages} onChange={setEditImages} maxImages={10} category="general" />
          </div>
        </div>
      </Modal>
    </div>
  )
}
