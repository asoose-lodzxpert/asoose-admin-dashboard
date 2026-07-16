'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/app/lib/utils'
import { ImageUploader } from '@/app/components/ui/image-uploader'
import { useToast } from '@/app/components/ui/toast'
import {
  adminProvisionVendor,
  getPublicStoreTypes,
  getBanks,
  resolveCity,
  resolveBankAccount,
} from '@/app/actions/partner-provision'
import type { AdminProvisionResult } from '@/app/actions/partner-provision'

const DAYS = ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'] as const
const DAY_LABELS: Record<string, string> = {
  MONDAY: 'Mon', TUESDAY: 'Tue', WEDNESDAY: 'Wed', THURSDAY: 'Thu',
  FRIDAY: 'Fri', SATURDAY: 'Sat', SUNDAY: 'Sun',
}
const DEFAULT_HOURS = DAYS.map((day) => ({ day, openTime: '08:00', closeTime: '22:00', isClosed: false }))

interface AccountForm { firstName: string; lastName: string; email: string; phone: string }
interface VendorForm {
  businessName: string
  businessType: string
  businessPhone: string
  businessEmail: string
  businessDescription: string
  addressLine: string
  latitude: string
  longitude: string
  accountNumber: string
  accountName: string
  operatingHours: { day: string; openTime: string; closeTime: string; isClosed: boolean }[]
}

