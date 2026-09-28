'use client'

import { useState } from 'react'
import { Button } from '@/app/components/ui/button'
import { useToast } from '@/app/components/ui/toast'

export function PaymentLinkCard({ url, reference }: { url: string; reference?: string }) {
  const toast = useToast()
  const [copied, setCopied] = useState(false)

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      toast.success('Payment link copied.')
    } catch {
      toast.error('Could not copy the link. Select and copy it instead.')
    }
  }

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
      <p className="text-sm font-semibold text-slate-900">Payment link</p>
      <p className="mt-1 text-xs text-slate-600">Copy this link and share it with the payer.</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          aria-label="Payment link"
          readOnly
          onFocus={(event) => event.currentTarget.select()}
          value={url}
          className="min-w-0 flex-1 rounded-lg border border-indigo-200 bg-white px-3 py-2 text-xs text-slate-700"
        />
        <Button type="button" size="sm" onClick={copyLink}>{copied ? 'Copied' : 'Copy link'}</Button>
      </div>
      {reference && <p className="mt-2 break-all text-xs text-slate-500">Reference: {reference}</p>}
    </div>
  )
}
