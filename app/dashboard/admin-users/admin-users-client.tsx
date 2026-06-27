'use client'

import { useState, useTransition, useRef } from 'react'
import { cn } from '@/app/lib/utils'
import { provisionAdmin, getAdmins, deactivateAdmin } from '@/app/actions/admin-users'
import type { AdminRole, AnyAdminRole, AdminUser, ProvisionResult } from '@/app/actions/admin-users'
import type { UserStatus } from '@/app/lib/types'

const ROLE_LABELS: Record<AnyAdminRole, string> = {
  ADMIN:           'Admin',
  ADMIN_FINANCE:   'Finance Admin',
  ADMIN_SUPPORT:   'Support Admin',
  ADMIN_MANAGER:   'Manager Admin',
  SUPER_ADMIN:     'Super Admin',
}

const ROLE_COLORS: Record<AnyAdminRole, string> = {
  ADMIN:           'bg-indigo-50 text-indigo-700',
  ADMIN_FINANCE:   'bg-emerald-50 text-emerald-700',
  ADMIN_SUPPORT:   'bg-sky-50 text-sky-700',
  ADMIN_MANAGER:   'bg-violet-50 text-violet-700',
  SUPER_ADMIN:     'bg-amber-50 text-amber-700',
}

const PROVISIONABLE: AdminRole[] = ['ADMIN', 'ADMIN_FINANCE', 'ADMIN_SUPPORT', 'ADMIN_MANAGER']

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
  return s === 'PENDING_VERIFICATION' ? 'Pending' : s.charAt(0) + s.slice(1).toLowerCase()
}

const INITIAL = { email: '', firstName: '', lastName: '', phone: '', role: '' as AdminRole | '' }

