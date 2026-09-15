'use client'

import { useState, useTransition } from 'react'
import { getFinanceTransactions } from '@/app/actions/finance'
import { Button } from '@/app/components/ui/button'
import { Modal } from '@/app/components/ui/modal'
import { InfoGrid, InfoRow } from '@/app/components/ui/detail'
import { formatNaira } from '@/app/lib/utils'
import { TRANSACTION_TYPES, TRANSACTION_STATUSES, TRANSACTION_CHANNELS, type FinanceTransaction, type FinanceTransactionFilters, type FinanceTransactionsResult } from '@/app/lib/finance-transactions'

const inputClass = 'mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500'
const defaults: FinanceTransactionFilters = { limit: 20 }
const date = (value: string | null) => value ? new Date(value).toLocaleString('en-NG', { timeZone: 'UTC' }) + ' UTC' : '—'
const label = (value: string) => value.replaceAll('_', ' ')

export function TransactionsClient({ initial }: { initial: FinanceTransactionsResult }) {
  const [result, setResult] = useState(initial)
  const [draft, setDraft] = useState<FinanceTransactionFilters>(defaults)
  const [applied, setApplied] = useState<FinanceTransactionFilters>(defaults)
  const [validation, setValidation] = useState('')
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<FinanceTransaction | null>(null)
  const data = result.data

  function load(filters: FinanceTransactionFilters, page = 1) {
    if (pending) return
    setValidation('')
    if (filters.from && filters.to && filters.from > filters.to) {
      setValidation('From cannot be after To.'); return
    }
    if (filters.minAmount && filters.maxAmount && Number(filters.minAmount) > Number(filters.maxAmount)) {
      setValidation('Minimum amount cannot be greater than maximum amount.'); return
    }
    setApplied(filters)
    startTransition(async () => {
      try { setResult(await getFinanceTransactions({ ...filters, page })) }
      catch { setResult({ error: 'Unable to load transactions. Please try again.' }) }
    })
  }

  function field(key: keyof FinanceTransactionFilters, title: string, type = 'text') {
    return <label className="text-xs font-medium text-slate-600" key={key}>
      {title}
      <input className={inputClass} type={type} value={draft[key] ?? ''}
        min={type === 'number' ? 0 : undefined} step={type === 'number' ? 'any' : undefined}
        maxLength={key === 'search' ? 100 : undefined}
        pattern={key === 'userId' ? '[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}' : undefined}
        title={key === 'userId' ? 'Enter a user UUID' : undefined}
        onChange={event => setDraft(current => ({ ...current, [key]: event.target.value }))} />
    </label>
  }

  function multiple(key: 'type' | 'status' | 'channel', title: string, options: readonly string[]) {
    const values = draft[key]?.split(',') ?? []
    return <fieldset className="rounded-xl border border-slate-200 p-3">
      <legend className="px-1 text-xs font-semibold text-slate-600">{title} · any if none selected</legend>
      <div className="flex flex-wrap gap-x-4 gap-y-2">
        {options.map(option => <label key={option} className="flex items-center gap-2 text-xs text-slate-600">
          <input type="checkbox" checked={values.includes(option)} onChange={event => {
            const next = event.target.checked ? [...values, option] : values.filter(value => value !== option)
            setDraft(current => ({ ...current, [key]: next.join(',') }))
          }} />{label(option)}
        </label>)}
      </div>
    </fieldset>
  }

  return <main className="space-y-6 px-4 py-8 sm:px-8">
    <header><h1 className="text-2xl font-bold text-slate-900">Wallet Transactions</h1>
      <p className="mt-1 text-sm text-slate-500">Review wallet activity across the platform and filter by owning user.</p>
    </header>
    <form onSubmit={event => { event.preventDefault(); load(draft) }} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <fieldset disabled={pending} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {field('search', 'Search')}
          <label className="text-xs font-medium text-slate-600">Direction
            <select className={inputClass} value={draft.direction ?? ''} onChange={event => setDraft(current => ({ ...current, direction: event.target.value }))}>
              <option value="">All directions</option><option value="CREDIT">Credit</option><option value="DEBIT">Debit</option>
            </select>
          </label>
          {field('from', 'From (UTC)', 'date')}{field('to', 'To (inclusive, UTC)', 'date')}
        </div>
        <details><summary className="cursor-pointer text-sm font-semibold text-slate-700">More filters</summary>
          <div className="mt-4 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {field('userId', 'User ID (UUID)')}{field('referenceType', 'Reference type')}{field('referenceId', 'Reference ID')}
              {field('minAmount', 'Minimum amount', 'number')}{field('maxAmount', 'Maximum amount', 'number')}
              <label className="text-xs font-medium text-slate-600">Rows per page
                <input type="number" min={1} max={100} required className={inputClass} value={draft.limit ?? 20} onChange={event => setDraft(current => ({ ...current, limit: Number(event.target.value) }))} />
              </label>
            </div>
            {multiple('type', 'Types', TRANSACTION_TYPES)}{multiple('status', 'Statuses', TRANSACTION_STATUSES)}{multiple('channel', 'Channels', TRANSACTION_CHANNELS)}
          </div>
        </details>
        <div className="flex gap-2"><Button type="submit" size="sm" loading={pending}>Apply filters</Button>
          <Button type="button" size="sm" variant="secondary" onClick={() => { setDraft(defaults); load(defaults) }}>Reset</Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => load(applied, data?.pagination.page ?? 1)}>Refresh</Button>
        </div>
      </fieldset>
    </form>
    {validation && <p role="alert" className="text-sm text-red-600">{validation}</p>}
    {result.error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{result.error}</div>}
    <div aria-busy={pending} className={pending ? 'space-y-6 opacity-60' : 'space-y-6'}>
      {pending && <p role="status" className="text-sm text-slate-500">Loading transactions…</p>}
      {data && <>
        <section aria-label="Transaction totals" className="grid gap-4 sm:grid-cols-3">
          {[
            ['Total credit', formatNaira(data.summary.totalCredit), `${data.summary.creditCount} credits`],
            ['Total debit', formatNaira(data.summary.totalDebit), `${data.summary.debitCount} debits`],
            ['Net', formatNaira(data.summary.net), 'Credits minus debits'],
          ].map(([title, amount, caption]) => <div key={title} className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">{title}</p><p className="mt-2 text-2xl font-bold text-slate-900">{amount}</p><p className="mt-1 text-xs text-slate-500">{caption}</p>
          </div>)}
        </section>
        <p className="text-xs text-slate-500">Totals cover all matching transactions, across every page.</p>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="w-full text-left text-sm">
            <caption className="p-4 text-left text-sm text-slate-500">{data.pagination.total} matching transactions</caption>
            <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['User', 'Transaction', 'Direction', 'Status', 'Amount', 'Channel', 'Created (UTC)', 'Details'].map(title => <th key={title} scope="col" className="px-4 py-3">{title}</th>)}</tr></thead>
            <tbody className="divide-y divide-slate-100">{data.transactions.map(tx => <tr key={tx.id} className="text-slate-700 hover:bg-slate-50">
              <td className="px-4 py-3"><p className="font-medium">{[tx.user?.firstName, tx.user?.lastName].filter(Boolean).join(' ') || 'Unknown user'}</p><p className="text-xs">{tx.user?.email ?? tx.userId}</p><p className="text-xs text-slate-400">{tx.user?.role}</p></td>
              <td className="max-w-xs px-4 py-3"><p>{label(tx.type)}</p><p className="break-words text-xs text-slate-500">{tx.description ?? tx.referenceType ?? '—'}</p></td>
              <td className={`px-4 py-3 font-medium ${tx.direction === 'CREDIT' ? 'text-emerald-700' : 'text-red-700'}`}>{tx.direction}</td>
              <td className="px-4 py-3 text-xs">{label(tx.status)}</td><td className="whitespace-nowrap px-4 py-3 font-medium">{formatNaira(tx.amount)}</td>
              <td className="px-4 py-3 text-xs">{label(tx.channel)}</td><td className="whitespace-nowrap px-4 py-3 text-xs">{date(tx.createdAt)}</td>
              <td className="px-4 py-3"><Button size="sm" variant="secondary" disabled={pending} onClick={() => setSelected(tx)} aria-label={`View transaction ${tx.id}`}>View</Button></td>
            </tr>)}</tbody>
          </table>
          {data.transactions.length === 0 && <p className="p-12 text-center text-sm text-slate-500">No transactions match these filters.</p>}
        </div>
        <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
          <p>Page {data.pagination.page} of {Math.max(1, data.pagination.totalPages)}</p>
          <div className="flex gap-2"><Button size="sm" variant="secondary" disabled={pending || data.pagination.page <= 1} onClick={() => load(applied, data.pagination.page - 1)}>Previous</Button>
            <Button size="sm" variant="secondary" disabled={pending || data.pagination.page >= data.pagination.totalPages} onClick={() => load(applied, data.pagination.page + 1)}>Next</Button></div>
        </div>
      </>}
    </div>
    <Modal open={!!selected} onClose={() => setSelected(null)} title="Transaction details" size="lg">
      {selected && <InfoGrid>
        <InfoRow label="Transaction ID" value={selected.id} wide /><InfoRow label="Wallet ID" value={selected.walletId} wide />
        <InfoRow label="User ID" value={selected.userId} wide /><InfoRow label="User" value={[selected.user?.firstName, selected.user?.lastName].filter(Boolean).join(' ') || '—'} />
        <InfoRow label="Email" value={selected.user?.email ?? '—'} /><InfoRow label="Role" value={selected.user?.role ?? '—'} />
        {(['direction', 'type', 'status', 'channel'] as const).map(key => <InfoRow key={key} label={key} value={label(selected[key])} />)}
        {([['amount', 'Amount'], ['feeAmount', 'Fee'], ['netAmount', 'Net amount'], ['balanceBefore', 'Balance before'], ['balanceAfter', 'Balance after']] as const).map(([key, title]) => <InfoRow key={key} label={title} value={formatNaira(selected[key])} />)}
        <InfoRow label="Description" value={selected.description ?? '—'} wide /><InfoRow label="Reference type" value={selected.referenceType ?? '—'} />
        <InfoRow label="Reference ID" value={selected.referenceId ?? '—'} wide /><InfoRow label="External reference" value={selected.externalReference ?? '—'} wide />
        <InfoRow label="Created" value={date(selected.createdAt)} /><InfoRow label="Settled" value={date(selected.settledAt)} />
      </InfoGrid>}
    </Modal>
  </main>
}
