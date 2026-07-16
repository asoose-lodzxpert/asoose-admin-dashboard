'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/app/lib/utils'
import { ImageUploader } from '@/app/components/ui/image-uploader'
import { TagInput } from '@/app/components/ui/tag-input'
import { Button } from '@/app/components/ui/button'
import { useToast } from '@/app/components/ui/toast'
import { createProperty } from '@/app/actions/properties'
import type { PropertyType, City } from '@/app/lib/types'

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-1.5 border-b border-slate-100">{children}</h3>
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="mt-1 text-xs text-red-500">{msg}</p>
}

function Input({ label, required, error, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string; required?: boolean; error?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        {...props}
        className={cn(
          'w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',
          error ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'
        )}
      />
      <FieldError msg={error} />
    </div>
  )
}

interface Form {
  name: string
  propertyTypeId: string
  description: string
  address: string
  cityId: string
  lat: string
  lng: string
  checkInTime: string
  checkOutTime: string
}

const INIT_FORM: Form = {
  name: '', propertyTypeId: '', description: '', address: '', cityId: '',
  lat: '', lng: '', checkInTime: '15:00', checkOutTime: '11:00',
}

export function PropertyCreateClient({ propertyTypes, cities }: { propertyTypes: PropertyType[]; cities: City[] }) {
  const router = useRouter()
  const toast = useToast()
  const [form, setForm] = useState<Form>(INIT_FORM)
  const [images, setImages] = useState<string[]>([])
  const [amenities, setAmenities] = useState<string[]>([])
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({})
  const [submitError, setSubmitError] = useState('')
  const [isPending, startTransition] = useTransition()

  function set<K extends keyof Form>(k: K, v: Form[K]) {
    setForm((f) => ({ ...f, [k]: v }))
  }

  function validate(): boolean {
    const next: Partial<Record<keyof Form, string>> = {}
    if (!form.name.trim()) next.name = 'Name is required'
    if (!form.propertyTypeId) next.propertyTypeId = 'Property type is required'
    if (!form.address.trim()) next.address = 'Address is required'
    if (!form.cityId) next.cityId = 'City is required'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit() {
    setSubmitError('')
    if (!validate()) return

    const payload: Record<string, unknown> = {
      propertyTypeId: form.propertyTypeId,
      name: form.name.trim(),
      address: form.address.trim(),
      cityId: form.cityId,
    }
    if (form.description.trim()) payload.description = form.description.trim()
    if (form.lat) payload.lat = Number(form.lat)
    if (form.lng) payload.lng = Number(form.lng)
    if (images.length > 0) { payload.images = images; payload.image = images[0] }
    if (amenities.length > 0) payload.amenities = amenities
    if (form.checkInTime) payload.checkInTime = form.checkInTime
    if (form.checkOutTime) payload.checkOutTime = form.checkOutTime

    startTransition(async () => {
      const res = await createProperty(payload)
      if (res.error) { setSubmitError(res.error); toast.error(res.error); return }
      toast.success('Property created.')
      router.push(`/dashboard/properties/${res.property!.id}`)
    })
  }

  return (
    <main className="mx-auto max-w-3xl px-8 py-8">
      <Link href="/dashboard/properties" className="mb-3 flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors w-fit">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
          <path fillRule="evenodd" d="M11.78 5.22a.75.75 0 0 1 0 1.06L8.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06l-4.25-4.25a.75.75 0 0 1 0-1.06l4.25-4.25a.75.75 0 0 1 1.06 0Z" clipRule="evenodd" />
        </svg>
        Properties
      </Link>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">New Property</h1>
        <p className="mt-0.5 text-sm text-slate-500">Properties are created as a draft — publish once room types are added.</p>
      </div>

      {submitError && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{submitError}</div>
      )}

      <div className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <SectionLabel>Basic Info</SectionLabel>
          <Input label="Name" required placeholder="The Grand Boutique Hotel" value={form.name} onChange={(e) => set('name', e.target.value)} error={errors.name} />
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Property type <span className="text-red-500">*</span></label>
            <div className="relative">
              <select
                value={form.propertyTypeId}
                onChange={(e) => set('propertyTypeId', e.target.value)}
                className={cn('w-full appearance-none rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer',
                  !form.propertyTypeId ? 'text-slate-400' : 'text-slate-900',
                  errors.propertyTypeId ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50')}
              >
                <option value="" disabled>{propertyTypes.length === 0 ? 'Loading…' : 'Select type…'}</option>
                {propertyTypes.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
                <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </div>
            <FieldError msg={errors.propertyTypeId} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description</label>
            <textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              rows={3}
              placeholder="Brief description of the property…"
              className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <SectionLabel>Location</SectionLabel>
          <Input label="Address" required placeholder="45 Gana Street, Maitama, Abuja" value={form.address} onChange={(e) => set('address', e.target.value)} error={errors.address} />
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">City <span className="text-red-500">*</span></label>
            <div className="relative">
              <select
                value={form.cityId}
                onChange={(e) => set('cityId', e.target.value)}
                className={cn('w-full appearance-none rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer',
                  !form.cityId ? 'text-slate-400' : 'text-slate-900',
                  errors.cityId ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50')}
              >
                <option value="" disabled>{cities.length === 0 ? 'Loading…' : 'Select city…'}</option>
                {cities.map((c) => <option key={c.id} value={c.id}>{c.name}, {c.state}</option>)}
              </select>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
                <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </div>
            <FieldError msg={errors.cityId} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Latitude (optional)" type="number" step="any" placeholder="9.082" value={form.lat} onChange={(e) => set('lat', e.target.value)} />
            <Input label="Longitude (optional)" type="number" step="any" placeholder="7.4951" value={form.lng} onChange={(e) => set('lng', e.target.value)} />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <SectionLabel>Media</SectionLabel>
          <ImageUploader value={images} onChange={setImages} maxImages={10} category="general" />
          {images.length > 0 && (
            <p className="text-[11px] text-slate-400">First image is used as the main thumbnail.</p>
          )}
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <SectionLabel>Amenities</SectionLabel>
          <TagInput value={amenities} onChange={setAmenities} placeholder="e.g. Swimming Pool, then press Enter…" />
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <SectionLabel>Check-in / Check-out</SectionLabel>
          <div className="grid grid-cols-2 gap-4">
            <Input label="Check-in time" type="time" value={form.checkInTime} onChange={(e) => set('checkInTime', e.target.value)} />
            <Input label="Check-out time" type="time" value={form.checkOutTime} onChange={(e) => set('checkOutTime', e.target.value)} />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/dashboard/properties">
            <Button variant="secondary">Cancel</Button>
          </Link>
          <Button loading={isPending} onClick={handleSubmit}>Create Property</Button>
        </div>
      </div>
    </main>
  )
}
