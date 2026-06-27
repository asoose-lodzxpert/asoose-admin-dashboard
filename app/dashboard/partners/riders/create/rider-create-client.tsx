'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/app/lib/utils'
import { ImageUploader } from '@/app/components/ui/image-uploader'
import { adminProvisionRider, getBanks, resolveBankAccount } from '@/app/actions/partner-provision'
import type { AdminProvisionResult } from '@/app/actions/partner-provision'

interface AccountForm { firstName: string; lastName: string; email: string; phone: string }
interface RiderForm {
  latitude: string; longitude: string
  vehicleType: string; vehicleBrand: string; vehicleModel: string
  vehicleYear: string; vehicleColor: string; vehiclePlate: string
  driversLicenseNumber: string; driversLicenseExpiry: string; driversLicenseState: string
  maxDeliveryDistance: string
  accountNumber: string; accountName: string
}

const INIT_ACCOUNT: AccountForm = { firstName: '', lastName: '', email: '', phone: '' }
const INIT_RIDER: RiderForm = {
  latitude: '', longitude: '',
  vehicleType: '', vehicleBrand: '', vehicleModel: '',
  vehicleYear: '', vehicleColor: '', vehiclePlate: '',
  driversLicenseNumber: '', driversLicenseExpiry: '', driversLicenseState: '',
  maxDeliveryDistance: '20',
  accountNumber: '', accountName: '',
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
      <input {...props} className={cn(
        'w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',
        error ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'
      )} />
      <FieldError msg={error} />
    </div>
  )
}

function UploadField({ label, required, value, onChange, error }: {
  label: string; required?: boolean; value: string[]; onChange: (v: string[]) => void; error?: string
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <ImageUploader value={value} onChange={onChange} maxImages={1} category="general" />
      <FieldError msg={error} />
    </div>
  )
}

