'use client'

import { useState, useTransition } from 'react'
import { Modal } from '@/app/components/ui/modal'
import { Button } from '@/app/components/ui/button'
import { useToast } from '@/app/components/ui/toast'
import { cn } from '@/app/lib/utils'
import { updateVendorOpeningHours, type OpeningHourInput } from '@/app/actions/vendors'
import type { VendorStoreDetail } from '@/app/lib/types'

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

type OpeningHours = VendorStoreDetail['openingHours']

function toForm(hours: OpeningHours | undefined): OpeningHourInput[] {
  return DAYS.map((_, dayOfWeek) => {
    const h = hours?.find((x) => x.dayOfWeek === dayOfWeek)
    return h
      ? { dayOfWeek, openTime: h.openTime, closeTime: h.closeTime, isClosed: h.isClosed }
      : { dayOfWeek, openTime: '09:00', closeTime: '21:00', isClosed: true }
  })
}

export function VendorOpeningHoursModal({ open, onClose, vendorId, openingHours, onSaved }: {
  open: boolean
  onClose: () => void
  vendorId: string
  openingHours: OpeningHours | undefined
  onSaved: (data: { isOpen: boolean; isOpenNow: boolean; openingHours: OpeningHours }) => void
}) {
  const toast = useToast()
  const [rows, setRows] = useState<OpeningHourInput[]>(() => toForm(openingHours))
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  // Reset the form from the latest saved hours each time the modal opens.
  const [wasOpen, setWasOpen] = useState(open)
  if (open !== wasOpen) {
    setWasOpen(open)
    if (open) { setRows(toForm(openingHours)); setError('') }
  }

  function update(day: number, p: Partial<OpeningHourInput>) {
    setRows((rs) => rs.map((r) => (r.dayOfWeek === day ? { ...r, ...p } : r)))
  }

  function copyToAll(day: number) {
    const src = rows[day]
    setRows((rs) => rs.map((r) => ({ ...r, openTime: src.openTime, closeTime: src.closeTime, isClosed: src.isClosed })))
  }

  function save() {
    setError('')
    const bad = rows.find((r) => !r.isClosed && (!r.openTime || !r.closeTime || r.openTime === r.closeTime))
    if (bad) { setError(`${DAYS[bad.dayOfWeek]}: set different open and close times, or mark the day closed.`); return }
    // Closed days still need valid times for the API.
    const payload = rows.map((r) => r.isClosed
      ? { ...r, openTime: r.openTime || '00:00', closeTime: r.closeTime || '00:00' }
      : r)
    startTransition(async () => {
      const res = await updateVendorOpeningHours(vendorId, payload)
      if (res.error || !res.data) { setError(res.error ?? 'Failed to update opening hours.'); toast.error(res.error ?? 'Failed to update opening hours.'); return }
      onSaved({ isOpen: res.data.isOpen, isOpenNow: res.data.isOpenNow, openingHours: res.data.openingHours })
      toast.success('Opening hours updated.')
      onClose()
    })
  }

  return (
    <Modal open={open} onClose={onClose} title="Opening Hours" description="Set when this store accepts orders. Close times earlier than open times run past midnight." size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={pending}>Cancel</Button>
          <Button size="sm" loading={pending} onClick={save}>Save Hours</Button>
        </>
      }
    >
      {error && <div role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">{error}</div>}
      <div className="divide-y divide-slate-100">
        {rows.map((r) => {
          const overnight = !r.isClosed && r.openTime && r.closeTime && r.closeTime < r.openTime
          return (
            <div key={r.dayOfWeek} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
              <span className="w-24 text-sm font-medium text-slate-700">{DAYS[r.dayOfWeek]}</span>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <button type="button" role="switch" aria-checked={!r.isClosed} aria-label={`${DAYS[r.dayOfWeek]} open`}
                  disabled={pending}
                  onClick={() => update(r.dayOfWeek, { isClosed: !r.isClosed })}
                  className={cn('relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2', !r.isClosed ? 'bg-indigo-600' : 'bg-slate-200')}>
                  <span className={cn('pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform', !r.isClosed ? 'translate-x-4' : 'translate-x-0')} />
                </button>
                <span className="w-12">{r.isClosed ? 'Closed' : 'Open'}</span>
              </label>
              <div className={cn('flex items-center gap-2', r.isClosed && 'opacity-40')}>
                <input type="time" value={r.openTime} disabled={r.isClosed || pending} aria-label={`${DAYS[r.dayOfWeek]} open time`}
                  onChange={(e) => update(r.dayOfWeek, { openTime: e.target.value })}
                  className="rounded-lg border-0 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                <span className="text-slate-400">–</span>
                <input type="time" value={r.closeTime} disabled={r.isClosed || pending} aria-label={`${DAYS[r.dayOfWeek]} close time`}
                  onChange={(e) => update(r.dayOfWeek, { closeTime: e.target.value })}
                  className="rounded-lg border-0 bg-slate-50 px-2.5 py-1.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none" />
                {overnight && <span className="text-xs text-amber-600">next day</span>}
              </div>
              <button type="button" onClick={() => copyToAll(r.dayOfWeek)} disabled={pending}
                className="ml-auto text-xs font-medium text-indigo-600 hover:text-indigo-700 disabled:opacity-50">
                Copy to all
              </button>
            </div>
          )
        })}
      </div>
    </Modal>
  )
}