export function AdminUsersClient({ initialAdmins, total }: { initialAdmins: AdminUser[]; total: number }) {
  const [admins, setAdmins] = useState(initialAdmins)
  const [count, setCount] = useState(total)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<AnyAdminRole | ''>('')
  const [statusFilter, setStatusFilter] = useState<UserStatus | ''>('')
  const [listPending, startListTransition] = useTransition()
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  // Provision modal
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(INITIAL)
  const [fieldErrors, setFieldErrors] = useState<Partial<typeof INITIAL>>({})
  const [serverError, setServerError] = useState('')
  const [success, setSuccess] = useState<ProvisionResult | null>(null)
  const [isPending, startTransition] = useTransition()

  // Deactivate modal
  const [deactivateTarget, setDeactivateTarget] = useState<AdminUser | null>(null)
  const [deactivateReason, setDeactivateReason] = useState('')
  const [deactivateError, setDeactivateError] = useState('')
  const [deactivatePending, startDeactivateTransition] = useTransition()

  function refetch(opts: { search?: string; role?: AnyAdminRole | ''; status?: UserStatus | '' }) {
    const s = opts.search ?? search
    const r = opts.role !== undefined ? opts.role : roleFilter
    const st = opts.status !== undefined ? opts.status : statusFilter
    startListTransition(async () => {
      const res = await getAdmins({ search: s || undefined, role: r || undefined, status: st || undefined, page: 1, limit: 20 })
      setAdmins(res.admins)
      setCount(res.pagination.total)
    })
  }

  function onSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setSearch(val)
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => refetch({ search: val }), 400)
  }

  function openModal() {
    setForm(INITIAL)
    setFieldErrors({})
    setServerError('')
    setSuccess(null)
    setShowModal(true)
  }

  function closeModal() {
    setShowModal(false)
    if (success) refetch({})
  }

  function validate() {
    const errs: Partial<typeof INITIAL> = {}
    if (!form.email.trim()) errs.email = 'Required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Invalid email'
    if (!form.firstName.trim()) errs.firstName = 'Required'
    if (!form.lastName.trim()) errs.lastName = 'Required'
    if (!form.role) errs.role = 'Required' as AdminRole
    return errs
  }

  function handleSubmit() {
    const errs = validate()
    if (Object.keys(errs).length) { setFieldErrors(errs); return }
    setFieldErrors({})
    setServerError('')
    startTransition(async () => {
      const res = await provisionAdmin({
        email: form.email.trim(),
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim() || undefined,
        role: form.role as AdminRole,
      })
      if (res.error) { setServerError(res.error); return }
      setSuccess(res.data!)
    })
  }

  function openDeactivate(admin: AdminUser) {
    setDeactivateTarget(admin)
    setDeactivateReason('')
    setDeactivateError('')
  }

  function handleDeactivate() {
    if (!deactivateTarget) return
    startDeactivateTransition(async () => {
      const res = await deactivateAdmin(deactivateTarget.id, deactivateReason.trim() || undefined)
      if (res.error) { setDeactivateError(res.error); return }
      if (res.data) setAdmins(prev => prev.map(a => a.id === res.data!.id ? res.data! : a))
      setDeactivateTarget(null)
    })
  }

  return (
    <main className="px-8 py-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Admin Users</h1>
          <p className="mt-0.5 text-sm text-slate-500">{count} admin accounts on the platform.</p>
        </div>
        <button
          onClick={openModal}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
            <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
          </svg>
          Provision Admin
        </button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex items-center gap-2.5 flex-wrap">
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={onSearch}
            placeholder="Search name, email, phone…"
            className="h-9 rounded-xl border-0 bg-white pl-9 pr-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none w-56"
          />
          {listPending && (
            <svg className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
        </div>
        <div className="relative">
          <select value={roleFilter} onChange={(e) => { const v = e.target.value as AnyAdminRole | ''; setRoleFilter(v); refetch({ role: v }) }}
            className="h-9 appearance-none rounded-xl border-0 bg-white pl-3.5 pr-9 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer">
            <option value="">All roles</option>
            <option value="ADMIN">Admin</option>
            <option value="ADMIN_FINANCE">Finance Admin</option>
            <option value="ADMIN_SUPPORT">Support Admin</option>
            <option value="ADMIN_MANAGER">Manager Admin</option>
            <option value="SUPER_ADMIN">Super Admin</option>
          </select>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
            <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="relative">
          <select value={statusFilter} onChange={(e) => { const v = e.target.value as UserStatus | ''; setStatusFilter(v); refetch({ status: v }) }}
            className="h-9 appearance-none rounded-xl border-0 bg-white pl-3.5 pr-9 text-sm font-medium text-slate-700 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer">
            <option value="">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="DEACTIVATED">Deactivated</option>
          </select>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
            <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
          </svg>
        </div>
        {(search || roleFilter || statusFilter) && (
          <button
            onClick={() => { setSearch(''); setRoleFilter(''); setStatusFilter(''); refetch({ search: '', role: '', status: '' }) }}
            className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
          >
            Reset
          </button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {admins.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm font-medium text-slate-700">No admins found</p>
            <p className="mt-0.5 text-xs text-slate-400">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Admin</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Role</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Status</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Phone</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Last Login</th>
                  <th className="px-5 py-3.5 text-right text-xs font-medium uppercase tracking-wide text-slate-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {admins.map((a) => {
                  const initials = `${a.firstName[0] ?? ''}${a.lastName[0] ?? ''}`.toUpperCase()
                  const canDeactivate = a.role !== 'SUPER_ADMIN' && a.status !== 'DEACTIVATED'
                  return (
                    <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-xs font-bold text-indigo-700">{initials}</div>
                          <div>
                            <p className="font-medium text-slate-900">{a.firstName} {a.lastName}</p>
                            <p className="text-xs text-slate-400">{a.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={cn('rounded-full px-2.5 py-1 text-xs font-semibold', ROLE_COLORS[a.role])}>{ROLE_LABELS[a.role]}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', STATUS_STYLES[a.status])}>
                          <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[a.status])} />
                          {formatStatus(a.status)}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-slate-500">{a.phone ?? '—'}</td>
                      <td className="px-5 py-3.5 text-xs text-slate-400">
                        {a.lastLoginAt
                          ? new Date(a.lastLoginAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
                          : 'Never'}
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {canDeactivate ? (
                          <button
                            onClick={() => openDeactivate(a)}
                            className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
                          >
                            Deactivate
                          </button>
                        ) : (
                          <span className="text-xs text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Provision Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            {success ? (
              <div>
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-emerald-600">
                      <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-base font-bold text-slate-900">Admin provisioned!</p>
                    <p className="text-xs text-slate-500">Credentials have been emailed to the new admin.</p>
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-4 space-y-2 text-sm">
                  <div className="flex justify-between"><span className="text-slate-500">Name</span><span className="font-medium text-slate-900">{success.user.firstName} {success.user.lastName}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Email</span><span className="font-medium text-slate-900">{success.user.email}</span></div>
                  <div className="flex justify-between"><span className="text-slate-500">Role</span><span className={cn('rounded-full px-2 py-0.5 text-xs font-semibold', ROLE_COLORS[success.user.role])}>{ROLE_LABELS[success.user.role]}</span></div>
                </div>
                <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-xs font-semibold text-amber-800 mb-1.5">Temporary Password — share securely</p>
                  <p className="font-mono text-lg font-bold text-amber-900 tracking-wider">{success.temporaryPassword}</p>
                  <p className="mt-1 text-xs text-amber-600">This password will not be shown again. The admin should change it on first login.</p>
                </div>
                <button
                  onClick={closeModal}
                  className="mt-5 w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
                >
                  Done
                </button>
              </div>
            ) : (
              <div>
                <h3 className="text-base font-bold text-slate-900 mb-4">Provision New Admin</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">First name <span className="text-red-500">*</span></label>
                      <input
                        value={form.firstName}
                        onChange={(e) => setForm(f => ({ ...f, firstName: e.target.value }))}
                        placeholder="Ada"
                        className={cn('w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',
                          fieldErrors.firstName ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50')}
                      />
                      {fieldErrors.firstName && <p className="mt-1 text-xs text-red-500">{fieldErrors.firstName}</p>}
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">Last name <span className="text-red-500">*</span></label>
                      <input
                        value={form.lastName}
                        onChange={(e) => setForm(f => ({ ...f, lastName: e.target.value }))}
                        placeholder="Obi"
                        className={cn('w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',
                          fieldErrors.lastName ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50')}
                      />
                      {fieldErrors.lastName && <p className="mt-1 text-xs text-red-500">{fieldErrors.lastName}</p>}
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Email <span className="text-red-500">*</span></label>
                    <input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                      placeholder="ops.manager@asoose.com"
                      className={cn('w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',
                        fieldErrors.email ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50')}
                    />
                    {fieldErrors.email && <p className="mt-1 text-xs text-red-500">{fieldErrors.email}</p>}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Phone <span className="text-slate-400 font-normal">(optional)</span></label>
                    <input
                      type="tel"
                      value={form.phone}
                      onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                      placeholder="+2348012345678"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Role <span className="text-red-500">*</span></label>
                    <div className="relative">
                      <select
                        value={form.role}
                        onChange={(e) => setForm(f => ({ ...f, role: e.target.value as AdminRole }))}
                        className={cn('w-full appearance-none rounded-xl border px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 cursor-pointer',
                          !form.role ? 'text-slate-400' : 'text-slate-900',
                          fieldErrors.role ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50')}
                      >
                        <option value="" disabled>Select a role…</option>
                        {PROVISIONABLE.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                      </select>
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
                        <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                      </svg>
                    </div>
                    {fieldErrors.role && <p className="mt-1 text-xs text-red-500">{fieldErrors.role}</p>}
                  </div>
                </div>
                {serverError && <p className="mt-4 rounded-xl bg-red-50 px-3 py-2.5 text-xs text-red-600">{serverError}</p>}
                <div className="mt-6 flex justify-end gap-2">
                  <button
                    onClick={() => setShowModal(false)}
                    disabled={isPending}
                    className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={isPending}
                    className="rounded-xl bg-indigo-600 px-5 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
                  >
                    {isPending ? 'Provisioning…' : 'Provision Admin'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Deactivate Modal */}
      {deactivateTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Deactivate Admin</h3>
            <p className="mt-1 text-sm text-slate-500">
              You are about to deactivate <strong>{deactivateTarget.firstName} {deactivateTarget.lastName}</strong>. This sets their status to deactivated, soft-deletes the account, and forces a logout.
            </p>
            <div className="mt-4">
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">Reason <span className="text-slate-400 font-normal">(optional)</span></label>
              <textarea
                value={deactivateReason}
                onChange={(e) => setDeactivateReason(e.target.value)}
                rows={3}
                placeholder="Left the company"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 resize-none"
              />
            </div>
            {deactivateError && <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-xs text-red-600">{deactivateError}</p>}
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setDeactivateTarget(null)}
                disabled={deactivatePending}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeactivate}
                disabled={deactivatePending}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deactivatePending ? 'Deactivating…' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}
