'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/app/lib/utils'
import { updateCustomerStatus, updateUserProfile } from '@/app/actions/customers'
import { adjustUserWallet } from '@/app/actions/user-finance'
import type { CustomerDetail, UserStatus } from '@/app/lib/types'

const STATUS_STYLES: Record<UserStatus, string> = {
  ACTIVE:               'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  PENDING_VERIFICATION: 'bg-amber-50 text-amber-700 ring-amber-600/20',
  SUSPENDED:            'bg-orange-50 text-orange-700 ring-orange-600/20',
  BANNED:               'bg-red-50 text-red-700 ring-red-600/20',
  DEACTIVATED:          'bg-slate-100 text-slate-500 ring-slate-200',
}
const STATUS_DOT: Record<UserStatus, string> = {
  ACTIVE:               'bg-emerald-500',
  PENDING_VERIFICATION: 'bg-amber-400',
  SUSPENDED:            'bg-orange-500',
  BANNED:               'bg-red-500',
  DEACTIVATED:          'bg-slate-400',
}
function formatStatus(s: UserStatus) {
  return s === 'PENDING_VERIFICATION' ? 'Pending Verification' : s.charAt(0) + s.slice(1).toLowerCase()
}

function DetailCard({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('rounded-2xl border border-slate-200 bg-white shadow-sm', className)}>
      <div className="px-6 py-5">
        <p className="mb-4 text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
        {children}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-slate-50 last:border-0">
      <span className="text-xs text-slate-400 shrink-0 w-36">{label}</span>
      <span className="text-sm font-medium text-slate-700 text-right">{value ?? '—'}</span>
    </div>
  )
}

function Toast({ msg, ok, onDismiss }: { msg: string; ok: boolean; onDismiss: () => void }) {
  return (
    <div
      onClick={onDismiss}
      className={cn(
        'fixed bottom-6 right-6 z-50 flex cursor-pointer items-center gap-2 rounded-2xl px-4 py-3 text-sm font-medium text-white',
        ok ? 'bg-emerald-600' : 'bg-red-600'
      )}
    >
      {ok
        ? <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" /></svg>
        : <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0"><path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" /></svg>
      }
      {msg}
    </div>
  )
}

type ModalAction = { status: UserStatus; label: string; needsReason: boolean; destructive?: boolean }

const REASON_PLACEHOLDER: Record<string, string> = {
  SUSPENDED:   'Reason for suspension…',
  BANNED:      'Reason for ban…',
  DEACTIVATED: 'Reason for deactivation…',
}

type EditForm = {
  firstName: string
  lastName: string
  email: string
  phone: string
  phoneCountryCode: string
}

