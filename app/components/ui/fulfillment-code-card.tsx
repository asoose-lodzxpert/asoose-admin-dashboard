'use client'

import { useState } from 'react'
import { Button } from '@/app/components/ui/button'
import { DetailCard } from '@/app/components/ui/detail'
import { useToast } from '@/app/components/ui/toast'
import type { FulfillmentCodeData } from '@/app/lib/types'

type CodeResult = {
  data?: FulfillmentCodeData
  error?: string
}

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function FulfillmentCodeCard({
  title,
  description,
  retrieveLabel,
  retrieveCode,
}: {
  title: string
  description: string
  retrieveLabel: string
  retrieveCode: () => Promise<CodeResult>
}) {
  const toast = useToast()
  const [data, setData] = useState<FulfillmentCodeData | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const code = data?.confirmationCode ?? data?.deliveryCode

  async function handleRetrieve() {
    if (isLoading) return
    setError('')
    setIsLoading(true)

    try {
      const result = await retrieveCode()
      const resultCode = result.data?.confirmationCode ?? result.data?.deliveryCode
      if (result.error || !result.data || !resultCode) {
        const message = result.error ?? 'The API returned no active code.'
        setError(message)
        toast.error(message)
        return
      }

      setData(result.data)
      toast.success(
        result.data.source.toUpperCase() === 'EXISTING'
          ? 'Active code retrieved.'
          : 'Code generated.'
      )
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCopy() {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      toast.success('Code copied.')
    } catch {
      toast.error('Could not copy the code. Please copy it manually.')
    }
  }

  return (
    <DetailCard title={title}>
      {error && (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {data && code ? (
        <div>
          <p className="text-xs leading-5 text-slate-500">{description}</p>
          <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-inset ring-slate-200">
            <span className="font-mono text-2xl font-bold tracking-[0.28em] text-slate-900">
              {code}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleCopy}
              aria-label={`Copy ${title.toLowerCase()}`}
            >
              Copy
            </Button>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 text-[11px] text-slate-400">
            <span>Generated {formatDateTime(data.codeGeneratedAt)}</span>
            <span className="rounded-full bg-slate-100 px-2 py-1 font-medium uppercase tracking-wide text-slate-500">
              {data.source}
            </span>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-sm leading-6 text-slate-600">{description}</p>
          <Button
            className="mt-4 w-full"
            size="sm"
            loading={isLoading}
            onClick={handleRetrieve}
          >
            {retrieveLabel}
          </Button>
        </div>
      )}
    </DetailCard>
  )
}
