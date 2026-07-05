'use client'

import { useState, useTransition, useMemo } from 'react'
import { cn } from '@/app/lib/utils'
import { sendBroadcastEmail } from '@/app/actions/notifications'
import type { NotificationAudience, EmailBroadcastResult } from '@/app/actions/notifications'
import type { UserStatus } from '@/app/lib/types'
import { RichTextEditor } from '@/app/components/ui/rich-text-editor'

const AUDIENCES: { value: NotificationAudience; label: string; desc: string }[] = [
  { value: 'ALL',      label: 'Everyone',  desc: 'All app users'          },
  { value: 'CUSTOMER', label: 'Customers', desc: 'Shoppers & diners'      },
  { value: 'VENDOR',   label: 'Vendors',   desc: 'Stores & restaurants'   },
  { value: 'RIDER',    label: 'Riders',    desc: 'Delivery riders'        },
  { value: 'DRIVER',   label: 'Drivers',   desc: 'Logistics drivers'      },
]

const STATUSES: { value: UserStatus | ''; label: string }[] = [
  { value: '',                    label: 'Any status'           },
  { value: 'ACTIVE',              label: 'Active'               },
  { value: 'PENDING_VERIFICATION', label: 'Pending Verification' },
  { value: 'SUSPENDED',           label: 'Suspended'            },
  { value: 'BANNED',              label: 'Banned'               },
  { value: 'DEACTIVATED',         label: 'Deactivated'          },
]

