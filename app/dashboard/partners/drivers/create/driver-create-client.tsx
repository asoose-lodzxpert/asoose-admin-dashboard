'use client'

import { useState, useEffect, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/app/lib/utils'
import { ImageUploader } from '@/app/components/ui/image-uploader'
import { useToast } from '@/app/components/ui/toast'
import { adminProvisionDriver, getBanks, resolveBankAccount } from '@/app/actions/partner-provision'
import type { AdminProvisionResult } from '@/app/actions/partner-provision'
import type { VehicleType, VehicleBrand, City } from '@/app/lib/types'

const VEHICLE_COLORS = ['Black', 'White', 'Silver', 'Grey', 'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Brown', 'Gold', 'Maroon']
const CURRENT_YEAR = new Date().getFullYear()
const VEHICLE_YEARS = Array.from({ length: CURRENT_YEAR - 1989 }, (_, i) => CURRENT_YEAR - i)

interface AccountForm { firstName: string; lastName: string; email: string; phone: string }
interface DriverForm {
  cityId: string
  vehicleType: string; vehicleBrand: string; vehicleModel: string
  vehicleYear: string; vehicleColor: string; vehiclePlate: string
  driversLicenseNumber: string; driversLicenseExpiry: string; driversLicenseState: string
  insuranceProvider: string; insurancePolicyNumber: string; insuranceExpiry: string
  accountNumber: string; accountName: string
}

const INIT_ACCOUNT: AccountForm = { firstName: '', lastName: '', email: '', phone: '' }
const INIT_DRIVER: DriverForm = {
  cityId: '',
  vehicleType: '', vehicleBrand: '', vehicleModel: '',
  vehicleYear: '', vehicleColor: '', vehiclePlate: '',
  driversLicenseNumber: '', driversLicenseExpiry: '', driversLicenseState: '',
  insuranceProvider: '', insurancePolicyNumber: '', insuranceExpiry: '',
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

function Select({ label, required, error, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string; required?: boolean; error?: string }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <select {...props} className={cn(
        'w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',
        error ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'
      )}>
        {children}
      </select>
      <FieldError msg={error} />
    </div>
  )
}

function ColorField({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [custom, setCustom] = useState(value !== '' && !VEHICLE_COLORS.includes(value))
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Color <span className="text-red-500">*</span></label>
      <select
        value={custom ? '__other__' : value}
        onChange={(e) => {
          if (e.target.value === '__other__') { setCustom(true); onChange('') }
          else { setCustom(false); onChange(e.target.value) }
        }}
        className="w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
      >
        <option value="">Select color</option>
        {VEHICLE_COLORS.map((c) => <option key={c} value={c}>{c}</option>)}
        <option value="__other__">Other…</option>
      </select>
      {custom && (
        <input
          autoFocus
          placeholder="Enter color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="mt-2 w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 border-slate-200 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
        />
      )}
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

interface Props {
  vehicleTypes: VehicleType[]
  vehicleBrands: VehicleBrand[]
  cities: City[]
}

export function DriverCreateClient({ vehicleTypes, vehicleBrands, cities }: Props) {
  const router = useRouter()
  const toast = useToast()
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [account, setAccount] = useState<AccountForm>(INIT_ACCOUNT)
  const [driver, setDriver] = useState<DriverForm>(INIT_DRIVER)
  const [accountErrors, setAccountErrors] = useState<Partial<AccountForm>>({})
  const [driverErrors, setDriverErrors] = useState<Partial<Record<keyof DriverForm | 'bank' | 'driversLicenseFront' | 'insuranceDocument', string>>>({})
  const [serverError, setServerError] = useState('')
  const [result, setResult] = useState<AdminProvisionResult | null>(null)
  const [isPending, startTransition] = useTransition()

  const [banks, setBanks] = useState<{ name: string; code: string }[]>([])
  const [selectedBank, setSelectedBank] = useState<{ name: string; code: string } | null>(null)
  const [verifyingAccount, setVerifyingAccount] = useState(false)
  const [accountVerifyError, setAccountVerifyError] = useState('')

  const [licenseFrontUrls, setLicenseFrontUrls] = useState<string[]>([])
  const [licenseBackUrls, setLicenseBackUrls] = useState<string[]>([])
  const [insuranceDocUrls, setInsuranceDocUrls] = useState<string[]>([])
  const [profilePhotoUrls, setProfilePhotoUrls] = useState<string[]>([])
  const [vehiclePhotoUrls, setVehiclePhotoUrls] = useState<string[]>([])
  const [vehicleRegUrls, setVehicleRegUrls] = useState<string[]>([])

  useEffect(() => {
    getBanks().then((r) => { if (r.data) setBanks(r.data) })
  }, [])

  useEffect(() => {
    if (!/^\d{10}$/.test(driver.accountNumber) || !selectedBank) return
    setVerifyingAccount(true)
    setAccountVerifyError('')
    resolveBankAccount(driver.accountNumber, selectedBank.code).then((r) => {
      setVerifyingAccount(false)
      if (r.data) setD('accountName', r.data.accountName)
      else setAccountVerifyError(r.error ?? 'Could not verify account')
    })
  }, [driver.accountNumber, selectedBank])

  function setA(k: keyof AccountForm, v: string) { setAccount((p) => ({ ...p, [k]: v })) }
  function setD(k: keyof DriverForm, v: string) { setDriver((p) => ({ ...p, [k]: v })) }

  function validateAccount(): boolean {
    const errs: Partial<AccountForm> = {}
    if (!account.firstName.trim()) errs.firstName = 'Required'
    if (!account.lastName.trim()) errs.lastName = 'Required'
    if (!account.email.trim()) errs.email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(account.email)) errs.email = 'Invalid email'
    setAccountErrors(errs)
    return Object.keys(errs).length === 0
  }

  function validateDriver(): boolean {
    const errs: Partial<Record<keyof DriverForm | 'bank' | 'driversLicenseFront' | 'insuranceDocument', string>> = {}
    if (!driver.cityId) errs.cityId = 'Required'
    if (!driver.vehicleType.trim()) errs.vehicleType = 'Required'
    if (!driver.vehicleBrand.trim()) errs.vehicleBrand = 'Required'
    if (!driver.vehicleModel.trim()) errs.vehicleModel = 'Required'
    if (!driver.vehicleYear || isNaN(Number(driver.vehicleYear))) errs.vehicleYear = 'Required'
    if (!driver.vehicleColor.trim()) errs.vehicleColor = 'Required'
    if (!driver.vehiclePlate.trim()) errs.vehiclePlate = 'Required'
    if (!driver.driversLicenseNumber.trim()) errs.driversLicenseNumber = 'Required'
    if (!driver.driversLicenseExpiry) errs.driversLicenseExpiry = 'Required'
    if (!driver.driversLicenseState.trim()) errs.driversLicenseState = 'Required'
    if (!driver.insuranceProvider.trim()) errs.insuranceProvider = 'Required'
    if (!driver.insurancePolicyNumber.trim()) errs.insurancePolicyNumber = 'Required'
    if (!driver.insuranceExpiry) errs.insuranceExpiry = 'Required'
    if (licenseFrontUrls.length === 0) errs.driversLicenseFront = 'Required'
    if (insuranceDocUrls.length === 0) errs.insuranceDocument = 'Required'
    if (!selectedBank) errs.bank = 'Select a bank'
    if (!/^\d{10}$/.test(driver.accountNumber)) errs.accountNumber = 'Must be 10 digits'
    if (!driver.accountName.trim()) errs.accountName = verifyingAccount ? 'Verifying…' : 'Required — verify account number'
    setDriverErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleNext() { if (validateAccount()) setStep(2) }

  function handleSubmit() {
    if (!validateDriver()) return
    setServerError('')
    startTransition(async () => {
      const res = await adminProvisionDriver({
        user: {
          email: account.email.trim(),
          firstName: account.firstName.trim(),
          lastName: account.lastName.trim(),
          ...(account.phone.trim() ? { phone: account.phone.trim() } : {}),
        },
        driver: {
          cityId: driver.cityId,
          vehicleType: driver.vehicleType.trim(),
          vehicleBrand: driver.vehicleBrand.trim(),
          vehicleModel: driver.vehicleModel.trim(),
          vehicleYear: Number(driver.vehicleYear),
          vehicleColor: driver.vehicleColor.trim(),
          vehiclePlate: driver.vehiclePlate.trim(),
          driversLicenseNumber: driver.driversLicenseNumber.trim(),
          driversLicenseExpiry: driver.driversLicenseExpiry,
          driversLicenseState: driver.driversLicenseState.trim(),
          insuranceProvider: driver.insuranceProvider.trim(),
          insurancePolicyNumber: driver.insurancePolicyNumber.trim(),
          insuranceExpiry: driver.insuranceExpiry,
          documents: {
            driversLicenseFront: licenseFrontUrls[0]!,
            insuranceDocument: insuranceDocUrls[0]!,
            ...(licenseBackUrls[0] ? { driversLicenseBack: licenseBackUrls[0] } : {}),
            ...(profilePhotoUrls[0] ? { profilePhoto: profilePhotoUrls[0] } : {}),
            ...(vehiclePhotoUrls[0] ? { vehiclePhoto: vehiclePhotoUrls[0] } : {}),
            ...(vehicleRegUrls[0] ? { vehicleRegistration: vehicleRegUrls[0] } : {}),
          },
          bankDetails: {
            bankName: selectedBank!.name,
            bankCode: selectedBank!.code,
            accountNumber: driver.accountNumber.trim(),
            accountName: driver.accountName.trim(),
          },
        },
      })
      if (res.error) { setServerError(res.error); toast.error(res.error); return }
      setResult(res.data!)
      toast.success('Driver provisioned.')
      setStep(3)
    })
  }

  return (
    <main className="px-8 py-8 max-w-3xl">
      <div className="mb-6">
        <button
          onClick={() => step === 2 ? setStep(1) : router.push('/dashboard/partners/drivers')}
          className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
          </svg>
          {step === 2 ? 'Back to Account' : 'Back to Drivers'}
        </button>
        <h1 className="text-2xl font-bold text-slate-900">Create Driver</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          {step === 1 ? 'Step 1 of 2 — Account details' : step === 2 ? 'Step 2 of 2 — Driver & vehicle details' : 'Done'}
        </p>
      </div>

      {step === 1 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="First name" required placeholder="Chidi" value={account.firstName} onChange={(e) => setA('firstName', e.target.value)} error={accountErrors.firstName} />
            <Input label="Last name" required placeholder="Okafor" value={account.lastName} onChange={(e) => setA('lastName', e.target.value)} error={accountErrors.lastName} />
          </div>
          <Input label="Email" required type="email" placeholder="driver@example.com" value={account.email} onChange={(e) => setA('email', e.target.value)} error={accountErrors.email} />
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
            <SectionLabel>Location</SectionLabel>
            <Select label="City" required value={driver.cityId} onChange={(e) => setD('cityId', e.target.value)} error={driverErrors.cityId}>
              <option value="">Select city</option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.state ? `, ${c.state}` : ''}</option>
              ))}
            </Select>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <SectionLabel>Vehicle Info</SectionLabel>
            <div className="grid grid-cols-2 gap-4">
              <Select label="Vehicle type" required value={driver.vehicleType} onChange={(e) => setD('vehicleType', e.target.value)} error={driverErrors.vehicleType}>
                <option value="">Select vehicle type</option>
                {vehicleTypes.filter((t) => t.appliesTo === 'DRIVER').map((t) => (
                  <option key={t.id} value={t.code}>{t.name}</option>
                ))}
              </Select>
              <Select label="Brand" required value={driver.vehicleBrand} onChange={(e) => setD('vehicleBrand', e.target.value)} error={driverErrors.vehicleBrand}>
                <option value="">Select brand</option>
                {vehicleBrands.map((b) => (
                  <option key={b.id} value={b.name}>{b.name}</option>
                ))}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Model" required placeholder="Camry" value={driver.vehicleModel} onChange={(e) => setD('vehicleModel', e.target.value)} error={driverErrors.vehicleModel} />
              <Select label="Year" required value={driver.vehicleYear} onChange={(e) => setD('vehicleYear', e.target.value)} error={driverErrors.vehicleYear}>
                <option value="">Select year</option>
                {VEHICLE_YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <ColorField value={driver.vehicleColor} onChange={(v) => setD('vehicleColor', v)} />
              <Input label="Plate number" required placeholder="ABC-123-XY" value={driver.vehiclePlate} onChange={(e) => setD('vehiclePlate', e.target.value)} error={driverErrors.vehiclePlate} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <SectionLabel>Driver's License</SectionLabel>
            <div className="grid grid-cols-2 gap-4">
              <Input label="License number" required placeholder="ABC123456789" value={driver.driversLicenseNumber} onChange={(e) => setD('driversLicenseNumber', e.target.value)} error={driverErrors.driversLicenseNumber} />
              <Input label="Expiry date" required type="date" value={driver.driversLicenseExpiry} onChange={(e) => setD('driversLicenseExpiry', e.target.value)} error={driverErrors.driversLicenseExpiry} />
            </div>
            <Input label="Issuing state" required placeholder="Lagos" value={driver.driversLicenseState} onChange={(e) => setD('driversLicenseState', e.target.value)} error={driverErrors.driversLicenseState} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <SectionLabel>Insurance</SectionLabel>
            <div className="grid grid-cols-2 gap-4">
              <Input label="Insurance provider" required placeholder="AXA Mansard" value={driver.insuranceProvider} onChange={(e) => setD('insuranceProvider', e.target.value)} error={driverErrors.insuranceProvider} />
              <Input label="Policy number" required placeholder="POL-12345" value={driver.insurancePolicyNumber} onChange={(e) => setD('insurancePolicyNumber', e.target.value)} error={driverErrors.insurancePolicyNumber} />
            </div>
            <Input label="Insurance expiry" required type="date" value={driver.insuranceExpiry} onChange={(e) => setD('insuranceExpiry', e.target.value)} error={driverErrors.insuranceExpiry} />
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <SectionLabel>Documents</SectionLabel>
            <div className="grid grid-cols-2 gap-6">
              <UploadField label="License front" required value={licenseFrontUrls} onChange={setLicenseFrontUrls} error={driverErrors.driversLicenseFront} />
              <UploadField label="Insurance document" required value={insuranceDocUrls} onChange={setInsuranceDocUrls} error={driverErrors.insuranceDocument} />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <UploadField label="License back" value={licenseBackUrls} onChange={setLicenseBackUrls} />
              <UploadField label="Profile photo" value={profilePhotoUrls} onChange={setProfilePhotoUrls} />
            </div>
            <div className="grid grid-cols-2 gap-6">
              <UploadField label="Vehicle photo" value={vehiclePhotoUrls} onChange={setVehiclePhotoUrls} />
              <UploadField label="Vehicle registration" value={vehicleRegUrls} onChange={setVehicleRegUrls} />
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
            <SectionLabel>Bank Details</SectionLabel>
            <BankCombobox banks={banks} selectedBank={selectedBank} onSelect={(b) => { setSelectedBank(b); setD('accountName', '') }} error={driverErrors.bank} />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Account number" required placeholder="0123456789"
                value={driver.accountNumber}
                onChange={(e) => { setD('accountNumber', e.target.value); setD('accountName', ''); setAccountVerifyError('') }}
                error={driverErrors.accountNumber}
              />
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Account name <span className="text-red-500">*</span></label>
                <div className={cn('w-full rounded-xl border px-3.5 py-2.5 text-sm min-h-[42px] flex items-center',
                  driverErrors.accountName ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50')}>
                  {verifyingAccount
                    ? <span className="text-slate-400 text-xs">Verifying…</span>
                    : driver.accountName
                      ? <span className="font-medium text-slate-900">{driver.accountName}</span>
                      : <span className="text-slate-400 text-xs">Auto-filled after verification</span>}
                </div>
                {accountVerifyError && <p className="mt-1 text-xs text-red-500">{accountVerifyError}</p>}
                <FieldError msg={driverErrors.accountName} />
              </div>
            </div>
          </div>

          {serverError && (
            <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{serverError}</div>
          )}

          <div className="flex justify-end gap-3 pb-8">
            <button onClick={() => setStep(1)} disabled={isPending} className="rounded-xl px-5 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors">Back</button>
            <button onClick={handleSubmit} disabled={isPending} className="rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50">
              {isPending ? 'Creating…' : 'Create Driver'}
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
              <p className="text-base font-bold text-slate-900">Driver provisioned!</p>
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
            <p className="mt-1 text-xs text-amber-600">This password will not be shown again. Driver should change it on first login.</p>
          </div>
          <button onClick={() => router.push('/dashboard/partners/drivers')}
            className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors">
            Done
          </button>
        </div>
      )}
    </main>
  )
}