function BankCombobox({ banks, selectedBank, onSelect, error }: {
  banks: { name: string; code: string }[]; selectedBank: { name: string; code: string } | null
  onSelect: (b: { name: string; code: string }) => void; error?: string
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const filtered = query.length > 0 ? banks.filter((b) => b.name.toLowerCase().includes(query.toLowerCase())) : banks
  useEffect(() => {
    function handleClick(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])
  return (
    <div ref={ref} className="relative">
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Bank <span className="text-red-500">*</span></label>
      <input
        type="text"
        placeholder={banks.length === 0 ? 'Loading banks…' : 'Search bank…'}
        value={open ? query : (selectedBank?.name ?? '')}
        onFocus={() => { setOpen(true); setQuery('') }}
        onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
        className={cn('w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',
          error ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50')}
      />
      {open && filtered.length > 0 && (
        <div className="absolute z-20 mt-1 w-full max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
          {filtered.map((b) => (
            <button key={b.code} type="button" onMouseDown={(e) => { e.preventDefault(); onSelect(b); setQuery(''); setOpen(false) }}
              className="w-full px-3.5 py-2 text-left text-sm text-slate-800 hover:bg-indigo-50 flex justify-between">
              <span>{b.name}</span><span className="text-xs text-slate-400 font-mono">{b.code}</span>
            </button>
          ))}
        </div>
      )}
      <FieldError msg={error} />
    </div>
  )
}

export function RiderCreateClient() {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [account, setAccount] = useState<AccountForm>(INIT_ACCOUNT)
  const [rider, setRider] = useState<RiderForm>(INIT_RIDER)
  const [accountErrors, setAccountErrors] = useState<Partial<AccountForm>>({})
  const [riderErrors, setRiderErrors] = useState<Partial<Record<keyof RiderForm | 'bank' | 'driversLicenseFront', string>>>({})
  const [serverError, setServerError] = useState('')
  const [result, setResult] = useState<AdminProvisionResult | null>(null)
  const [isPending, startTransition] = useTransition()

  const [banks, setBanks] = useState<{ name: string; code: string }[]>([])
  const [selectedBank, setSelectedBank] = useState<{ name: string; code: string } | null>(null)
  const [verifyingAccount, setVerifyingAccount] = useState(false)
  const [accountVerifyError, setAccountVerifyError] = useState('')

  const [licenseFrontUrls, setLicenseFrontUrls] = useState<string[]>([])
  const [licenseBackUrls, setLicenseBackUrls] = useState<string[]>([])
  const [profilePhotoUrls, setProfilePhotoUrls] = useState<string[]>([])
  const [vehiclePhotoUrls, setVehiclePhotoUrls] = useState<string[]>([])
  const [insuranceDocUrls, setInsuranceDocUrls] = useState<string[]>([])

  useEffect(() => {
    getBanks().then((r) => { if (r.data) setBanks(r.data) })
  }, [])

  useEffect(() => {
    if (!/^\d{10}$/.test(rider.accountNumber) || !selectedBank) return
    setVerifyingAccount(true)
    setAccountVerifyError('')
    resolveBankAccount(rider.accountNumber, selectedBank.code).then((r) => {
      setVerifyingAccount(false)
      if (r.data) setR('accountName', r.data.accountName)
      else setAccountVerifyError(r.error ?? 'Could not verify account')
    })
  }, [rider.accountNumber, selectedBank])

  function setA(k: keyof AccountForm, v: string) { setAccount((p) => ({ ...p, [k]: v })) }
  function setR(k: keyof RiderForm, v: string) { setRider((p) => ({ ...p, [k]: v })) }

  function validateAccount(): boolean {
    const errs: Partial<AccountForm> = {}
    if (!account.firstName.trim()) errs.firstName = 'Required'
    if (!account.lastName.trim()) errs.lastName = 'Required'
    if (!account.email.trim()) errs.email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email)) errs.email = 'Invalid email'
    setAccountErrors(errs)
    return Object.keys(errs).length === 0
  }

  function validateRider(): boolean {
    const errs: Partial<Record<keyof RiderForm | 'bank' | 'driversLicenseFront', string>> = {}
    if (!rider.latitude || isNaN(Number(rider.latitude))) errs.latitude = 'Valid number required'
    if (!rider.longitude || isNaN(Number(rider.longitude))) errs.longitude = 'Valid number required'
    if (!rider.vehicleType.trim()) errs.vehicleType = 'Required'
    if (!rider.driversLicenseNumber.trim()) errs.driversLicenseNumber = 'Required'
    if (!rider.driversLicenseExpiry) errs.driversLicenseExpiry = 'Required'
    if (!rider.driversLicenseState.trim()) errs.driversLicenseState = 'Required'
    if (licenseFrontUrls.length === 0) errs.driversLicenseFront = 'Required'
    if (!selectedBank) errs.bank = 'Select a bank'
    if (!/^\d{10}$/.test(rider.accountNumber)) errs.accountNumber = 'Must be 10 digits'
    if (!rider.accountName.trim()) errs.accountName = verifyingAccount ? 'Verifying…' : 'Required — verify account number'
    setRiderErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleNext() { if (validateAccount()) setStep(2) }

  function handleSubmit() {
    if (!validateRider()) return
    setServerError('')
    startTransition(async () => {
      const res = await adminProvisionRider({
        user: {
          email: account.email.trim(),
          firstName: account.firstName.trim(),
          lastName: account.lastName.trim(),
          ...(account.phone.trim() ? { phone: account.phone.trim() } : {}),
        },
        rider: {
          latitude: Number(rider.latitude),
          longitude: Number(rider.longitude),
          vehicleType: rider.vehicleType.trim(),
          ...(rider.vehicleBrand.trim() ? { vehicleBrand: rider.vehicleBrand.trim() } : {}),
          ...(rider.vehicleModel.trim() ? { vehicleModel: rider.vehicleModel.trim() } : {}),
          ...(rider.vehicleYear ? { vehicleYear: Number(rider.vehicleYear) } : {}),
          ...(rider.vehicleColor.trim() ? { vehicleColor: rider.vehicleColor.trim() } : {}),
          ...(rider.vehiclePlate.trim() ? { vehiclePlate: rider.vehiclePlate.trim() } : {}),
          driversLicenseNumber: rider.driversLicenseNumber.trim(),
          driversLicenseExpiry: rider.driversLicenseExpiry,
          driversLicenseState: rider.driversLicenseState.trim(),
          documents: {
            driversLicenseFront: licenseFrontUrls[0]!,
            ...(licenseBackUrls[0] ? { driversLicenseBack: licenseBackUrls[0] } : {}),
            ...(profilePhotoUrls[0] ? { profilePhoto: profilePhotoUrls[0] } : {}),
            ...(vehiclePhotoUrls[0] ? { vehiclePhoto: vehiclePhotoUrls[0] } : {}),
            ...(insuranceDocUrls[0] ? { insuranceDocument: insuranceDocUrls[0] } : {}),
          },
          preferredZones: [],
          maxDeliveryDistance: Number(rider.maxDeliveryDistance) || 20,
          bankDetails: {
            bankName: selectedBank!.name,
            bankCode: selectedBank!.code,
            accountNumber: rider.accountNumber.trim(),
            accountName: rider.accountName.trim(),
          },
        },
      })
      if (res.error) { setServerError(res.error); return }
      setResult(res.data!)
      setStep(3)
    })
  }

  return (
    <main className="px-8 py-8 max-w-3xl">
      <div className="mb-6">
        <button
          onClick={() => step === 2 ? setStep(1) : router.push('/dashboard/partners/riders')}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
          </svg>
          {step === 2 ? 'Back to Account' : 'Back to Riders'}
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Create Rider</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {step === 1 ? 'Step 1 of 2 — Account details' : step === 2 ? 'Step 2 of 2 — Rider & vehicle details' : 'Done'}
        </p>
      </div>

      {step === 1 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First name" required placeholder="Emeka" value={account.firstName} onChange={(e) => setA('firstName', e.target.value)} error={accountErrors.firstName} />
            <Input label="Last name" required placeholder="Nwosu" value={account.lastName} onChange={(e) => setA('lastName', e.target.value)} error={accountErrors.lastName} />
          </div>
          <Input label="Email" required type="email" placeholder="rider@example.com" value={account.email} onChange={(e) => setA('email', e.target.value)} error={accountErrors.email} />
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
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <SectionLabel>Current Location</SectionLabel>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Latitude" required type="number" step="any" placeholder="6.5244" value={rider.latitude} onChange={(e) => setR('latitude', e.target.value)} error={riderErrors.latitude} />
              <Input label="Longitude" required type="number" step="any" placeholder="3.3792" value={rider.longitude} onChange={(e) => setR('longitude', e.target.value)} error={riderErrors.longitude} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <SectionLabel>Vehicle Info</SectionLabel>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Vehicle type" required placeholder="MOTORCYCLE" value={rider.vehicleType} onChange={(e) => setR('vehicleType', e.target.value)} error={riderErrors.vehicleType} />
              <Input label="Brand" placeholder="Honda" value={rider.vehicleBrand} onChange={(e) => setR('vehicleBrand', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Model" placeholder="CG 125" value={rider.vehicleModel} onChange={(e) => setR('vehicleModel', e.target.value)} />
              <Input label="Year" type="number" placeholder="2022" value={rider.vehicleYear} onChange={(e) => setR('vehicleYear', e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Color" placeholder="Red" value={rider.vehicleColor} onChange={(e) => setR('vehicleColor', e.target.value)} />
              <Input label="Plate number" placeholder="ABC-123-XY" value={rider.vehiclePlate} onChange={(e) => setR('vehiclePlate', e.target.value)} />
            </div>
            <Input label="Max delivery distance (km)" type="number" value={rider.maxDeliveryDistance} onChange={(e) => setR('maxDeliveryDistance', e.target.value)} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <SectionLabel>Driver's License</SectionLabel>
            <div className="grid grid-cols-2 gap-4">
              <Input label="License number" required placeholder="ABC123456789" value={rider.driversLicenseNumber} onChange={(e) => setR('driversLicenseNumber', e.target.value)} error={riderErrors.driversLicenseNumber} />
              <Input label="Expiry date" required type="date" value={rider.driversLicenseExpiry} onChange={(e) => setR('driversLicenseExpiry', e.target.value)} error={riderErrors.driversLicenseExpiry} />
            </div>
            <Input label="Issuing state" required placeholder="Lagos" value={rider.driversLicenseState} onChange={(e) => setR('driversLicenseState', e.target.value)} error={riderErrors.driversLicenseState} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <SectionLabel>Documents</SectionLabel>
            <div className="grid grid-cols-2 gap-6">
              <UploadField label="License front" required value={licenseFrontUrls} onChange={setLicenseFrontUrls} error={riderErrors.driversLicenseFront} />
              <UploadField label="License back" value={licenseBackUrls} onChange={setLicenseBackUrls} />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <UploadField label="Profile photo" value={profilePhotoUrls} onChange={setProfilePhotoUrls} />
              <UploadField label="Vehicle photo" value={vehiclePhotoUrls} onChange={setVehiclePhotoUrls} />
            </div>
            <UploadField label="Insurance document" value={insuranceDocUrls} onChange={setInsuranceDocUrls} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <SectionLabel>Bank Details</SectionLabel>
            <BankCombobox banks={banks} selectedBank={selectedBank} onSelect={(b) => { setSelectedBank(b); setR('accountName', '') }} error={riderErrors.bank} />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Account number" required placeholder="0123456789"
                value={rider.accountNumber}
                onChange={(e) => { setR('accountNumber', e.target.value); setR('accountName', ''); setAccountVerifyError('') }}
                error={riderErrors.accountNumber}
              />
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Account name <span className="text-red-500">*</span></label>
                <div className={cn('w-full rounded-xl border px-3.5 py-2.5 text-sm min-h-[42px] flex items-center',
                  riderErrors.accountName ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50')}>
                  {verifyingAccount
                    ? <span className="text-slate-400 text-xs">Verifying…</span>
                    : rider.accountName
                      ? <span className="font-medium text-slate-900">{rider.accountName}</span>
                      : <span className="text-slate-400 text-xs">Auto-filled after verification</span>}
                </div>
                {accountVerifyError && <p className="mt-1 text-xs text-red-500">{accountVerifyError}</p>}
                <FieldError msg={riderErrors.accountName} />
              </div>
            </div>
          </div>

          {serverError && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{serverError}</div>
          )}

          <div className="flex justify-end gap-3 pb-8">
            <button onClick={() => setStep(1)} disabled={isPending} className="rounded-xl px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">Back</button>
            <button onClick={handleSubmit} disabled={isPending} className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50">
              {isPending ? 'Creating…' : 'Create Rider'}
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
              <p className="text-base font-bold text-slate-900">Rider provisioned!</p>
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
            <p className="mt-1 text-xs text-amber-600">This password will not be shown again. Rider should change it on first login.</p>
          </div>
          <button onClick={() => router.push('/dashboard/partners/riders')}
            className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
            Done
          </button>
        </div>
      )}
    </main>
  )
}
