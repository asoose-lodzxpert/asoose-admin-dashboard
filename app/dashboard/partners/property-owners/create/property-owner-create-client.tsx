'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/app/lib/utils'
import { useToast } from '@/app/components/ui/toast'
import { uploadImage } from '@/app/actions/uploads'
import {
  adminProvisionPropertyOwner,
  getBanks,
  resolveBankAccount,
} from '@/app/actions/partner-provision'
import type { AdminProvisionResult } from '@/app/actions/partner-provision'
import type { City } from '@/app/lib/types'

interface AccountForm { firstName: string; lastName: string; email: string; phone: string }
interface OwnerForm {
  businessName: string
  businessDescription: string
  businessPhone: string
  businessEmail: string
  cityId: string
  street: string
  addressCity: string
  addressState: string
  zipCode: string
  country: string
  latitude: string
  longitude: string
  accountNumber: string
  accountName: string
}

const INIT_ACCOUNT: AccountForm = { firstName: '', lastName: '', email: '', phone: '' }
const INIT_OWNER: OwnerForm = {
  businessName: '', businessDescription: '', businessPhone: '', businessEmail: '', cityId: '',
  street: '', addressCity: '', addressState: '', zipCode: '', country: 'Nigeria',
  latitude: '', longitude: '', accountNumber: '', accountName: '',
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null
  return <p className="mt-1 text-xs text-red-500">{msg}</p>
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold text-slate-700 mb-3 pb-1.5 border-b border-slate-100">{children}</h3>
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

function DocUploadField({ label, value, onChange }: { label: string; value: string; onChange: (url: string) => void }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  function handleFile(file: File) {
    setError('')
    setPending(true)
    const fd = new FormData()
    fd.append('file', file)
    uploadImage(fd, 'general').then((r) => {
      setPending(false)
      if (r.error) { setError(r.error); return }
      onChange(r.url!)
    })
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">{label}</label>
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="sr-only"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = '' }}
      />
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-600 hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Uploading…' : value ? 'Replace file' : 'Upload file'}
        </button>
        {value && !pending && (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-indigo-600 hover:underline">
            View uploaded file
          </a>
        )}
      </div>
      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  )
}

function BankCombobox({
  banks,
  selectedBank,
  onSelect,
  error,
}: {
  banks: { name: string; code: string }[]
  selectedBank: { name: string; code: string } | null
  onSelect: (bank: { name: string; code: string }) => void
  error?: string
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const filtered = query.length > 0
    ? banks.filter((b) => b.name.toLowerCase().includes(query.toLowerCase()))
    : banks

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
        Bank <span className="text-red-500">*</span>
      </label>
      <input
        type="text"
        placeholder={banks.length === 0 ? 'Loading banks…' : 'Search bank…'}
        value={open ? query : (selectedBank?.name ?? '')}
        onFocus={() => { setOpen(true); setQuery('') }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        className={cn(
          'w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',
          error ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'
        )}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {filtered.map((b) => (
            <button
              key={b.code}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); onSelect(b); setQuery(''); setOpen(false) }}
              className="w-full px-3.5 py-2 text-left text-sm text-slate-800 hover:bg-indigo-50 flex justify-between"
            >
              <span>{b.name}</span>
              <span className="text-xs text-slate-400 font-mono">{b.code}</span>
            </button>
          ))}
        </div>
      )}
      <FieldError msg={error} />
    </div>
  )
}

