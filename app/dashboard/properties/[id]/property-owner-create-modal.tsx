'use client'

import { useCallback, useRef, useState, useTransition } from 'react'
import { createPropertyOwnerForProperty } from '@/app/actions/properties'
import { uploadImage } from '@/app/actions/uploads'
import { Button } from '@/app/components/ui/button'
import { Modal } from '@/app/components/ui/modal'
import { useToast } from '@/app/components/ui/toast'
import { cn } from '@/app/lib/utils'
import type { PropertyDetail } from '@/app/lib/types'
import { GoogleLocationPicker, type SelectedPropertyOwnerLocation } from './google-location-picker'

const INPUT = 'w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20'
const LABEL = 'mb-1.5 block text-xs font-semibold text-slate-700'

interface FormState {
  email: string
  firstName: string
  lastName: string
  phone: string
  businessName: string
  businessPhone: string
  businessEmail: string
  businessDescription: string
  street: string
  city: string
  state: string
  country: string
  latitude: string
  longitude: string
}

type RequiredField = 'email' | 'firstName' | 'lastName' | 'businessName' | 'businessPhone' | 'businessEmail' | 'city' | 'state' | 'country' | 'latitude' | 'longitude'
type DocumentKey = 'businessLicenseFile' | 'idDocumentFile' | 'propertyOwnershipDocFile'

function DocumentUpload({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (url: string) => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  function upload(file: File) {
    const data = new FormData()
    data.append('file', file)
    setUploading(true)
    setError('')
    uploadImage(data, 'general').then((result) => {
      setUploading(false)
      if (result.error) {
        setError(result.error)
        return
      }
      onChange(result.url!)
    })
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) upload(file)
          event.target.value = ''
        }}
      />
      <p className="text-xs font-medium text-slate-700">{label}</p>
      <button
        type="button"
        disabled={uploading}
        onClick={() => inputRef.current?.click()}
        className="mt-2 text-xs font-semibold text-indigo-600 hover:underline disabled:opacity-60"
      >
        {uploading ? 'Uploading…' : value ? 'Replace file' : 'Upload file'}
      </button>
      {value && <span className="ml-2 text-xs font-medium text-emerald-600">Uploaded</span>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  )
}