function buildPreviewHtml(heading: string, body: string, subject: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>${subject || 'Email preview'}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }
  .wrapper { max-width: 600px; margin: 32px auto; padding: 0 16px 48px; }
  .card { background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 16px rgba(0,0,0,.08); }
  .header { background: #4f46e5; padding: 28px 32px; text-align: center; }
  .header-logo { color: #fff; font-size: 20px; font-weight: 800; letter-spacing: -0.5px; }
  .header-logo span { opacity: 0.6; font-weight: 400; }
  .body-wrap { padding: 36px 32px 28px; }
  .heading { font-size: 22px; font-weight: 800; color: #0f172a; line-height: 1.3; margin-bottom: 20px; }
  .content { font-size: 15px; color: #334155; line-height: 1.7; }
  .content p { margin-bottom: 14px; }
  .content a { color: #4f46e5; text-decoration: underline; }
  .content ul, .content ol { padding-left: 20px; margin-bottom: 14px; }
  .content li { margin-bottom: 6px; }
  .content h2 { font-size: 18px; font-weight: 700; color: #0f172a; margin: 20px 0 10px; }
  .content h3 { font-size: 16px; font-weight: 600; color: #1e293b; margin: 16px 0 8px; }
  .divider { height: 1px; background: #f1f5f9; margin: 24px 0; }
  .footer { padding: 20px 32px 28px; text-align: center; }
  .footer p { font-size: 12px; color: #94a3b8; line-height: 1.6; }
  .footer a { color: #4f46e5; text-decoration: none; }
  .empty-heading { color: #94a3b8; font-style: italic; }
  .empty-body { color: #cbd5e1; font-style: italic; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="card">
    <div class="header">
      <div class="header-logo">Asoose</div>
    </div>
    <div class="body-wrap">
      <div class="heading ${heading ? '' : 'empty-heading'}">${heading || 'Your email heading appears here'}</div>
      <div class="divider"></div>
      <div class="content">${body || '<p class="empty-body">Your email body content will appear here. Use the form on the left to compose your message.</p>'}</div>
    </div>
    <div class="footer">
      <p>You received this email because you are a registered Asoose user.<br/>
      <a href="#">Unsubscribe</a> · <a href="#">Privacy Policy</a></p>
      <p style="margin-top:8px">© ${new Date().getFullYear()} Asoose. All rights reserved.</p>
    </div>
  </div>
</div>
</body>
</html>`
}

export function EmailBroadcastClient() {
  const [audience, setAudience] = useState<NotificationAudience>('ALL')
  const [status, setStatus] = useState<UserStatus | ''>('')
  const [search, setSearch] = useState('')
  const [subject, setSubject] = useState('')
  const [heading, setHeading] = useState('')
  const [body, setBody] = useState('')
  const [errors, setErrors] = useState<{ subject?: string; heading?: string; body?: string }>({})
  const [serverError, setServerError] = useState('')
  const [result, setResult] = useState<EmailBroadcastResult | null>(null)
  const [isPending, startTransition] = useTransition()
  const [tab, setTab] = useState<'compose' | 'preview'>('compose')

  const previewHtml = useMemo(() => buildPreviewHtml(heading, body, subject), [heading, body, subject])

  function reset() {
    setSubject(''); setHeading(''); setBody('')
    setAudience('ALL'); setStatus(''); setSearch('')
    setErrors({}); setServerError(''); setResult(null)
    setTab('compose')
  }

  function validate() {
    const errs: typeof errors = {}
    if (!subject.trim()) errs.subject = 'Required'
    if (!heading.trim()) errs.heading = 'Required'
    if (!body.trim())    errs.body    = 'Required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  function handleSend() {
    if (!validate()) return
    setServerError('')
    startTransition(async () => {
      const res = await sendBroadcastEmail({
        audience,
        ...(status ? { status } : {}),
        ...(search.trim() ? { search: search.trim() } : {}),
        subject: subject.trim(),
        heading: heading.trim(),
        body: body.trim(),
      })
      if (res.error) { setServerError(res.error); return }
      setResult(res.data!)
    })
  }

  const audienceLabel = AUDIENCES.find(a => a.value === audience)?.label ?? 'Everyone'

  return (
    <main className="px-8 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Email Broadcast</h1>
        <p className="mt-0.5 text-sm text-slate-500">Compose and send a broadcast email to a group of users.</p>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        {/* ── Form ─────────────────────────────────────────────── */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-6 space-y-5">

          {/* Audience */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">Audience</label>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
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
          </div>

          {/* Filters row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Status filter <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as UserStatus | '')}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              >
                {STATUSES.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Search filter <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name or email…"
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {/* Subject */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">Subject <span className="text-red-500">*</span></label>
              <span className="text-[11px] text-slate-400">{subject.length}/100</span>
            </div>
            <input
              value={subject}
              maxLength={100}
              onChange={(e) => { setSubject(e.target.value); setErrors(p => ({ ...p, subject: undefined })) }}
              placeholder="🎉 Weekend Special — 20% off all orders"
              className={cn(
                'w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',
                errors.subject ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'
              )}
            />
            {errors.subject && <p className="mt-1 text-xs text-red-500">{errors.subject}</p>}
          </div>

          {/* Heading */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">Heading <span className="text-red-500">*</span></label>
              <span className="text-[11px] text-slate-400">{heading.length}/120</span>
            </div>
            <input
              value={heading}
              maxLength={120}
              onChange={(e) => { setHeading(e.target.value); setErrors(p => ({ ...p, heading: undefined })) }}
              placeholder="Don't miss this weekend's deals!"
              className={cn(
                'w-full rounded-xl border px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500',
                errors.heading ? 'border-red-300 bg-red-50' : 'border-slate-200 bg-slate-50'
              )}
            />
            {errors.heading && <p className="mt-1 text-xs text-red-500">{errors.heading}</p>}
          </div>

          {/* Body */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700">
                Body <span className="text-red-500">*</span>
              </label>
              <button
                type="button"
                onClick={() => setTab('preview')}
                className="text-[11px] text-indigo-600 hover:text-indigo-700 font-medium"
              >
                Preview →
              </button>
            </div>
            <RichTextEditor
              value={body}
              onChange={(html) => { setBody(html); setErrors(p => ({ ...p, body: undefined })) }}
              placeholder="Write your email content here — use the toolbar to format text, add links, and build your message."
              minHeight={240}
              hasError={!!errors.body}
            />
            {errors.body && <p className="mt-1 text-xs text-red-500">{errors.body}</p>}
          </div>

          {serverError && (
            <p className="rounded-xl bg-red-50 px-3 py-2.5 text-xs text-red-600">{serverError}</p>
          )}

          {result && (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-2 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-emerald-600 shrink-0">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                </svg>
                <p className="text-sm font-semibold text-emerald-800">Email broadcast sent</p>
              </div>
              <div className="space-y-1 text-xs text-emerald-700">
                <div className="flex justify-between gap-4"><span className="text-emerald-600">Audience</span><span className="font-medium">{audienceLabel}</span></div>
                {result.sent > 0 && <div className="flex justify-between gap-4"><span className="text-emerald-600">Sent</span><span className="font-medium">{result.sent.toLocaleString()}</span></div>}
                {result.failed > 0 && <div className="flex justify-between gap-4"><span className="text-emerald-600">Failed</span><span className="font-medium text-rose-600">{result.failed.toLocaleString()}</span></div>}
              </div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={reset}
              disabled={isPending}
              className="rounded-xl px-4 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
            >
              {result ? 'New email' : 'Clear'}
            </button>
            <button
              type="button"
              onClick={() => { if (validate()) setTab('preview') }}
              disabled={isPending}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Preview
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
                  Send to {audienceLabel}
                </>
              )}
            </button>
          </div>
        </div>

        {/* ── Preview ─────────────────────────────────────────── */}
        <div className="xl:sticky xl:top-8 self-start">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Email Preview</p>
            <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
              {(['compose', 'preview'] as const).map(t => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
                  className={cn(
                    'rounded-lg px-3 py-1 text-xs font-medium transition-colors capitalize',
                    tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  )}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {tab === 'compose' ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="mx-auto h-10 w-10 text-slate-300 mb-3">
                <path d="M1.5 8.67v8.58a3 3 0 0 0 3 3h15a3 3 0 0 0 3-3V8.67l-8.928 5.493a3 3 0 0 1-3.144 0L1.5 8.67Z" />
                <path d="M22.5 6.908V6.75a3 3 0 0 0-3-3h-15a3 3 0 0 0-3 3v.158l9.714 5.978a1.5 1.5 0 0 0 1.572 0L22.5 6.908Z" />
              </svg>
              <p className="text-sm text-slate-400">Fill in the form and click <strong className="text-slate-600">Preview</strong> to see your email.</p>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              {/* Fake browser chrome */}
              <div className="flex items-center gap-1.5 bg-slate-100 px-4 py-2.5 border-b border-slate-200">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                <div className="ml-3 flex-1 rounded-md bg-white px-3 py-1 text-xs text-slate-400 truncate border border-slate-200">
                  {subject || 'Email subject preview'}
                </div>
              </div>
              <iframe
                srcDoc={previewHtml}
                title="Email preview"
                sandbox="allow-same-origin"
                className="w-full bg-white"
                style={{ height: '560px', border: 'none' }}
              />
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