export function PropertyOwnerCreateClient({ cities }: { cities: City[] }) {
  const router = useRouter()
  const toast = useToast()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [account, setAccount] = useState<AccountForm>(INIT_ACCOUNT)
  const [owner, setOwner] = useState<OwnerForm>(INIT_OWNER)
  const [accountErrors, setAccountErrors] = useState<Partial<AccountForm>>({})
  const [ownerErrors, setOwnerErrors] = useState<Partial<Record<keyof OwnerForm | 'bank', string>>>({})
  const [serverError, setServerError] = useState('')
  const [result, setResult] = useState<AdminProvisionResult | null>(null)
  const [isPending, startTransition] = useTransition()

  const [banks, setBanks] = useState<{ name: string; code: string }[]>([])
  const [selectedBank, setSelectedBank] = useState<{ name: string; code: string } | null>(null)
  const [verifyingAccount, setVerifyingAccount] = useState(false)
  const [accountVerifyError, setAccountVerifyError] = useState('')

  const [businessLicenseFile, setBusinessLicenseFile] = useState('')
  const [idDocumentFile, setIdDocumentFile] = useState('')
  const [propertyOwnershipDocFile, setPropertyOwnershipDocFile] = useState('')

  useEffect(() => {
    getBanks().then((r) => { if (r.data) setBanks(r.data) })
  }, [])

  useEffect(() => {
    if (!/^\d{10}$/.test(owner.accountNumber) || !selectedBank) return
    setVerifyingAccount(true)
    setAccountVerifyError('')
    resolveBankAccount(owner.accountNumber, selectedBank.code).then((r) => {
      setVerifyingAccount(false)
      if (r.data) setO('accountName', r.data.accountName)
      else setAccountVerifyError(r.error ?? 'Could not verify account')
    })
  }, [owner.accountNumber, selectedBank])

  function setA(k: keyof AccountForm, v: string) { setAccount((p) => ({ ...p, [k]: v })) }
  function setO(k: keyof OwnerForm, v: string) { setOwner((p) => ({ ...p, [k]: v })) }

  function validateAccount(): boolean {
    const errs: Partial<AccountForm> = {}
    if (!account.firstName.trim()) errs.firstName = 'Required'
    if (!account.lastName.trim()) errs.lastName = 'Required'
    if (!account.email.trim()) errs.email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email)) errs.email = 'Invalid email'
    setAccountErrors(errs)
    return Object.keys(errs).length === 0
  }

  function validateOwner(): boolean {
    const errs: Partial<Record<keyof OwnerForm | 'bank', string>> = {}
    if (!owner.businessName.trim()) errs.businessName = 'Required'
    if (!owner.businessPhone.trim()) errs.businessPhone = 'Required'
    if (!owner.businessEmail.trim()) errs.businessEmail = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(owner.businessEmail)) errs.businessEmail = 'Invalid email'
    if (!owner.cityId) errs.cityId = 'Required'
    if (!owner.street.trim()) errs.street = 'Required'
    if (!owner.addressCity.trim()) errs.addressCity = 'Required'
    if (!owner.addressState.trim()) errs.addressState = 'Required'
    if (!owner.country.trim()) errs.country = 'Required'
    if (!owner.latitude || isNaN(Number(owner.latitude))) errs.latitude = 'Valid number required'
    if (!owner.longitude || isNaN(Number(owner.longitude))) errs.longitude = 'Valid number required'
    if (!selectedBank) errs.bank = 'Select a bank'
    if (!/^\d{10}$/.test(owner.accountNumber)) errs.accountNumber = 'Must be 10 digits'
    if (!owner.accountName.trim()) errs.accountName = verifyingAccount ? 'Verifying…' : 'Required — verify account number'
    setOwnerErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleNext() { if (validateAccount()) setStep(2) }

  function handleSubmit() {
    if (!validateOwner()) return
    setServerError('')

    const documents: Record<string, string> = {}
    if (businessLicenseFile) documents.businessLicenseFile = businessLicenseFile
    if (idDocumentFile) documents.idDocumentFile = idDocumentFile
    if (propertyOwnershipDocFile) documents.propertyOwnershipDocFile = propertyOwnershipDocFile

    startTransition(async () => {
      const res = await adminProvisionPropertyOwner({
        user: {
          email: account.email.trim(),
          firstName: account.firstName.trim(),
          lastName: account.lastName.trim(),
          ...(account.phone.trim() ? { phone: account.phone.trim() } : {}),
        },
        propertyOwner: {
          businessName: owner.businessName.trim(),
          businessPhone: owner.businessPhone.trim(),
          businessEmail: owner.businessEmail.trim(),
          ...(owner.businessDescription.trim() ? { businessDescription: owner.businessDescription.trim() } : {}),
          cityId: owner.cityId,
          address: {
            street: owner.street.trim(),
            city: owner.addressCity.trim(),
            state: owner.addressState.trim(),
            ...(owner.zipCode.trim() ? { zipCode: owner.zipCode.trim() } : {}),
            country: owner.country.trim(),
            latitude: Number(owner.latitude),
            longitude: Number(owner.longitude),
          },
          ...(Object.keys(documents).length > 0 ? { documents } : {}),
          bankDetails: {
            bankName: selectedBank!.name,
            bankCode: selectedBank!.code,
            accountNumber: owner.accountNumber.trim(),
            accountName: owner.accountName.trim(),
          },
        },
      })
      if (res.error) { setServerError(res.error); toast.error(res.error); return }
      setResult(res.data!)
      setStep(3)
      toast.success('Property owner provisioned.')
    })
  }

  return (
    <main className="px-8 py-8 max-w-3xl">
      <div className="mb-6">
        <button
          onClick={() => step === 2 ? setStep(1) : router.push('/dashboard/properties')}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
          </svg>
          {step === 2 ? 'Back to Account' : 'Back to Properties'}
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Create Property Owner</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {step === 1 ? 'Step 1 of 2 — Account details' : step === 2 ? 'Step 2 of 2 — Business & onboarding details' : 'Done'}
        </p>
      </div>

      {step === 1 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First name" required placeholder="Chidi" value={account.firstName} onChange={(e) => setA('firstName', e.target.value)} error={accountErrors.firstName} />
            <Input label="Last name" required placeholder="Nwosu" value={account.lastName} onChange={(e) => setA('lastName', e.target.value)} error={accountErrors.lastName} />
          </div>
          <Input label="Email" required type="email" placeholder="owner@example.com" value={account.email} onChange={(e) => setA('email', e.target.value)} error={accountErrors.email} />
          <Input label="Phone" placeholder="+2348023456789" value={account.phone} onChange={(e) => setA('phone', e.target.value)} />
          <div className="pt-2 flex justify-end">
            <button onClick={handleNext} className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
              Continue →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="space-y-6">
          {/* Business Info */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <SectionLabel>Business Info</SectionLabel>
            <Input label="Business name" required placeholder="Ikoyi Palace Hotel" value={owner.businessName} onChange={(e) => setO('businessName', e.target.value)} error={ownerErrors.businessName} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="Business phone" required placeholder="+2348023456789" value={owner.businessPhone} onChange={(e) => setO('businessPhone', e.target.value)} error={ownerErrors.businessPhone} />
              <Input label="Business email" required type="email" placeholder="reservations@hotel.com" value={owner.businessEmail} onChange={(e) => setO('businessEmail', e.target.value)} error={ownerErrors.businessEmail} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description</label>
              <textarea
                value={owner.businessDescription}
                onChange={(e) => setO('businessDescription', e.target.value)}
                rows={3}
                placeholder="Brief description of the business…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
              />
            </div>
          </div>

          {/* Location */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <SectionLabel>Location</SectionLabel>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Service city <span className="text-red-500">*</span></label>
              <div className="relative">
                <select
                  value={owner.cityId}
                  onChange={(e) => setO('cityId', e.target.value)}
                  className={cn('w-full appearance-none rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer',
                    !owner.cityId ? 'text-slate-400' : 'text-slate-900',
                    ownerErrors.cityId ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50')}
                >
                  <option value="" disabled>{cities.length === 0 ? 'Loading…' : 'Select city…'}</option>
                  {cities.map((c) => <option key={c.id} value={c.id}>{c.name}, {c.state}</option>)}
                </select>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
                  <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                </svg>
              </div>
              <FieldError msg={ownerErrors.cityId} />
            </div>
            <Input label="Street address" required placeholder="5 Bourdillon Road" value={owner.street} onChange={(e) => setO('street', e.target.value)} error={ownerErrors.street} />
            <div className="grid grid-cols-2 gap-4">
              <Input label="City" required placeholder="Ikoyi" value={owner.addressCity} onChange={(e) => setO('addressCity', e.target.value)} error={ownerErrors.addressCity} />
              <Input label="State" required placeholder="Lagos" value={owner.addressState} onChange={(e) => setO('addressState', e.target.value)} error={ownerErrors.addressState} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Zip code (optional)" placeholder="101233" value={owner.zipCode} onChange={(e) => setO('zipCode', e.target.value)} />
              <Input label="Country" required placeholder="Nigeria" value={owner.country} onChange={(e) => setO('country', e.target.value)} error={ownerErrors.country} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Latitude" required type="number" step="any" placeholder="6.4531" value={owner.latitude} onChange={(e) => setO('latitude', e.target.value)} error={ownerErrors.latitude} />
              <Input label="Longitude" required type="number" step="any" placeholder="3.4325" value={owner.longitude} onChange={(e) => setO('longitude', e.target.value)} error={ownerErrors.longitude} />
            </div>
          </div>

          {/* Documents */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <SectionLabel>Documents (optional)</SectionLabel>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <DocUploadField label="Business license" value={businessLicenseFile} onChange={setBusinessLicenseFile} />
              <DocUploadField label="ID document" value={idDocumentFile} onChange={setIdDocumentFile} />
              <DocUploadField label="Property ownership doc" value={propertyOwnershipDocFile} onChange={setPropertyOwnershipDocFile} />
            </div>
          </div>

          {/* Bank Details */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <SectionLabel>Bank Details</SectionLabel>
            <BankCombobox banks={banks} selectedBank={selectedBank} onSelect={(b) => { setSelectedBank(b); setO('accountName', '') }} error={ownerErrors.bank} />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Account number" required placeholder="0198765432"
                value={owner.accountNumber}
                onChange={(e) => { setO('accountNumber', e.target.value); setO('accountName', ''); setAccountVerifyError('') }}
                error={ownerErrors.accountNumber}
              />
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Account name <span className="text-red-500">*</span></label>
                <div className={cn(
                  'w-full rounded-xl border px-3.5 py-2.5 text-sm min-h-[42px] flex items-center',
                  ownerErrors.accountName ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'
                )}>
                  {verifyingAccount
                    ? <span className="text-slate-400 text-xs">Verifying…</span>
                    : owner.accountName
                      ? <span className="font-medium text-slate-900">{owner.accountName}</span>
                      : <span className="text-slate-400 text-xs">Auto-filled after verification</span>}
                </div>
                {accountVerifyError && <p className="mt-1 text-xs text-red-500">{accountVerifyError}</p>}
                <FieldError msg={ownerErrors.accountName} />
              </div>
            </div>
          </div>

          {serverError && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{serverError}</div>
          )}

          <div className="flex justify-end gap-3 pb-8">
            <button onClick={() => setStep(1)} disabled={isPending} className="rounded-xl px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">
              Back
            </button>
            <button onClick={handleSubmit} disabled={isPending} className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50">
              {isPending ? 'Creating…' : 'Create Property Owner'}
            </button>
          </div>
        </div>
      )}

      {step === 3 && result && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-5 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-emerald-600">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
              </svg>
            </div>
            <div>
              <p className="text-base font-bold text-slate-900">Property owner provisioned!</p>
              <p className="text-xs text-slate-500">Account created and onboarding submitted. Pending review.</p>
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4 space-y-2 text-sm mb-4">
            <div className="flex justify-between"><span className="text-slate-500">Name</span><span className="font-medium text-slate-900">{result.firstName} {result.lastName}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="font-medium text-slate-900">{result.email}</span></div>
            {!result.emailSent && (
              <div className="flex justify-between"><span className="text-slate-500">Email sent</span><span className="font-medium text-amber-600">Failed — share manually</span></div>
            )}
          </div>
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 mb-5">
            <p className="text-xs font-semibold text-amber-800 mb-1.5">Temporary Password — share securely</p>
            <p className="font-mono text-lg font-bold text-amber-900 tracking-wider">{result.temporaryPassword}</p>
            <p className="mt-1 text-xs text-amber-600">This password will not be shown again. Owner should change it on first login.</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/properties')}
            className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </main>
  )
}