export function CustomerDetailClient({ customer: initial }: { customer: CustomerDetail }) {
  const router = useRouter()
  const [customer, setCustomer] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const [modal, setModal] = useState<ModalAction | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function showToast(msg: string, ok: boolean) {
    if (toastTimer.current) clearTimeout(toastTimer.current)
    setToast({ msg, ok })
    toastTimer.current = setTimeout(() => setToast(null), 3500)
  }

  const [showWalletAdjust, setShowWalletAdjust] = useState(false)
  const [walletDirection, setWalletDirection] = useState<'CREDIT' | 'DEBIT'>('CREDIT')
  const [walletAmount, setWalletAmount] = useState('')
  const [walletReason, setWalletReason] = useState('')
  const [walletError, setWalletError] = useState('')
  const [walletBalance, setWalletBalance] = useState(customer.walletBalance)
  const [walletPending, startWalletTransition] = useTransition()

  function openWalletAdjust() {
    setWalletDirection('CREDIT')
    setWalletAmount('')
    setWalletReason('')
    setWalletError('')
    setShowWalletAdjust(true)
  }

  function handleWalletAdjust() {
    const num = parseFloat(walletAmount)
    if (!num || num <= 0) { setWalletError('Enter a valid amount.'); return }
    if (!walletReason.trim()) { setWalletError('Reason is required.'); return }
    startWalletTransition(async () => {
      setWalletError('')
      const res = await adjustUserWallet(customer.id, { direction: walletDirection, amount: num, reason: walletReason.trim() })
      if (res.error) { setWalletError(res.error); return }
      if (res.data) setWalletBalance(res.data.availableBalance)
      setShowWalletAdjust(false)
      showToast(`Wallet ${walletDirection === 'CREDIT' ? 'credited' : 'debited'} successfully`, true)
    })
  }

  const [showEdit, setShowEdit] = useState(false)
  const [editForm, setEditForm] = useState<EditForm>({
    firstName: '', lastName: '', email: '', phone: '', phoneCountryCode: '',
  })
  const [editError, setEditError] = useState('')
  const [editPending, startEditTransition] = useTransition()

  function openEdit() {
    setEditForm({
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone ?? '',
      phoneCountryCode: customer.phoneCountryCode ?? '+234',
    })
    setEditError('')
    setShowEdit(true)
  }

  function handleEditSave() {
    const payload: Parameters<typeof updateUserProfile>[1] = {}
    if (editForm.firstName.trim())       payload.firstName       = editForm.firstName.trim()
    if (editForm.lastName.trim())        payload.lastName        = editForm.lastName.trim()
    if (editForm.email.trim())           payload.email           = editForm.email.trim()
    if (editForm.phone.trim())           payload.phone           = editForm.phone.trim()
    if (editForm.phoneCountryCode.trim()) payload.phoneCountryCode = editForm.phoneCountryCode.trim()
    startEditTransition(async () => {
      const res = await updateUserProfile(customer.id, payload)
      if (res.error) {
        setEditError(res.error)
        showToast(res.error, false)
        return
      }
      if (res.data) setCustomer(res.data)
      setShowEdit(false)
      showToast('Profile updated successfully', true)
    })
  }

  const { status } = customer

  const isDeleted = customer.deletedAt !== null

  const actions: ModalAction[] = []
  if (status === 'ACTIVE') {
    actions.push(
      { status: 'SUSPENDED',   label: 'Suspend',         needsReason: true              },
      { status: 'BANNED',      label: 'Ban',             needsReason: true              },
      { status: 'DEACTIVATED', label: 'Delete account',  needsReason: true, destructive: true },
    )
  } else if (status === 'SUSPENDED') {
    actions.push(
      { status: 'ACTIVE',      label: 'Activate',        needsReason: false },
      { status: 'BANNED',      label: 'Ban',             needsReason: true  },
      { status: 'DEACTIVATED', label: 'Deactivate',      needsReason: true  },
    )
  } else if (status === 'BANNED') {
    actions.push(
      { status: 'ACTIVE',      label: 'Activate',        needsReason: false },
      { status: 'DEACTIVATED', label: 'Deactivate',      needsReason: true  },
    )
  } else if (status === 'DEACTIVATED' || status === 'PENDING_VERIFICATION') {
    actions.push(
      { status: 'ACTIVE', label: isDeleted ? 'Restore Account' : 'Activate', needsReason: false },
    )
  }

  function openModal(action: ModalAction) {
    if (!action.needsReason) {
      executeAction(action.status, '')
      return
    }
    setReason('')
    setError('')
    setModal(action)
  }

  function executeAction(newStatus: UserStatus, r: string) {
    startTransition(async () => {
      const res = await updateCustomerStatus(customer.id, newStatus, r || undefined)
      if (res.error) { setError(res.error); return }
      if (res.data) setCustomer(res.data)
      setModal(null)
    })
  }

  const initials = `${customer.firstName[0] ?? ''}${customer.lastName[0] ?? ''}`.toUpperCase()

  return (
    <main className="min-h-screen bg-slate-50">
      {/* Sticky header */}
      <div className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur-sm px-8 py-4">
        <div className="flex items-center gap-4">
          <button onClick={() => router.back()} className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
              <path fillRule="evenodd" d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z" clipRule="evenodd" />
            </svg>
          </button>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">{initials}</div>
          <div className="flex-1 min-w-0">
            <p className="text-lg font-bold text-slate-900 truncate">{customer.firstName} {customer.lastName}</p>
            <p className="text-xs text-slate-400 truncate">{customer.email}</p>
          </div>
          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', STATUS_STYLES[status])}>
            <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[status])} />
            {formatStatus(status)}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={openEdit}
              disabled={isPending}
              className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Edit Profile
            </button>
            {actions.map((a) => (
              <button
                key={a.label}
                onClick={() => openModal(a)}
                disabled={isPending}
                className={cn(
                  'rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-50',
                  a.destructive
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : a.status === 'ACTIVE'
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                    : a.status === 'SUSPENDED'
                    ? 'bg-orange-100 text-orange-700 hover:bg-orange-200'
                    : a.status === 'BANNED'
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Deleted banner */}
      {isDeleted && (
        <div className="mx-8 mt-8 flex items-center gap-4 rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-rose-600">
              <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 3.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-rose-900">Account deleted</p>
            <p className="mt-0.5 text-xs text-rose-600">
              Soft-deleted on {new Date(customer.deletedAt!).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}.
              This account is inactive and hidden from normal views.
            </p>
          </div>
          <button
            onClick={() => executeAction('ACTIVE', '')}
            disabled={isPending}
            className="shrink-0 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
          >
            {isPending ? 'Restoring…' : 'Restore account'}
          </button>
        </div>
      )}

      {/* Body */}
      <div className={cn('px-8 grid grid-cols-1 gap-5 lg:grid-cols-2', isDeleted ? 'py-6' : 'py-8')}>
        {/* Personal Info */}
        <DetailCard title="Personal Information">
          <Row label="First name" value={customer.firstName} />
          <Row label="Last name" value={customer.lastName} />
          <Row label="Email" value={customer.email} />
          <Row label="Phone" value={customer.phone ? `${customer.phoneCountryCode ?? ''}${customer.phone}` : null} />
          <Row label="Role" value={customer.role} />
          <Row label="Auth provider" value={<span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">{customer.authProvider}</span>} />
          <Row label="Member since" value={new Date(customer.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })} />
        </DetailCard>

        {/* Verification */}
        <DetailCard title="Verification">
          <Row label="Email verified"
            value={
              <span className={cn('text-xs font-semibold', customer.emailVerified ? 'text-emerald-600' : 'text-red-500')}>
                {customer.emailVerified ? 'Verified' : 'Not verified'}
              </span>
            }
          />
          <Row label="Phone verified"
            value={
              <span className={cn('text-xs font-semibold', customer.phoneVerified ? 'text-emerald-600' : 'text-red-500')}>
                {customer.phoneVerified ? 'Verified' : 'Not verified'}
              </span>
            }
          />
          <Row label="Account active"
            value={
              <span className={cn('text-xs font-semibold', customer.isActive ? 'text-emerald-600' : 'text-slate-400')}>
                {customer.isActive ? 'Yes' : 'No'}
              </span>
            }
          />
          <Row label="Status" value={formatStatus(customer.status)} />
        </DetailCard>

        {/* Wallet */}
        <DetailCard title="Wallet">
          <div className="rounded-2xl bg-indigo-600 px-5 py-4 text-white">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-medium text-indigo-200 uppercase tracking-wider">Available Balance</p>
                <p className="mt-1 text-3xl font-bold tracking-tight">
                  ₦{walletBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <button
                type="button"
                onClick={openWalletAdjust}
                className="shrink-0 mt-0.5 inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-3 py-1.5 text-xs font-semibold text-white hover:bg-white/25 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                </svg>
                Adjust
              </button>
            </div>
          </div>
        </DetailCard>

        {/* Wallet Adjust Modal */}
        {showWalletAdjust && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
              <h3 className="text-base font-bold text-slate-900">Adjust Wallet Balance</h3>
              <p className="mt-1 text-sm text-slate-500">Credit or debit this customer's wallet. A reason is required for audit purposes.</p>

              <div className="mt-5 space-y-4">
                {/* Direction */}
                <div className="grid grid-cols-2 gap-2">
                  {(['CREDIT', 'DEBIT'] as const).map(d => (
                    <button
                      key={d}
                      type="button"
                      onClick={() => setWalletDirection(d)}
                      className={cn(
                        'rounded-xl border py-2.5 text-sm font-semibold transition-all',
                        walletDirection === d
                          ? d === 'CREDIT'
                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-500'
                            : 'border-red-500 bg-red-50 text-red-700 ring-1 ring-inset ring-red-500'
                          : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                      )}
                    >
                      {d === 'CREDIT' ? '+ Credit' : '− Debit'}
                    </button>
                  ))}
                </div>

                {/* Amount */}
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Amount (NGN)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    placeholder="e.g. 5000"
                    value={walletAmount}
                    onChange={(e) => { setWalletAmount(e.target.value); setWalletError('') }}
                    autoFocus
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {/* Reason */}
                <div>
                  <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Reason</label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Refund for failed order #12345"
                    value={walletReason}
                    onChange={(e) => { setWalletReason(e.target.value); setWalletError('') }}
                    className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>

                {walletError && <p className="text-sm text-red-600">{walletError}</p>}
              </div>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowWalletAdjust(false)}
                  disabled={walletPending}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleWalletAdjust}
                  disabled={walletPending}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50',
                    walletDirection === 'CREDIT' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
                  )}
                >
                  {walletPending && (
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {walletPending ? 'Saving…' : walletDirection === 'CREDIT' ? 'Credit Wallet' : 'Debit Wallet'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Location */}
        <DetailCard title="Location">
          <Row label="City ID" value={customer.cityId} />
          <Row label="Latitude" value={customer.latitude} />
          <Row label="Longitude" value={customer.longitude} />
        </DetailCard>

        {/* Notification Preferences */}
        {customer.notificationsPreferences && (
          <DetailCard title="Notification Preferences">
            <Row label="Push" value={
              <span className={cn('text-xs font-semibold', customer.notificationsPreferences.push ? 'text-emerald-600' : 'text-slate-400')}>
                {customer.notificationsPreferences.push ? 'Enabled' : 'Disabled'}
              </span>
            } />
            <Row label="Email" value={
              <span className={cn('text-xs font-semibold', customer.notificationsPreferences.email ? 'text-emerald-600' : 'text-slate-400')}>
                {customer.notificationsPreferences.email ? 'Enabled' : 'Disabled'}
              </span>
            } />
            <Row label="SMS" value={
              <span className={cn('text-xs font-semibold', customer.notificationsPreferences.sms ? 'text-emerald-600' : 'text-slate-400')}>
                {customer.notificationsPreferences.sms ? 'Enabled' : 'Disabled'}
              </span>
            } />
          </DetailCard>
        )}

        {/* Account Meta */}
        <DetailCard title="Account Activity">
          <Row label="Last login"
            value={customer.lastLoginAt
              ? new Date(customer.lastLoginAt).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
              : null}
          />
          <Row label="Last login IP" value={customer.lastLoginIp} />
          <Row label="Updated at"
            value={new Date(customer.updatedAt).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
          />
          {customer.deletedAt && (
            <Row label="Deleted at"
              value={<span className="text-red-500">{new Date(customer.deletedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}</span>}
            />
          )}
        </DetailCard>
      </div>

      {/* Edit Profile modal */}
      {showEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setShowEdit(false) }}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Edit Profile</h3>
            <p className="mt-0.5 text-sm text-slate-500">{customer.firstName} {customer.lastName}</p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">First Name</label>
                <input
                  value={editForm.firstName}
                  onChange={(e) => setEditForm(f => ({ ...f, firstName: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Last Name</label>
                <input
                  value={editForm.lastName}
                  onChange={(e) => setEditForm(f => ({ ...f, lastName: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Country Code</label>
                <input
                  value={editForm.phoneCountryCode}
                  onChange={(e) => setEditForm(f => ({ ...f, phoneCountryCode: e.target.value }))}
                  placeholder="+234"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone</label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))}
                  placeholder="8031234567"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {editError && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{editError}</p>}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowEdit(false)}
                disabled={editPending}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleEditSave}
                disabled={editPending}
                className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
              >
                {editPending ? 'Saving…' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className={cn('text-base font-bold', modal.destructive ? 'text-red-700' : 'text-slate-900')}>
              {modal.label}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              {modal.destructive
                ? <>You are about to permanently soft-delete <strong>{customer.firstName} {customer.lastName}</strong>{"'"}s account. They will lose access immediately.</>
                : <>You are about to {modal.label.toLowerCase()} <strong>{customer.firstName} {customer.lastName}</strong>.</>
              }
            </p>
            {modal.needsReason && (
              <div className="mt-4">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Reason <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder={modal.label === 'Delete account' ? 'Reason for deleting this account…' : (REASON_PLACEHOLDER[modal.status] ?? 'Enter reason…')}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
                />
              </div>
            )}
            {error && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{error}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setModal(null)}
                disabled={isPending}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (modal.needsReason && !reason.trim()) { setError('A reason is required.'); return }
                  setError('')
                  executeAction(modal.status, reason)
                }}
                disabled={isPending}
                className={cn(
                  'rounded-xl px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50',
                  modal.destructive ? 'bg-red-600 hover:bg-red-700'
                  : modal.status === 'ACTIVE' ? 'bg-emerald-600 hover:bg-emerald-700'
                  : modal.status === 'SUSPENDED' ? 'bg-orange-500 hover:bg-orange-600'
                  : modal.status === 'BANNED' ? 'bg-red-600 hover:bg-red-700'
                  : 'bg-slate-700 hover:bg-slate-800'
                )}
              >
                {isPending ? 'Saving…' : modal.label}
              </button>
            </div>
          </div>
        </div>
      )}
      {toast && <Toast msg={toast.msg} ok={toast.ok} onDismiss={() => setToast(null)} />}
    </main>
  )
}
