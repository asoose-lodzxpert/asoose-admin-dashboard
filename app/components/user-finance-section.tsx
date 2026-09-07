'use client'

import { useState, useTransition, useEffect, useRef, useCallback } from 'react'
import { cn, formatNaira, formatNumber } from '@/app/lib/utils'
import { Modal } from '@/app/components/ui/modal'
import { Button } from '@/app/components/ui/button'
import { useToast } from '@/app/components/ui/toast'
import { getBanks } from '@/app/actions/partner-provision'
import {
  getUserWallet,
  getUserBankAccounts,
  resolveUserBankAccount,
  addUserBankAccount,
  getUserPayouts,
  requestUserPayout,
} from '@/app/actions/user-finance'
import type { UserBankAccount, UserWallet, PayoutSummary, PayoutStatus, Pagination, WalletAdjustTarget } from '@/app/lib/types'

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

type WalletAdjustAction = (payload: {
  direction: 'CREDIT' | 'DEBIT'
  amount: number
  reason: string
  target?: WalletAdjustTarget
}) => Promise<{ data?: UserWallet; error?: string }>

/**
 * The wallet adjust dialog collapses the (direction × target) matrix into a
 * single list of plain-language actions so the operator picks intent, not
 * mechanics. `EARNINGS` actions hit the withdrawable balance; `ARREARS`
 * actions book or waive a debt that's auto-recovered from future earnings.
 */
type AdjustMode = 'CREDIT_EARNINGS' | 'DEBIT_EARNINGS' | 'BOOK_ARREARS' | 'FORGIVE_ARREARS'

const ADJUST_MODES: Record<AdjustMode, {
  label: string
  hint: string
  direction: 'CREDIT' | 'DEBIT'
  target?: WalletAdjustTarget
  cta: string
  done: string
  danger: boolean
}> = {
  CREDIT_EARNINGS: {
    label: 'Credit earnings',
    hint: 'Add to the withdrawable balance',
    direction: 'CREDIT',
    cta: 'Credit Earnings',
    done: 'Earnings credited.',
    danger: false,
  },
  DEBIT_EARNINGS: {
    label: 'Debit earnings',
    hint: 'Deduct from the balance — fails if funds are short',
    direction: 'DEBIT',
    cta: 'Debit Earnings',
    done: 'Earnings debited.',
    danger: true,
  },
  BOOK_ARREARS: {
    label: 'Book arrears',
    hint: 'Record a debt — recovered from future earnings, works on an empty wallet',
    direction: 'DEBIT',
    target: 'ARREARS',
    cta: 'Book Arrears',
    done: 'Arrears booked.',
    danger: true,
  },
  FORGIVE_ARREARS: {
    label: 'Forgive arrears',
    hint: 'Waive an outstanding debt',
    direction: 'CREDIT',
    target: 'ARREARS',
    cta: 'Forgive Arrears',
    done: 'Arrears forgiven.',
    danger: false,
  },
}

const EARNER_MODES: AdjustMode[] = ['CREDIT_EARNINGS', 'DEBIT_EARNINGS', 'BOOK_ARREARS', 'FORGIVE_ARREARS']
const USER_MODES: AdjustMode[] = ['CREDIT_EARNINGS', 'DEBIT_EARNINGS']

/**
 * Riders/drivers never top up their own wallet — the only money that lands
 * there is ride/delivery earnings, which sit in `pendingBalance` and are
 * withdrawable immediately via payout. `balance` stays 0 for them, so it's
 * hidden to avoid reading as "no money" next to a nonzero pending amount.
 * Regular users self-credit, so `balance` is the meaningful figure for them.
 */
type WalletVariant = 'user' | 'earner'

/* ─── Wallet Tab ─────────────────────────────────────────── */

