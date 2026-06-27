'use client'

import { useState, useTransition, useEffect, useRef } from 'react'
import { cn, formatNaira, formatNumber } from '@/app/lib/utils'
import { Modal } from '@/app/components/ui/modal'
import { Button } from '@/app/components/ui/button'
import { getBanks } from '@/app/actions/partner-provision'
import {
  getUserWallet,
  getUserBankAccounts,
  resolveUserBankAccount,
  addUserBankAccount,
  getUserPayouts,
  requestUserPayout,
} from '@/app/actions/user-finance'
import type { UserBankAccount, UserWallet, PayoutSummary, PayoutStatus, Pagination } from '@/app/lib/types'

const INPUT_CLS =
  'w-full rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow'

type Tab = 'wallet' | 'bank-accounts' | 'payouts'

const PAYOUT_STATUS_STYLES: Record<PayoutStatus, string> = {
  PENDING:    'bg-amber-50 text-amber-700 ring-amber-600/20',
  APPROVED:   'bg-sky-50 text-sky-700 ring-sky-600/20',
  PROCESSING: 'bg-blue-50 text-blue-700 ring-blue-600/20',
  COMPLETED:  'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  PAID:       'bg-green-50 text-green-700 ring-green-600/20',
  REJECTED:   'bg-red-50 text-red-700 ring-red-600/20',
  FAILED:     'bg-red-50 text-red-600 ring-red-500/20',
  CANCELLED:  'bg-slate-100 text-slate-600 ring-slate-500/20',
}

const PAYOUT_STATUS_DOT: Record<PayoutStatus, string> = {
  PENDING:    'bg-amber-400',
  APPROVED:   'bg-sky-500',
  PROCESSING: 'bg-blue-500',
  COMPLETED:  'bg-emerald-500',
  PAID:       'bg-green-500',
  REJECTED:   'bg-red-500',
  FAILED:     'bg-red-500',
  CANCELLED:  'bg-slate-400',
}

/* ─── Wallet Tab ─────────────────────────────────────────── */

function WalletTab({ userId }: { userId: string }) {
  const [wallet, setWallet] = useState<UserWallet | null>(null)
  const [error, setError] = useState('')
  const [loading, startTransition] = useTransition()
  const fetched = useRef(false)

  useEffect(() => {
    if (fetched.current) return
    fetched.current = true
    startTransition(async () => {
      const res = await getUserWallet(userId)
      if (res.error) setError(res.error)
      else if (res.data) setWallet(res.data)
    })
  }, [userId])

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />
  if (!wallet) return null

  const statusColor = wallet.status === 'ACTIVE'
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
    : 'bg-red-50 text-red-700 ring-red-600/20'

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', statusColor)}>
          {wallet.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <BalanceCard label="Pending" amount={wallet.pendingBalance} color="amber" />
        <BalanceCard label="Locked" amount={wallet.lockedBalance} color="red" />
      </div>
    </div>
  )
}

function BalanceCard({ label, amount, color }: { label: string; amount: number; color: string }) {
  const bg: Record<string, string> = {
    indigo: 'bg-indigo-50 ring-indigo-200/60',
    emerald: 'bg-emerald-50 ring-emerald-200/60',
    amber: 'bg-amber-50 ring-amber-200/60',
    red: 'bg-red-50 ring-red-200/60',
  }
  const text: Record<string, string> = {
    indigo: 'text-indigo-700',
    emerald: 'text-emerald-700',
    amber: 'text-amber-700',
    red: 'text-red-700',
  }
  return (
    <div className={cn('rounded-xl px-4 py-3 ring-1 ring-inset', bg[color])}>
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={cn('mt-1 text-lg font-bold tracking-tight', text[color])}>{formatNaira(amount)}</p>
    </div>
  )
}

/* ─── Bank Accounts Tab ──────────────────────────────────── */