const INIT_ACCOUNT: AccountForm = { firstName: '', lastName: '', email: '', phone: '' }
const INIT_VENDOR: VendorForm = {
  businessName: '', businessType: '', businessPhone: '', businessEmail: '',
  businessDescription: '', addressLine: '', latitude: '', longitude: '',
  accountNumber: '', accountName: '', operatingHours: DEFAULT_HOURS,
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

export function VendorCreateClient() {
  const router = useRouter()
  const toast = useToast()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [account, setAccount] = useState<AccountForm>(INIT_ACCOUNT)
  const [vendor, setVendor] = useState<VendorForm>(INIT_VENDOR)
  const [accountErrors, setAccountErrors] = useState<Partial<AccountForm>>({})
  const [vendorErrors, setVendorErrors] = useState<Partial<Record<keyof VendorForm | 'bank' | 'city', string>>>({})
  const [serverError, setServerError] = useState('')
  const [result, setResult] = useState<AdminProvisionResult | null>(null)
  const [isPending, startTransition] = useTransition()

  const [storeTypes, setStoreTypes] = useState<{ id: string; name: string; code: string }[]>([])
  const [banks, setBanks] = useState<{ name: string; code: string }[]>([])
  const [selectedBank, setSelectedBank] = useState<{ name: string; code: string } | null>(null)
  const [resolvedCity, setResolvedCity] = useState<{ name: string; state: string; country: string | null } | null>(null)
  const [resolvingCity, setResolvingCity] = useState(false)
  const [cityError, setCityError] = useState('')
  const [verifyingAccount, setVerifyingAccount] = useState(false)
  const [accountVerifyError, setAccountVerifyError] = useState('')
  const [logoUrls, setLogoUrls] = useState<string[]>([])
  const [bannerUrls, setBannerUrls] = useState<string[]>([])

  useEffect(() => {
    getPublicStoreTypes().then((r) => { if (r.data) setStoreTypes(r.data) })
    getBanks().then((r) => { if (r.data) setBanks(r.data) })
  }, [])

  useEffect(() => {
    if (!/^\d{10}$/.test(vendor.accountNumber) || !selectedBank) return
    setVerifyingAccount(true)
    setAccountVerifyError('')
    resolveBankAccount(vendor.accountNumber, selectedBank.code).then((r) => {
      setVerifyingAccount(false)
      if (r.data) setV('accountName', r.data.accountName)
      else setAccountVerifyError(r.error ?? 'Could not verify account')
    })
  }, [vendor.accountNumber, selectedBank])

  function setA(k: keyof AccountForm, v: string) { setAccount((p) => ({ ...p, [k]: v })) }
  function setV(k: keyof VendorForm, v: unknown) { setVendor((p) => ({ ...p, [k]: v })) }

  async function handleResolveCity() {
    const lat = Number(vendor.latitude)
    const lon = Number(vendor.longitude)
    if (!vendor.latitude || !vendor.longitude || isNaN(lat) || isNaN(lon)) {
      setCityError('Enter valid lat/lon first')
      return
    }
    setResolvingCity(true)
    setCityError('')
    const r = await resolveCity(lat, lon)
    setResolvingCity(false)
    if (r.data?.city) {
      setResolvedCity(r.data.city)
    } else {
      setCityError(r.error ?? (r.data?.serviceAvailable === false ? 'No service area at these coordinates' : 'Could not resolve city'))
    }
  }

  function validateAccount(): boolean {
    const errs: Partial<AccountForm> = {}
    if (!account.firstName.trim()) errs.firstName = 'Required'
    if (!account.lastName.trim()) errs.lastName = 'Required'
    if (!account.email.trim()) errs.email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email)) errs.email = 'Invalid email'
    setAccountErrors(errs)
    return Object.keys(errs).length === 0
  }

  function validateVendor(): boolean {
    const errs: Partial<Record<keyof VendorForm | 'bank' | 'city', string>> = {}
    if (!vendor.businessName.trim()) errs.businessName = 'Required'
    if (!vendor.businessType) errs.businessType = 'Required'
    if (!vendor.businessPhone.trim()) errs.businessPhone = 'Required'
    if (!vendor.businessEmail.trim()) errs.businessEmail = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(vendor.businessEmail)) errs.businessEmail = 'Invalid email'
    if (!vendor.latitude || isNaN(Number(vendor.latitude))) errs.latitude = 'Valid number required'
    if (!vendor.longitude || isNaN(Number(vendor.longitude))) errs.longitude = 'Valid number required'
    if (!resolvedCity) errs.city = 'Resolve city from coordinates first'
    if (!selectedBank) errs.bank = 'Select a bank'
    if (!/^\d{10}$/.test(vendor.accountNumber)) errs.accountNumber = 'Must be 10 digits'
    if (!vendor.accountName.trim()) errs.accountName = verifyingAccount ? 'Verifying…' : 'Required — verify account number'
    setVendorErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleNext() { if (validateAccount()) setStep(2) }

  function handleSubmit() {
    if (!validateVendor()) return
    setServerError('')
    startTransition(async () => {
      const res = await adminProvisionVendor({
        user: {
          email: account.email.trim(),
          firstName: account.firstName.trim(),
          lastName: account.lastName.trim(),
          ...(account.phone.trim() ? { phone: account.phone.trim() } : {}),
        },
        vendor: {
          businessName: vendor.businessName.trim(),
          businessType: vendor.businessType,
          businessPhone: vendor.businessPhone.trim(),
          businessEmail: vendor.businessEmail.trim(),
          ...(vendor.businessDescription.trim() ? { businessDescription: vendor.businessDescription.trim() } : {}),
          address: {
            ...(vendor.addressLine.trim() ? { street: vendor.addressLine.trim() } : {}),
            city: resolvedCity!.name,
            state: resolvedCity!.state,
            country: resolvedCity!.country ?? 'Nigeria',
            latitude: Number(vendor.latitude),
            longitude: Number(vendor.longitude),
          },
          bankDetails: {
            bankName: selectedBank!.name,
            bankCode: selectedBank!.code,
            accountNumber: vendor.accountNumber.trim(),
            accountName: vendor.accountName.trim(),
          },
          operatingHours: vendor.operatingHours,
          ...(logoUrls[0] ? { logo: logoUrls[0] } : {}),
          ...(bannerUrls[0] ? { banner: bannerUrls[0] } : {}),
        },
      })
      if (res.error) { setServerError(res.error); toast.error(res.error); return }
      setResult(res.data!)
      setStep(3)
      toast.success('Vendor provisioned.')
    })
  }

  return (
    <main className="px-8 py-8 max-w-3xl">
      <div className="mb-6">
        <button
          onClick={() => step === 2 ? setStep(1) : router.push('/dashboard/partners/vendors')}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
          </svg>
          {step === 2 ? 'Back to Account' : 'Back to Vendors'}
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Create Vendor</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {step === 1 ? 'Step 1 of 2 — Account details' : step === 2 ? 'Step 2 of 2 — Business & onboarding details' : 'Done'}
        </p>
      </div>

      {step === 1 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First name" required placeholder="Ada" value={account.firstName} onChange={(e) => setA('firstName', e.target.value)} error={accountErrors.firstName} />
            <Input label="Last name" required placeholder="Obi" value={account.lastName} onChange={(e) => setA('lastName', e.target.value)} error={accountErrors.lastName} />
          </div>
          <Input label="Email" required type="email" placeholder="vendor@example.com" value={account.email} onChange={(e) => setA('email', e.target.value)} error={accountErrors.email} />
          <Input label="Phone" placeholder="+2348012345678" value={account.phone} onChange={(e) => setA('phone', e.target.value)} />
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
            <div className="grid grid-cols-2 gap-4">
              <Input label="Business name" required placeholder="Mama's Kitchen" value={vendor.businessName} onChange={(e) => setV('businessName', e.target.value)} error={vendorErrors.businessName} />
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Business type <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select
                    value={vendor.businessType}
                    onChange={(e) => setV('businessType', e.target.value)}
                    className={cn('w-full appearance-none rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer',
                      !vendor.businessType ? 'text-slate-400' : 'text-slate-900',
                      vendorErrors.businessType ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50')}
                  >
                    <option value="" disabled>{storeTypes.length === 0 ? 'Loading…' : 'Select type…'}</option>
                    {storeTypes.map((t) => <option key={t.id} value={t.code}>{t.name}</option>)}
                  </select>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
                    <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  </svg>
                </div>
                <FieldError msg={vendorErrors.businessType} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Business phone" required placeholder="+2348012345678" value={vendor.businessPhone} onChange={(e) => setV('businessPhone', e.target.value)} error={vendorErrors.businessPhone} />
              <Input label="Business email" required type="email" placeholder="hello@kitchen.com" value={vendor.businessEmail} onChange={(e) => setV('businessEmail', e.target.value)} error={vendorErrors.businessEmail} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Description</label>
              <textarea
                value={vendor.businessDescription}
                onChange={(e) => setV('businessDescription', e.target.value)}
                rows={3}
                placeholder="Brief description of the business…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
              />
            </div>
          </div>

          {/* Location */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <SectionLabel>Location</SectionLabel>
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Latitude" required type="number" step="any" placeholder="6.5244"
                value={vendor.latitude}
                onChange={(e) => { setV('latitude', e.target.value); setResolvedCity(null); setCityError('') }}
                error={vendorErrors.latitude}
              />
              <Input
                label="Longitude" required type="number" step="any" placeholder="3.3792"
                value={vendor.longitude}
                onChange={(e) => { setV('longitude', e.target.value); setResolvedCity(null); setCityError('') }}
                error={vendorErrors.longitude}
              />
            </div>
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={handleResolveCity}
                disabled={resolvingCity}
                className="shrink-0 rounded-xl bg-slate-700 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
              >
                {resolvingCity ? 'Resolving…' : 'Resolve City'}
              </button>
              {resolvedCity && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2 text-sm">
                  <p className="font-semibold text-emerald-800">{resolvedCity.name}</p>
                  <p className="text-xs text-emerald-600">{resolvedCity.state}{resolvedCity.country ? `, ${resolvedCity.country}` : ''}</p>
                </div>
              )}
              {cityError && <p className="text-sm text-red-500 pt-2">{cityError}</p>}
            </div>
            {vendorErrors.city && <FieldError msg={vendorErrors.city} />}
            <Input label="Address line (optional)" placeholder="12 Allen Avenue" value={vendor.addressLine} onChange={(e) => setV('addressLine', e.target.value)} />
          </div>

          {/* Operating Hours */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <SectionLabel>Operating Hours</SectionLabel>
            <div className="space-y-2">
              {vendor.operatingHours.map((h, i) => (
                <div key={h.day} className="flex items-center gap-3">
                  <span className="w-10 text-xs font-semibold text-slate-500">{DAY_LABELS[h.day]}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const next = [...vendor.operatingHours]
                      next[i] = { ...next[i]!, isClosed: !next[i]!.isClosed }
                      setV('operatingHours', next)
                    }}
                    className={cn('flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors', h.isClosed ? 'bg-slate-200' : 'bg-indigo-600')}
                  >
                    <span className={cn('h-5 w-5 rounded-full bg-white shadow-sm transition-transform', h.isClosed ? 'translate-x-0' : 'translate-x-5')} />
                  </button>
                  {h.isClosed ? (
                    <span className="text-xs text-slate-400">Closed</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input type="time" value={h.openTime} onChange={(e) => {
                        const next = [...vendor.operatingHours]; next[i] = { ...next[i]!, openTime: e.target.value }; setV('operatingHours', next)
                      }} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                      <span className="text-xs text-slate-400">to</span>
                      <input type="time" value={h.closeTime} onChange={(e) => {
                        const next = [...vendor.operatingHours]; next[i] = { ...next[i]!, closeTime: e.target.value }; setV('operatingHours', next)
                      }} className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Bank Details */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <SectionLabel>Bank Details</SectionLabel>
            <BankCombobox banks={banks} selectedBank={selectedBank} onSelect={(b) => { setSelectedBank(b); setVendor((p) => ({ ...p, accountName: '' })) }} error={vendorErrors.bank} />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Input
                  label="Account number" required placeholder="0123456789"
                  value={vendor.accountNumber}
                  onChange={(e) => { setV('accountNumber', e.target.value); setV('accountName', ''); setAccountVerifyError('') }}
                  error={vendorErrors.accountNumber}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Account name <span className="text-red-500">*</span></label>
                <div className={cn(
                  'w-full rounded-xl border px-3.5 py-2.5 text-sm min-h-[42px] flex items-center',
                  vendorErrors.accountName ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'
                )}>
                  {verifyingAccount
                    ? <span className="text-slate-400 text-xs">Verifying…</span>
                    : vendor.accountName
                      ? <span className="font-medium text-slate-900">{vendor.accountName}</span>
                      : <span className="text-slate-400 text-xs">Auto-filled after verification</span>}
                </div>
                {accountVerifyError && <p className="mt-1 text-xs text-red-500">{accountVerifyError}</p>}
                <FieldError msg={vendorErrors.accountName} />
              </div>
            </div>
          </div>

          {/* Media */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <SectionLabel>Media (optional)</SectionLabel>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Logo</label>
                <ImageUploader value={logoUrls} onChange={setLogoUrls} maxImages={1} category="general" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">Banner</label>
                <ImageUploader value={bannerUrls} onChange={setBannerUrls} maxImages={1} category="general" />
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
              {isPending ? 'Creating…' : 'Create Vendor'}
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
              <p className="text-base font-bold text-slate-900">Vendor provisioned!</p>
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
            <p className="mt-1 text-xs text-amber-600">This password will not be shown again. Vendor should change it on first login.</p>
          </div>
          <button
            onClick={() => router.push('/dashboard/partners/vendors')}
            className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
          >
            Done
          </button>
        </div>
      )}
    </main>
  )
}
