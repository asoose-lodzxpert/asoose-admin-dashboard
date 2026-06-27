'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/app/lib/utils'
import { updateCustomerStatus } from '@/app/actions/customers'
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

type ModalAction = { status: UserStatus; label: string; needsReason: boolean }

const REASON_PLACEHOLDER: Record<string, string> = {
  SUSPENDED:   'Reason for suspension…',
  BANNED:      'Reason for ban…',
  DEACTIVATED: 'Reason for deactivation…',
}

export function CustomerDetailClient({ customer: initial }: { customer: CustomerDetail }) {
  const router = useRouter()
  const [customer, setCustomer] = useState(initial)
  const [isPending, startTransition] = useTransition()
  const [modal, setModal] = useState<ModalAction | null>(null)
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const { status } = customer

  const actions: ModalAction[] = []
  if (status === 'ACTIVE') {
    actions.push(
      { status: 'SUSPENDED',   label: 'Suspend',     needsReason: true  },
      { status: 'BANNED',      label: 'Ban',         needsReason: true  },
      { status: 'DEACTIVATED', label: 'Deactivate',  needsReason: true  },
    )
  } else if (status === 'SUSPENDED') {
    actions.push(
      { status: 'ACTIVE',      label: 'Activate',    needsReason: false },
      { status: 'BANNED',      label: 'Ban',         needsReason: true  },
      { status: 'DEACTIVATED', label: 'Deactivate',  needsReason: true  },
    )
  } else if (status === 'BANNED') {
    actions.push(
      { status: 'ACTIVE',      label: 'Activate',    needsReason: false },
      { status: 'DEACTIVATED', label: 'Deactivate',  needsReason: true  },
    )
  } else if (status === 'DEACTIVATED' || status === 'PENDING_VERIFICATION') {
    actions.push(
      { status: 'ACTIVE',      label: 'Activate',    needsReason: false },
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
            {actions.map((a) => (
              <button
                key={a.status}
                onClick={() => openModal(a)}
                disabled={isPending}
                className={cn(
                  'rounded-xl px-3.5 py-2 text-xs font-semibold transition-colors disabled:opacity-50',
                  a.status === 'ACTIVE'
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

      {/* Body */}
      <div className="px-8 py-8 grid grid-cols-1 gap-5 lg:grid-cols-2">
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
          <div className="flex items-center justify-between rounded-xl bg-indigo-50 px-4 py-4">
            <p className="text-sm text-indigo-600 font-medium">Wallet Balance</p>
            <p className="text-2xl font-bold text-indigo-700">₦{customer.walletBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}</p>
          </div>
        </DetailCard>

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

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">{modal.label} Customer</h3>
            <p className="mt-1 text-sm text-slate-500">
              You are about to {modal.label.toLowerCase()} <strong>{customer.firstName} {customer.lastName}</strong>.
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
                  placeholder={REASON_PLACEHOLDER[modal.status] ?? 'Enter reason…'}
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
                  modal.status === 'ACTIVE' ? 'bg-emerald-600 hover:bg-emerald-700'
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
    </main>
  )
}