function BankAccountsTab({ userId }: { userId: string }) {
  const [accounts, setAccounts] = useState<UserBankAccount[]>([])
  const [error, setError] = useState('')
  const [loading, startTransition] = useTransition()
  const fetched = useRef(false)

  // Add account modal
  const [showAdd, setShowAdd] = useState(false)
  const [banks, setBanks] = useState<{ name: string; code: string }[]>([])
  const [bankSearch, setBankSearch] = useState('')
  const [selectedBank, setSelectedBank] = useState<{ name: string; code: string } | null>(null)
  const [accountNumber, setAccountNumber] = useState('')
  const [resolvedName, setResolvedName] = useState('')
  const [resolveError, setResolveError] = useState('')
  const [addError, setAddError] = useState('')
  const [resolvePending, startResolveTransition] = useTransition()
  const [addPending, startAddTransition] = useTransition()
  const [showDropdown, setShowDropdown] = useState(false)

  useEffect(() => {
    if (fetched.current) return
    fetched.current = true
    startTransition(async () => {
      const res = await getUserBankAccounts(userId)
      if (res.error) setError(res.error)
      else if (res.data) setAccounts(res.data)
    })
  }, [userId])

  function openAddModal() {
    setShowAdd(true)
    setBankSearch('')
    setSelectedBank(null)
    setAccountNumber('')
    setResolvedName('')
    setResolveError('')
    setAddError('')
    if (banks.length === 0) {
      startTransition(async () => {
        const res = await getBanks()
        if (res.data) setBanks(res.data)
      })
    }
  }

  // Auto-resolve
  useEffect(() => {
    if (!selectedBank || accountNumber.length !== 10) {
      setResolvedName('')
      setResolveError('')
      return
    }
    startResolveTransition(async () => {
      setResolvedName('')
      setResolveError('')
      const res = await resolveUserBankAccount(accountNumber, selectedBank.code)
      if (res.error) setResolveError(res.error)
      else if (res.data) setResolvedName(res.data.accountName)
    })
  }, [accountNumber, selectedBank])

  function handleAdd() {
    if (!selectedBank || !resolvedName) return
    startAddTransition(async () => {
      setAddError('')
      const res = await addUserBankAccount(userId, {
        accountNumber,
        accountName: resolvedName,
        bankCode: selectedBank.code,
        bankName: selectedBank.name,
      })
      if (res.error) { setAddError(res.error); return }
      if (res.data) setAccounts((prev) => [res.data!, ...prev])
      setShowAdd(false)
    })
  }

  const filteredBanks = bankSearch
    ? banks.filter((b) => b.name.toLowerCase().includes(bankSearch.toLowerCase()))
    : banks

  if (loading && accounts.length === 0) return <LoadingState />
  if (error) return <ErrorState message={error} />

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">{accounts.length} account{accounts.length !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={openAddModal}>Add Bank Account</Button>
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center">
          <p className="text-sm text-slate-400">No bank accounts linked</p>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map((acc) => (
            <div key={acc.id} className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-inset ring-slate-200/60">
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-900">{acc.bankName}</p>
                <p className="text-xs text-slate-500">{acc.accountNumber} · {acc.accountName}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                {acc.isDefault && (
                  <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-[10px] font-medium text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                    Default
                  </span>
                )}
                {acc.isVerified && (
                  <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    Verified
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Bank Account Modal */}
      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title="Add Bank Account"
        description="Select a bank and enter the account number to resolve."
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowAdd(false)} disabled={addPending}>
              Cancel
            </Button>
            <Button size="sm" loading={addPending} onClick={handleAdd} disabled={!resolvedName}>
              Add Account
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          {/* Bank selector */}
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Bank</label>
            <div className="relative">
              <input
                type="text"
                placeholder={selectedBank ? selectedBank.name : 'Search for a bank…'}
                value={selectedBank ? selectedBank.name : bankSearch}
                onChange={(e) => {
                  setBankSearch(e.target.value)
                  setSelectedBank(null)
                  setShowDropdown(true)
                }}
                onFocus={() => setShowDropdown(true)}
                className={INPUT_CLS}
              />
              {showDropdown && !selectedBank && (
                <div className="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-lg">
                  {filteredBanks.length === 0 ? (
                    <p className="px-4 py-3 text-sm text-slate-400">No banks found</p>
                  ) : (
                    filteredBanks.slice(0, 50).map((b) => (
                      <button
                        key={b.code + b.name}
                        type="button"
                        className="flex w-full items-center px-4 py-2.5 text-left text-sm text-slate-700 transition-colors hover:bg-slate-50"
                        onClick={() => {
                          setSelectedBank(b)
                          setBankSearch('')
                          setShowDropdown(false)
                        }}
                      >
                        {b.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Account number */}
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Account Number</label>
            <input
              type="text"
              inputMode="numeric"
              maxLength={10}
              placeholder="Enter 10-digit account number"
              value={accountNumber}
              onChange={(e) => setAccountNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className={INPUT_CLS}
            />
          </div>

          {/* Resolve result */}
          {resolvePending && (
            <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-3">
              <svg className="h-4 w-4 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <span className="text-sm text-slate-500">Resolving account…</span>
            </div>
          )}
          {resolvedName && (
            <div className="rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-inset ring-emerald-200/60">
              <p className="text-[10px] font-medium uppercase tracking-wide text-emerald-600">Account Name</p>
              <p className="mt-0.5 text-sm font-semibold text-emerald-800">{resolvedName}</p>
            </div>
          )}
          {resolveError && <p className="text-sm text-red-600">{resolveError}</p>}
          {addError && <p className="text-sm text-red-600">{addError}</p>}
        </div>
      </Modal>
    </div>
  )
}

/* ─── Payouts Tab ────────────────────────────────────────── */

function PayoutsTab({ userId }: { userId: string }) {
  const [payouts, setPayouts] = useState<PayoutSummary[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 20, total: 0, totalPages: 0 })
  const [page, setPage] = useState(1)
  const [error, setError] = useState('')
  const [loading, startTransition] = useTransition()
  const fetched = useRef(false)

  // Request modal
  const [showRequest, setShowRequest] = useState(false)
  const [amount, setAmount] = useState('')
  const [requestError, setRequestError] = useState('')
  const [requestPending, startRequestTransition] = useTransition()

  function fetchPayouts(pg: number) {
    startTransition(async () => {
      const res = await getUserPayouts(userId, { page: pg, limit: 20 })
      setPayouts(res.payouts)
      setPagination(res.pagination)
    })
  }

  useEffect(() => {
    if (fetched.current) return
    fetched.current = true
    fetchPayouts(1)
  }, [userId])

  function goToPage(pg: number) {
    setPage(pg)
    fetchPayouts(pg)
  }

  function openRequest() {
    setShowRequest(true)
    setAmount('')
    setRequestError('')
  }

  function handleRequest() {
    const num = parseFloat(amount)
    if (!num || num <= 0) { setRequestError('Enter a valid amount.'); return }
    startRequestTransition(async () => {
      setRequestError('')
      const res = await requestUserPayout(userId, num)
      if (res.error) { setRequestError(res.error); return }
      setShowRequest(false)
      fetchPayouts(1)
      setPage(1)
    })
  }

  if (loading && payouts.length === 0 && !error) return <LoadingState />
  if (error) return <ErrorState message={error} />

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-slate-500">{pagination.total} payout{pagination.total !== 1 ? 's' : ''}</p>
        <Button size="sm" onClick={openRequest}>Request Payout</Button>
      </div>

      {payouts.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-8 text-center">
          <p className="text-sm text-slate-400">No payouts yet</p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">ID</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Amount</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Net</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Status</th>
                  <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {payouts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-xs text-slate-500">{p.id.slice(0, 8)}…</td>
                    <td className="px-4 py-2.5 font-medium text-slate-900">{formatNaira(p.amount)}</td>
                    <td className="px-4 py-2.5 text-slate-600">{formatNaira(p.netAmount)}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', PAYOUT_STATUS_STYLES[p.status])}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', PAYOUT_STATUS_DOT[p.status])} />
                        {p.status.charAt(0) + p.status.slice(1).toLowerCase()}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-slate-500">
                      {new Date(p.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {pagination.totalPages > 1 && (
            <div className="mt-3 flex items-center justify-between">
              <p className="text-xs text-slate-400">Page {pagination.page} of {pagination.totalPages}</p>
              <div className="flex gap-2">
                <button
                  onClick={() => goToPage(page - 1)}
                  disabled={page <= 1 || loading}
                  className={cn('rounded-lg px-3 py-1 text-xs font-medium transition-colors', page <= 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-100')}
                >
                  Previous
                </button>
                <button
                  onClick={() => goToPage(page + 1)}
                  disabled={page >= pagination.totalPages || loading}
                  className={cn('rounded-lg px-3 py-1 text-xs font-medium transition-colors', page >= pagination.totalPages ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-100')}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Request Payout Modal */}
      <Modal
        open={showRequest}
        onClose={() => setShowRequest(false)}
        title="Request Payout"
        description="Enter the amount to withdraw from this user's wallet."
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowRequest(false)} disabled={requestPending}>
              Cancel
            </Button>
            <Button size="sm" loading={requestPending} onClick={handleRequest}>
              Request
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Amount (NGN)</label>
            <input
              type="number"
              min="1"
              step="1"
              placeholder="e.g. 5000"
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setRequestError('') }}
              className={INPUT_CLS}
              autoFocus
            />
          </div>
          {requestError && <p className="text-sm text-red-600">{requestError}</p>}
        </div>
      </Modal>
    </div>
  )
}

/* ─── Shared loading / error ─────────────────────────────── */

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-10">
      <svg className="h-5 w-5 animate-spin text-indigo-500" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  )
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600">{message}</div>
  )
}

/* ─── Main Export ─────────────────────────────────────────── */

const TABS: { key: Tab; label: string }[] = [
  { key: 'wallet', label: 'Wallet' },
  { key: 'bank-accounts', label: 'Bank Accounts' },
  { key: 'payouts', label: 'Payouts' },
]

export function UserFinanceSection({ userId }: { userId: string }) {
  const [tab, setTab] = useState<Tab>('wallet')

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header with tabs */}
      <div className="border-b border-slate-100 px-6 py-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Finance</h2>
        </div>
        <div className="mt-3 flex gap-4">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={cn(
                'border-b-2 pb-2 text-sm font-medium transition-colors -mb-[17px]',
                tab === t.key
                  ? 'border-indigo-600 text-indigo-600'
                  : 'border-transparent text-slate-400 hover:text-slate-600'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-6 py-5">
        {tab === 'wallet' && <WalletTab userId={userId} />}
        {tab === 'bank-accounts' && <BankAccountsTab userId={userId} />}
        {tab === 'payouts' && <PayoutsTab userId={userId} />}
      </div>
    </div>
  )
}