function WalletTab({ userId, adjustWalletAction, variant }: { userId: string; adjustWalletAction?: WalletAdjustAction; variant: WalletVariant }) {
  const toast = useToast()
  const [wallet, setWallet] = useState<UserWallet | null>(null)
  const [error, setError] = useState('')
  const [loading, startTransition] = useTransition()
  const fetched = useRef(false)

  // Adjust modal state
  const [showAdjust, setShowAdjust] = useState(false)
  const [mode, setMode] = useState<AdjustMode>('CREDIT_EARNINGS')
  const [amount, setAmount] = useState('')
  const [reason, setReason] = useState('')
  const [adjustError, setAdjustError] = useState('')
  const [adjustPending, startAdjustTransition] = useTransition()

  useEffect(() => {
    if (fetched.current) return
    fetched.current = true
    startTransition(async () => {
      const res = await getUserWallet(userId)
      if (res.error) setError(res.error)
      else if (res.data) setWallet(res.data)
    })
  }, [userId])

  const openAdjust = useCallback(() => {
    setMode('CREDIT_EARNINGS')
    setAmount('')
    setReason('')
    setAdjustError('')
    setShowAdjust(true)
  }, [])

  const isEarner = variant === 'earner'
  const modeList = isEarner ? EARNER_MODES : USER_MODES
  const cfg = ADJUST_MODES[mode]

  function handleAdjust() {
    const num = parseFloat(amount)
    if (!num || num <= 0) { setAdjustError('Enter a valid amount.'); return }
    if (!reason.trim()) { setAdjustError('Reason is required.'); return }
    if (!adjustWalletAction) return
    startAdjustTransition(async () => {
      setAdjustError('')
      const res = await adjustWalletAction({
        direction: cfg.direction,
        amount: num,
        reason: reason.trim(),
        target: isEarner ? cfg.target : undefined,
      })
      if (res.error) { setAdjustError(res.error); toast.error(res.error); return }
      if (res.data) setWallet(res.data)
      setShowAdjust(false)
      toast.success(cfg.done)
    })
  }

  if (loading) return <LoadingState />
  if (error) return <ErrorState message={error} />
  if (!wallet) return null

  const statusColor = wallet.status === 'ACTIVE'
    ? 'bg-emerald-50 text-emerald-700 ring-emerald-600/20'
    : 'bg-red-50 text-red-700 ring-red-600/20'

  return (
    <div className="space-y-4">
      {/* Header row: status + adjust button */}
      <div className="flex items-center justify-between">
        <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', statusColor)}>
          {wallet.status}
        </span>
        {adjustWalletAction && (
          <button
            type="button"
            onClick={openAdjust}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            Adjust Balance
          </button>
        )}
      </div>

      {/* Hero figure */}
      <div className="rounded-2xl bg-indigo-600 px-5 py-4 text-white">
        <p className="text-xs font-medium text-indigo-200 uppercase tracking-wider">
          {variant === 'earner' ? 'Available to Withdraw' : 'Available Balance'}
        </p>
        <p className="mt-1 text-3xl font-bold tracking-tight">
          {formatNaira(variant === 'earner' ? wallet.pendingBalance : wallet.availableBalance)}
        </p>
        {wallet.pinSet && (
          <p className="mt-1.5 text-[11px] text-indigo-300">PIN set</p>
        )}
      </div>

      {/* Secondary balances — riders/drivers never self-credit, so `balance` stays
          0 and is hidden; only their earned/withdrawable and locked amounts matter. */}
      {variant === 'earner' ? (
        <div className="grid grid-cols-2 gap-2">
          <BalanceCard label="Locked" amount={wallet.lockedBalance} color="red" />
          <BalanceCard label="Arrears" amount={wallet.arrearsBalance ?? 0} color="red" />
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          <BalanceCard label="Total" amount={wallet.balance} color="indigo" />
          <BalanceCard label="Pending" amount={wallet.pendingBalance} color="amber" />
          <BalanceCard label="Locked" amount={wallet.lockedBalance} color="red" />
        </div>
      )}

      {/* Arrears explainer — this amount is auto-deducted on the next credit. */}
      {variant === 'earner' && (wallet.arrearsBalance ?? 0) > 0 && (
        <div className="flex items-start gap-2 rounded-xl bg-amber-50 px-4 py-3 ring-1 ring-inset ring-amber-200/60">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="mt-0.5 h-4 w-4 shrink-0 text-amber-500">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495ZM10 5a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0v-3.5A.75.75 0 0 1 10 5Zm0 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
          </svg>
          <p className="text-[13px] text-amber-800">
            <span className="font-semibold">{formatNaira(wallet.arrearsBalance ?? 0)}</span> in arrears will be
            automatically deducted the next time this wallet is credited.
          </p>
        </div>
      )}

      {/* Adjust Wallet Modal */}
      {adjustWalletAction && (
        <Modal
          open={showAdjust}
          onClose={() => setShowAdjust(false)}
          title="Adjust Wallet"
          description="Choose an action, enter an amount, and give a reason for the audit log."
          size="sm"
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setShowAdjust(false)} disabled={adjustPending}>
                Cancel
              </Button>
              <Button
                size="sm"
                loading={adjustPending}
                onClick={handleAdjust}
                className={cfg.danger ? 'bg-red-600 hover:bg-red-700' : undefined}
              >
                {cfg.cta}
              </Button>
            </>
          }
        >
          <div className="space-y-4">
            {/* Action picker — one list instead of a direction × target matrix. */}
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Action</label>
              <div className="space-y-2">
                {modeList.map(m => {
                  const opt = ADJUST_MODES[m]
                  const selected = mode === m
                  const accent = opt.danger ? 'red' : 'emerald'
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => { setMode(m); setAdjustError('') }}
                      className={cn(
                        'flex w-full items-start gap-3 rounded-xl border px-3.5 py-2.5 text-left transition-all',
                        selected
                          ? accent === 'red'
                            ? 'border-red-500 bg-red-50 ring-1 ring-inset ring-red-500'
                            : 'border-emerald-500 bg-emerald-50 ring-1 ring-inset ring-emerald-500'
                          : 'border-slate-200 bg-white hover:bg-slate-50'
                      )}
                    >
                      <span
                        className={cn(
                          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border',
                          selected
                            ? accent === 'red' ? 'border-red-500 bg-red-500' : 'border-emerald-500 bg-emerald-500'
                            : 'border-slate-300'
                        )}
                      >
                        {selected && (
                          <svg viewBox="0 0 12 12" fill="none" className="h-2.5 w-2.5 text-white">
                            <path d="M2.5 6.5 5 9l4.5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      <span className="min-w-0">
                        <span className={cn('block text-sm font-semibold', selected ? (accent === 'red' ? 'text-red-800' : 'text-emerald-800') : 'text-slate-700')}>
                          {opt.label}
                        </span>
                        <span className="mt-0.5 block text-[12px] leading-snug text-slate-500">{opt.hint}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Amount */}
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Amount (NGN)</label>
              <input
                type="number"
                min="1"
                step="0.01"
                placeholder="e.g. 5000"
                value={amount}
                onChange={(e) => { setAmount(e.target.value); setAdjustError('') }}
                className={INPUT_CLS}
                autoFocus
              />
            </div>

            {/* Reason */}
            <div>
              <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Reason</label>
              <textarea
                rows={2}
                placeholder="e.g. cash commission owed"
                value={reason}
                onChange={(e) => { setReason(e.target.value); setAdjustError('') }}
                className={cn(INPUT_CLS, 'resize-none')}
              />
            </div>

            {adjustError && <p className="text-sm text-red-600">{adjustError}</p>}
          </div>
        </Modal>
      )}
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
  const toast = useToast()
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
      if (res.error) { setAddError(res.error); toast.error(res.error); return }
      if (res.data) setAccounts((prev) => [res.data!, ...prev])
      setShowAdd(false)
      toast.success('Bank account added.')
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
  const toast = useToast()
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
      if (res.error) { setRequestError(res.error); toast.error(res.error); return }
      setShowRequest(false)
      toast.success('Payout requested.')
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

export function UserFinanceSection({
  userId,
  adjustWalletAction,
  variant = 'user',
}: {
  userId: string
  adjustWalletAction?: WalletAdjustAction
  variant?: WalletVariant
}) {
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
        {tab === 'wallet' && <WalletTab userId={userId} adjustWalletAction={adjustWalletAction} variant={variant} />}
        {tab === 'bank-accounts' && <BankAccountsTab userId={userId} />}
        {tab === 'payouts' && <PayoutsTab userId={userId} />}
      </div>
    </div>
  )
}