export function PropertyOwnerCreateModal({
  property,
  googleMapsApiKey,
  open,
  onClose,
  onCreated,
}: {
  property: PropertyDetail
  googleMapsApiKey: string
  open: boolean
  onClose: () => void
  onCreated: (property: PropertyDetail) => void
}) {
  const toast = useToast()
  const [pending, startTransition] = useTransition()
  const [form, setForm] = useState<FormState>({
    email: '',
    firstName: '',
    lastName: '',
    phone: '',
    businessName: '',
    businessPhone: '',
    businessEmail: '',
    businessDescription: '',
    street: property.address ?? '',
    city: property.city?.name ?? '',
    state: property.city?.state ?? '',
    country: 'Nigeria',
    latitude: property.lat != null ? String(property.lat) : '',
    longitude: property.lng != null ? String(property.lng) : '',
  })
  const [documents, setDocuments] = useState<Partial<Record<DocumentKey, string>>>({})
  const [errors, setErrors] = useState<Partial<Record<RequiredField, string>>>({})
  const [submitError, setSubmitError] = useState('')

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((current) => ({ ...current, [key]: value }))
    setErrors((current) => ({ ...current, [key]: undefined }))
  }

  const handleLocationSelect = useCallback((location: SelectedPropertyOwnerLocation) => {
    setForm((current) => ({
      ...current,
      street: location.street || location.address,
      city: location.city || current.city,
      state: location.state || current.state,
      country: 'Nigeria',
      latitude: String(location.latitude),
      longitude: String(location.longitude),
    }))
    setErrors((current) => ({ ...current, city: undefined, state: undefined, latitude: undefined, longitude: undefined }))
  }, [])

  function validate() {
    const next: Partial<Record<RequiredField, string>> = {}
    const required: RequiredField[] = ['email', 'firstName', 'lastName', 'businessName', 'businessPhone', 'businessEmail', 'city', 'state', 'country', 'latitude', 'longitude']
    for (const key of required) {
      if (!form[key].trim()) next[key] = 'Required'
    }
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'Invalid email'
    if (form.businessEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.businessEmail)) next.businessEmail = 'Invalid email'
    if (form.latitude && !Number.isFinite(Number(form.latitude))) next.latitude = 'Enter a valid number'
    if (form.longitude && !Number.isFinite(Number(form.longitude))) next.longitude = 'Enter a valid number'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit() {
    setSubmitError('')
    if (!validate()) return

    startTransition(async () => {
      const result = await createPropertyOwnerForProperty(property.id, {
        user: {
          email: form.email.trim(),
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
        },
        propertyOwner: {
          businessName: form.businessName.trim(),
          businessPhone: form.businessPhone.trim(),
          businessEmail: form.businessEmail.trim(),
          ...(form.businessDescription.trim() ? { businessDescription: form.businessDescription.trim() } : {}),
          address: {
            ...(form.street.trim() ? { street: form.street.trim() } : {}),
            city: form.city.trim(),
            state: form.state.trim(),
            country: 'Nigeria',
            latitude: Number(form.latitude),
            longitude: Number(form.longitude),
          },
          ...(Object.keys(documents).length > 0 ? { documents } : {}),
        },
      })
      if (result.error) {
        setSubmitError(result.error)
        toast.error(result.error)
        return
      }
      if (!result.property) {
        const error = 'Property owner created, but the updated property could not be loaded.'
        setSubmitError(error)
        toast.error(error)
        return
      }
      onCreated(result.property)
      toast.success('Property owner created and assigned.')
      onClose()
    })
  }

  function field(key: keyof FormState, label: string, options?: { required?: boolean; type?: string }) {
    const error = errors[key as RequiredField]
    return (
      <div>
        <label className={LABEL}>{label} {options?.required && <span className="text-red-500">*</span>}</label>
        <input
          type={options?.type ?? 'text'}
          step={options?.type === 'number' ? 'any' : undefined}
          value={form[key]}
          onChange={(event) => set(key, event.target.value)}
          className={cn(INPUT, error ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50')}
        />
        {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
      </div>
    )
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Create Property Owner"
      description={`Create an owner account and assign it to ${property.name}.`}
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" disabled={pending} onClick={onClose}>Cancel</Button>
          <Button size="sm" loading={pending} onClick={handleSubmit}>Create & Assign</Button>
        </>
      }
    >
      <div className="space-y-6">
        {submitError && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{submitError}</p>}

        <section>
          <h3 className="mb-3 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-800">User Account</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {field('firstName', 'First Name', { required: true })}
            {field('lastName', 'Last Name', { required: true })}
            {field('email', 'Email', { required: true, type: 'email' })}
            {field('phone', 'Phone')}
          </div>
        </section>

        <section>
          <h3 className="mb-3 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-800">Business</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {field('businessName', 'Business Name', { required: true })}
            {field('businessPhone', 'Business Phone', { required: true })}
            {field('businessEmail', 'Business Email', { required: true, type: 'email' })}
            <div className="sm:col-span-2">
              <label className={LABEL}>Business Description</label>
              <textarea
                rows={3}
                value={form.businessDescription}
                onChange={(event) => set('businessDescription', event.target.value)}
                className={cn(INPUT, 'resize-none border-slate-200 bg-slate-50')}
              />
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-3 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-800">Address</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">{field('street', 'Street')}</div>
            {field('city', 'City', { required: true })}
            {field('state', 'State', { required: true })}
            <div className="sm:col-span-2">
              <label className={LABEL}>Country</label>
              <input value="Nigeria" readOnly className={cn(INPUT, 'cursor-not-allowed border-slate-200 bg-slate-100 text-slate-500')} />
            </div>
            <div className="sm:col-span-2">
              <label className={LABEL}>Location <span className="text-red-500">*</span></label>
              <GoogleLocationPicker
                apiKey={googleMapsApiKey}
                latitude={form.latitude ? Number(form.latitude) : null}
                longitude={form.longitude ? Number(form.longitude) : null}
                onSelect={handleLocationSelect}
                error={errors.latitude || errors.longitude}
              />
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-3 border-b border-slate-100 pb-2 text-sm font-semibold text-slate-800">Documents</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <DocumentUpload label="Business License" value={documents.businessLicenseFile ?? ''} onChange={(url) => setDocuments((current) => ({ ...current, businessLicenseFile: url }))} />
            <DocumentUpload label="Identity Document" value={documents.idDocumentFile ?? ''} onChange={(url) => setDocuments((current) => ({ ...current, idDocumentFile: url }))} />
            <DocumentUpload label="Ownership Document" value={documents.propertyOwnershipDocFile ?? ''} onChange={(url) => setDocuments((current) => ({ ...current, propertyOwnershipDocFile: url }))} />
          </div>
        </section>
      </div>
    </Modal>
  )
}
