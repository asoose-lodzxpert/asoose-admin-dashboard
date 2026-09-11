'use client'

import { useState, useTransition } from 'react'
import { getReferrals, getReferralSettings, updateReferralSettings } from '@/app/actions/referrals'
import { Button } from '@/app/components/ui/button'
import { cn, formatNaira } from '@/app/lib/utils'
import type { ReferralList, ReferralPerson, ReferralResult, ReferralSettings, ReferralStatus } from '@/app/lib/referrals'

function date(value: string | null) {
  return value ? new Date(value).toLocaleString('en-NG', { timeZone: 'Africa/Lagos', dateStyle: 'medium', timeStyle: 'short' }) : '—'
}

function Person({ person }: { person: ReferralPerson }) {
  return <div><p className="font-medium text-slate-900">{[person.firstName, person.lastName].filter(Boolean).join(' ') || 'Unnamed user'}</p><p className="text-xs text-slate-500">{person.email ?? 'No email'}</p></div>
}

export function ReferralsClient({ initialReferrals, initialSettings }: {
  initialReferrals: ReferralResult<ReferralList>
  initialSettings: ReferralResult<ReferralSettings>
}) {
  const [result, setResult] = useState(initialReferrals)
  const [settings, setSettings] = useState(initialSettings.data)
  const [settingsError, setSettingsError] = useState(initialSettings.error ?? '')
  const [amount, setAmount] = useState(initialSettings.data ? String(initialSettings.data.bonusAmount) : '')
  const [active, setActive] = useState(initialSettings.data?.isActive ?? false)
  const [message, setMessage] = useState('')
  const [status, setStatus] = useState<ReferralStatus | ''>('')
  const [page, setPage] = useState(1)
  const [loading, startLoad] = useTransition()
  const [saving, startSave] = useTransition()

  function load(nextStatus: ReferralStatus | '', nextPage: number) {
    setStatus(nextStatus)
    setPage(nextPage)
    startLoad(async () => {
      try {
        setResult(await getReferrals({ status: nextStatus || undefined, page: nextPage, limit: 20 }))
      } catch {
        setResult({ error: 'Failed to load referrals. Please try again.' })
      }
    })
  }

  function applySettings(data: ReferralSettings) {
    setSettings(data)
    setAmount(String(data.bonusAmount))
    setActive(data.isActive)
  }

  function retrySettings() {
    startSave(async () => {
      try {
        const response = await getReferralSettings()
        setSettingsError(response.error ?? '')
        if (response.data) applySettings(response.data)
      } catch {
        setSettingsError('Failed to load referral settings. Please try again.')
      }
    })
  }

  function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setMessage('')
    setSettingsError('')
    const bonusAmount = Number(amount)
    if (!amount.trim() || !Number.isFinite(bonusAmount) || bonusAmount < 0) {
      setSettingsError('Enter a valid, non-negative bonus amount.')
      return
    }
    startSave(async () => {
      try {
        const response = await updateReferralSettings({ bonusAmount, isActive: active })
        if (response.data) {
          applySettings(response.data)
          setMessage('Referral settings updated successfully.')
        } else setSettingsError(response.error)
      } catch {
        setSettingsError('Failed to update referral settings. Please try again.')
      }
    })
  }

  const data = result.data
  return (
    <main className="px-4 py-8 sm:px-8">
      <h1 className="text-2xl font-bold text-slate-900">Referral Bonuses</h1>
      <p className="mt-1 text-sm text-slate-500">Manage referral rewards and review bonus activity.</p>

      <section className="my-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="settings-heading">
        <h2 id="settings-heading" className="font-semibold text-slate-900">Referral settings</h2>
        {settings ? (
          <form onSubmit={save} className="mt-4 space-y-4">
            <fieldset disabled={saving} className="flex flex-wrap items-end gap-5 disabled:opacity-60">
              <label className="block text-sm font-medium text-slate-700">Bonus amount (₦)
                <input type="number" min="0" step="any" required value={amount} onChange={(e) => { setAmount(e.target.value); setMessage('') }} className="mt-1 block w-56 rounded-xl border border-slate-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </label>
              <label className="flex min-h-10 items-center gap-2 text-sm text-slate-700">
                <input type="checkbox" checked={active} onChange={(e) => { setActive(e.target.checked); setMessage('') }} className="h-4 w-4 accent-indigo-600" />Referral bonuses active
              </label>
              <Button type="submit" loading={saving}>Save settings</Button>
            </fieldset>
            <p className="text-xs text-slate-500">Last updated: {date(settings.updatedAt)} (Lagos time)</p>
          </form>
        ) : <Button className="mt-3" variant="secondary" loading={saving} onClick={retrySettings}>Retry settings</Button>}
        {settingsError && <p role="alert" className="mt-3 text-sm text-red-600">{settingsError}</p>}
        {message && <p role="status" className="mt-3 text-sm text-emerald-700">{message}</p>}
      </section>

      <section aria-labelledby="records-heading" aria-busy={loading}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 id="records-heading" className="font-semibold text-slate-900">Referral records{data && !loading ? ` (${data.pagination.total})` : ''}</h2>
          <div className="flex items-center gap-3">
            <label className="text-sm text-slate-600">Status
              <select value={status} disabled={loading} onChange={(e) => load(e.target.value as ReferralStatus | '', 1)} className="ml-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <option value="">All statuses</option><option value="PENDING">Pending</option><option value="CREDITED">Credited</option>
              </select>
            </label>
            <Button variant="secondary" disabled={loading} onClick={() => load(status, page)}>Refresh</Button>
          </div>
        </div>
        {loading ? <p role="status" className="py-12 text-center text-sm text-slate-500">Loading referrals…</p> : result.error ? (
          <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{result.error}<Button variant="secondary" className="ml-3" onClick={() => load(status, page)}>Retry</Button></div>
        ) : data && (
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr>{['Referrer', 'Referee', 'Status', 'Bonus amount', 'Created (Lagos)', 'Credited (Lagos)'].map((heading) => <th key={heading} scope="col" className="whitespace-nowrap px-5 py-3">{heading}</th>)}</tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {data.referrals.map((referral) => <tr key={referral.id}>
                    <td className="px-5 py-4"><Person person={referral.referrer} /></td>
                    <td className="px-5 py-4"><Person person={referral.referee} /></td>
                    <td className="px-5 py-4"><span className={cn('rounded-full px-2.5 py-1 text-xs font-medium', referral.status === 'CREDITED' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>{referral.status}</span></td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-700">{referral.bonusAmount === null ? '—' : formatNaira(referral.bonusAmount)}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{date(referral.createdAt)}</td>
                    <td className="whitespace-nowrap px-5 py-4 text-slate-500">{date(referral.creditedAt)}</td>
                  </tr>)}
                  {data.referrals.length === 0 && <tr><td colSpan={6} className="py-12 text-center text-slate-500">No referrals found{status ? ` with status ${status.toLowerCase()}` : ''}.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
              <span>Page {data.pagination.page} of {Math.max(1, data.pagination.totalPages)} · {data.pagination.total} referrals</span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={data.pagination.page <= 1} onClick={() => load(status, data.pagination.page - 1)}>Previous</Button>
                <Button variant="secondary" size="sm" disabled={data.pagination.page >= data.pagination.totalPages} onClick={() => load(status, data.pagination.page + 1)}>Next</Button>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  )
}
