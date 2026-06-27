'use client'

import { useState, useTransition } from 'react'
import { cn } from '@/app/lib/utils'
import { sendPushNotification } from '@/app/actions/notifications'
import type { NotificationAudience, PushResult } from '@/app/actions/notifications'

const AUDIENCES: { value: NotificationAudience; label: string; desc: string }[] = [
  { value: 'ALL',      label: 'Everyone',  desc: 'All app users' },
  { value: 'CUSTOMER', label: 'Customers', desc: 'Shoppers & diners' },
  { value: 'VENDOR',   label: 'Vendors',   desc: 'Stores & restaurants' },
  { value: 'RIDER',    label: 'Riders',    desc: 'Delivery riders' },
  { value: 'DRIVER',   label: 'Drivers',   desc: 'Logistics drivers' },
]

interface DataPair { id: number; key: string; value: string }

let pairId = 0

export function NotificationsClient() {
  const [audience, setAudience] = useState<NotificationAudience>('ALL')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [pairs, setPairs] = useState<DataPair[]>([])
  const [errors, setErrors] = useState<{ title?: string; body?: string }>({})
  const [serverError, setServerError] = useState('')
  const [result, setResult] = useState<PushResult | null>(null)
  const [isPending, startTransition] = useTransition()

  function addPair() {
    setPairs(p => [...p, { id: ++pairId, key: '', value: '' }])
  }
  function updatePair(id: number, field: 'key' | 'value', val: string) {
    setPairs(p => p.map(x => x.id === id ? { ...x, [field]: val } : x))
  }
  function removePair(id: number) {
    setPairs(p => p.filter(x => x.id !== id))
  }

  function reset() {
    setTitle('')
    setBody('')
    setPairs([])
    setErrors({})
    setServerError('')
    setResult(null)
  }

  function handleSend() {
    const errs: { title?: string; body?: string } = {}
    if (!title.trim()) errs.title = 'Required'
    if (!body.trim()) errs.body = 'Required'
    setErrors(errs)
    if (Object.keys(errs).length) return

    const data: Record<string, string> = {}
    for (const p of pairs) {
      if (p.key.trim()) data[p.key.trim()] = p.value
    }

    setServerError('')
    startTransition(async () => {
      const res = await sendPushNotification({
        audience,
        title: title.trim(),
        body: body.trim(),
        ...(Object.keys(data).length ? { data } : {}),
      })
      if (res.error) { setServerError(res.error); return }
      setResult(res.data!)
    })
  }

  const audienceLabel = AUDIENCES.find(a => a.value === audience)?.label ?? 'Everyone'

  return (
    <main className="px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Push Notifications</h1>
        <p className="mt-0.5 text-sm text-slate-500">Broadcast a push notification to a topic of users.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px]">
        {/* Form */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6">
          {/* Audience */}
          <label className="block text-xs font-semibold text-slate-700 mb-2">Audience</label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {AUDIENCES.map(a => (
              <button
                key={a.value}
                type="button"
                onClick={() => setAudience(a.value)}
                className={cn(
                  'rounded-xl border px-3 py-2.5 text-left transition-colors',
                  audience === a.value
                    ? 'border-indigo-500 bg-indigo-50 ring-1 ring-indigo-500'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                )}
              >
                <p className={cn('text-sm font-semibold', audience === a.value ? 'text-indigo-700' : 'text-slate-700')}>{a.label}</p>
                <p className="text-[11px] text-slate-400 leading-tight mt-0.5">{a.desc}</p>
              </button>
            ))}
          </div>

          {/* Title */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">Title <span className="text-red-500">*</span></label>
              <span className="text-[11px] text-slate-400">{title.length}/65</span>
            </div>
            <input
              value={title}
              maxLength={65}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="🎉 Weekend Special"
              className={cn('w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',
                errors.title ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50')}
            />
            {errors.title && <p className="mt-1 text-xs text-red-500">{errors.title}</p>}
          </div>

          {/* Body */}
          <div className="mt-4">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">Message <span className="text-red-500">*</span></label>
              <span className="text-[11px] text-slate-400">{body.length}/240</span>
            </div>
            <textarea
              value={body}
              maxLength={240}
              rows={3}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Get 20% off all orders this weekend. Order now!"
              className={cn('w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',
                errors.body ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50')}
            />
            {errors.body && <p className="mt-1 text-xs text-red-500">{errors.body}</p>}
          </div>

          {/* Data payload */}
          <div className="mt-5">
            <div className="flex items-center justify-between mb-2">
              <div>
                <label className="text-xs font-semibold text-slate-700">Data payload <span className="text-slate-400 font-normal">(optional)</span></label>
                <p className="text-[11px] text-slate-400">Custom key/value pairs sent with the notification (e.g. <span className="font-mono">screen</span>, <span className="font-mono">promoCode</span>).</p>
              </div>
              <button
                type="button"
                onClick={addPair}
                className="shrink-0 inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                  <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
                </svg>
                Add field
              </button>
            </div>
            {pairs.length > 0 && (
              <div className="space-y-2">
                {pairs.map(p => (
                  <div key={p.id} className="flex items-center gap-2">
                    <input
                      value={p.key}
                      onChange={(e) => updatePair(p.id, 'key', e.target.value)}
                      placeholder="key"
                      className="w-1/3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <input
                      value={p.value}
                      onChange={(e) => updatePair(p.id, 'value', e.target.value)}
                      placeholder="value"
                      className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={() => removePair(p.id)}
                      className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                        <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4Z" clipRule="evenodd" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {serverError && <p className="mt-5 rounded-xl bg-red-50 px-3 py-2.5 text-xs text-red-600">{serverError}</p>}

          {/* Success */}
          {result && (
            <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-emerald-600">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                </svg>
                <p className="text-sm font-semibold text-emerald-800">Notification sent successfully</p>
              </div>
              <div className="space-y-1 text-xs text-emerald-700">
                <div className="flex justify-between gap-4"><span className="text-emerald-600">Audience</span><span className="font-medium">{result.audience}</span></div>
                <div className="flex justify-between gap-4"><span className="text-emerald-600">Topic</span><span className="font-mono">{result.topic}</span></div>
                <div className="flex justify-between gap-4"><span className="text-emerald-600">Message ID</span><span className="font-mono truncate max-w-[60%]" title={result.messageId}>{result.messageId}</span></div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={reset}
              disabled={isPending}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {result ? 'New message' : 'Clear'}
            </button>
            <button
              type="button"
              onClick={handleSend}
              disabled={isPending}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50"
            >
              {isPending ? (
                <>
                  <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Sending…
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                    <path d="M3.105 2.288a.75.75 0 0 0-.826.95l1.414 4.926A1.5 1.5 0 0 0 5.135 9.25h6.115a.75.75 0 0 1 0 1.5H5.135a1.5 1.5 0 0 0-1.442 1.086l-1.414 4.926a.75.75 0 0 0 .826.95 28.897 28.897 0 0 0 15.293-7.155.75.75 0 0 0 0-1.114A28.897 28.897 0 0 0 3.105 2.288Z" />
                  </svg>
                  Send notification
                </>
              )}
            </button>
          </div>
        </div>

        {/* Live preview */}
        <div className="lg:sticky lg:top-8 self-start">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">Preview</p>
          <div className="rounded-3xl bg-slate-900 p-3 shadow-xl">
            <div className="rounded-2xl bg-linear-to-b from-slate-700 to-slate-800 px-3 py-6 min-h-64">
              <p className="text-center text-4xl font-bold text-white/90">9:41</p>
              <p className="text-center text-xs text-white/50 mt-0.5">Sending to <span className="font-semibold text-white/70">{audienceLabel}</span></p>
              {/* Notification banner */}
              <div className="mt-5 rounded-2xl bg-white/95 backdrop-blur p-3 shadow-lg">
                <div className="flex items-start gap-2.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                      <path d="M5.85 3.5a.75.75 0 0 0-1.117-1 9.719 9.719 0 0 0-2.348 4.876.75.75 0 0 0 1.479.248A8.219 8.219 0 0 1 5.85 3.5ZM19.267 2.5a.75.75 0 1 0-1.118 1 8.22 8.22 0 0 1 1.987 4.124.75.75 0 0 0 1.48-.248A9.72 9.72 0 0 0 19.266 2.5Z" />
                      <path fillRule="evenodd" d="M12 2.25A6.75 6.75 0 0 0 5.25 9v.75a8.217 8.217 0 0 1-2.119 5.52.75.75 0 0 0 .298 1.206c1.544.57 3.16.99 4.831 1.243a3.75 3.75 0 1 0 7.48 0 24.583 24.583 0 0 0 4.83-1.244.75.75 0 0 0 .298-1.205 8.217 8.217 0 0 1-2.118-5.52V9A6.75 6.75 0 0 0 12 2.25ZM9.75 18c0-.034 0-.067.002-.1a25.05 25.05 0 0 0 4.496 0l.002.1a2.25 2.25 0 1 1-4.5 0Z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-semibold text-slate-500">Asoose</p>
                      <p className="text-[10px] text-slate-400">now</p>
                    </div>
                    <p className="text-sm font-bold text-slate-900 leading-snug break-words">{title || 'Notification title'}</p>
                    <p className="text-xs text-slate-600 leading-snug break-words mt-0.5">{body || 'Your message preview appears here.'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}
