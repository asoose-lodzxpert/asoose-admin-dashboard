'use client'

import { useState, useTransition } from 'react'
import { cn } from '@/app/lib/utils'
import { Modal } from '@/app/components/ui/modal'
import { Button } from '@/app/components/ui/button'
import { DetailCard } from '@/app/components/ui/detail'

const INPUT_CLS =
  'w-full rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow'

type CommissionAdjustAction = (payload: {
  commissionPercent: number | null
}) => Promise<{ commissionPercent?: number | null; error?: string }>

export function CommissionSection({
  commissionPercent,
  onAdjust,
}: {
  commissionPercent: number | null
  onAdjust: CommissionAdjustAction
}) {
  const [current, setCurrent] = useState(commissionPercent)
  const [showEdit, setShowEdit] = useState(false)
  const [value, setValue] = useState(current != null ? String(current) : '')
  const [error, setError] = useState('')
  const [pending, startTransition] = useTransition()

  function openEdit() {
    setValue(current != null ? String(current) : '')
    setError('')
    setShowEdit(true)
  }

  function handleSave() {
    let commissionPercentValue: number | null = null
    if (value.trim() !== '') {
      const num = parseFloat(value)
      if (Number.isNaN(num) || num < 0 || num > 100) {
        setError('Enter a value between 0 and 100, or leave blank for the default rate.')
        return
      }
      commissionPercentValue = num
    }
    startTransition(async () => {
      setError('')
      const res = await onAdjust({ commissionPercent: commissionPercentValue })
      if (res.error) { setError(res.error); return }
      setCurrent(res.commissionPercent ?? null)
      setShowEdit(false)
    })
  }

  return (
    <DetailCard title="Commission">
      <div className="flex items-center justify-between">
        <div>
          <p className={cn('text-lg font-bold tracking-tight', current != null ? 'text-slate-900' : 'text-slate-400')}>
            {current != null ? `${current}%` : 'Default (city rate)'}
          </p>
          {current != null && (
            <p className="mt-0.5 text-xs text-slate-400">Overrides the default city rate</p>
          )}
        </div>
        <button
          type="button"
          onClick={openEdit}
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          Edit
        </button>
      </div>

      <Modal
        open={showEdit}
        onClose={() => setShowEdit(false)}
        title="Set Commission Override"
        description="Leave blank to use the default city rate."
        size="sm"
        footer={
          <>
            <Button variant="secondary" size="sm" onClick={() => setShowEdit(false)} disabled={pending}>
              Cancel
            </Button>
            <Button size="sm" loading={pending} onClick={handleSave}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-slate-700">Commission (%)</label>
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              placeholder="Leave blank for default rate"
              value={value}
              onChange={(e) => { setValue(e.target.value); setError('') }}
              className={INPUT_CLS}
              autoFocus
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
        </div>
      </Modal>
    </DetailCard>
  )
}
