'use client'

import { useState, useTransition } from 'react'
import { getVendorDetail, updateVendorCommission } from '@/app/actions/vendors'
import { Button } from '@/app/components/ui/button'
import { DetailCard } from '@/app/components/ui/detail'
import { useToast } from '@/app/components/ui/toast'
import type { VendorDetail } from '@/app/lib/types'

type Commission = Pick<VendorDetail, 'customCommissionPercent' | 'effectiveCommissionPercent'>

export function VendorCommission({ vendor, onUpdate }: {
  vendor: VendorDetail
  onUpdate: (commission: Commission) => void
}) {
  const toast = useToast()
  const [value, setValue] = useState(String(vendor.customCommissionPercent ?? ''))
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()
  const [needsRefresh, setNeedsRefresh] = useState(false)

  async function refresh() {
    const updated = await getVendorDetail(vendor.id)
    if (!updated || typeof updated.effectiveCommissionPercent !== 'number') {
      setNeedsRefresh(true)
      setError('Commission saved, but the current rate could not be loaded. Refresh the rate to confirm it.')
      return
    }
    onUpdate({
      customCommissionPercent: updated.customCommissionPercent,
      effectiveCommissionPercent: updated.effectiveCommissionPercent,
    })
    setValue(String(updated.customCommissionPercent ?? ''))
    setNeedsRefresh(false)
    setError('')
    toast.success('Commission updated.')
  }

  function save(rate: number | null) {
    if (pending) return
    setError('')
    if (rate !== null && (!value.trim() || !Number.isFinite(rate) || rate < 0 || rate > 100)) {
      setError('Enter a commission between 0 and 100%.')
      return
    }
    startTransition(async () => {
      try {
        const result = await updateVendorCommission(vendor.id, rate)
        if (result.error) { setError(result.error); return }
        await refresh()
      } catch {
        setError('Unable to confirm the commission. Reload the page to check the current rate before trying again.')
      }
    })
  }

  return (
    <DetailCard title="Platform Commission">
      <p className="text-2xl font-bold text-slate-900">
        {needsRefresh ? 'Awaiting refresh' : `${vendor.effectiveCommissionPercent ?? vendor.customCommissionPercent ?? 10}%`}
      </p>
      <p className="mt-1 text-xs text-slate-500">
        {vendor.customCommissionPercent == null ? 'Using the 10% platform default.' : `Custom vendor rate: ${vendor.customCommissionPercent}%.`}
      </p>
      <form className="mt-4 space-y-3" onSubmit={(event) => { event.preventDefault(); save(Number(value)) }}>
        <label htmlFor="vendor-commission" className="block text-sm font-medium text-slate-700">Custom commission (%)</label>
        <input
          id="vendor-commission" type="number" min={0} max={100} step="any" required
          value={value} onChange={(event) => setValue(event.target.value)} disabled={pending || needsRefresh}
          placeholder="e.g. 12.5" aria-describedby="vendor-commission-help vendor-commission-error"
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
        />
        <p id="vendor-commission-help" className="text-xs text-slate-500">Enter 0–100%. Decimal rates are supported.</p>
        <p id="vendor-commission-error" role="alert" className="text-sm text-red-600">{error}</p>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" size="sm" loading={pending} disabled={needsRefresh}>Save commission</Button>
          <Button type="button" variant="secondary" size="sm" disabled={pending || needsRefresh || vendor.customCommissionPercent == null} onClick={() => save(null)}>Restore default (10%)</Button>
          {needsRefresh && <Button type="button" variant="secondary" size="sm" disabled={pending} onClick={() => startTransition(async () => { await refresh() })}>Refresh rate</Button>}
        </div>
      </form>
    </DetailCard>
  )
}
