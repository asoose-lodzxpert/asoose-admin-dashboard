'use client'

import { useState, useRef, useEffect } from 'react'
import { cn } from '@/app/lib/utils'
import { uploadImage } from '@/app/actions/uploads'
import { useToast } from '@/app/components/ui/toast'

export interface DocumentField {
  key: string
  label: string
  clearable: boolean
}

interface DocumentsSectionProps {
  fields: DocumentField[]
  documents: Record<string, string | null | boolean>
  patchDocuments: (
    changes: Record<string, string | null>
  ) => Promise<{ data?: Record<string, string | null | boolean>; error?: string }>
  onUpdate: (docs: Record<string, string | null | boolean>) => void
  className?: string
}

function isValidUrl(v: unknown): v is string {
  return typeof v === 'string' && (v.startsWith('http://') || v.startsWith('https://'))
}

function isPdfUrl(v: string): boolean {
  return v.toLowerCase().includes('.pdf')
}

function DocSlot({
  field,
  value,
  pending,
  busy,
  onUpload,
  onRemoveRequest,
}: {
  field: DocumentField
  value: string | null | boolean
  pending: boolean
  busy: boolean
  onUpload: (file: File) => void
  onRemoveRequest: () => void
}) {
  const [imgError, setImgError] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => { setImgError(false) }, [value])

  const validUrl = isValidUrl(value)
  const showPdf = validUrl && isPdfUrl(value as string)
  const showImg = validUrl && !showPdf && !imgError
  const showImgFallback = validUrl && !showPdf && imgError

  function triggerPicker() {
    if (!busy && inputRef.current) {
      inputRef.current.value = ''
      inputRef.current.click()
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
      {/* Hidden file input — display:none keeps it out of layout and prevents scroll-to-focus */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        style={{ display: 'none' }}
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) onUpload(file)
          e.target.value = ''
        }}
      />

      {/* Preview */}
      <div className="relative h-36 w-full bg-slate-100 flex items-center justify-center overflow-hidden">
        {showImg && (
          <img
            src={value as string}
            alt={field.label}
            className="h-full w-full object-cover"
            onError={() => setImgError(true)}
          />
        )}
        {(showPdf || showImgFallback) && (
          <div className="flex flex-col items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10 text-slate-400">
              <path fillRule="evenodd" d="M5.625 1.5c-1.036 0-1.875.84-1.875 1.875v17.25c0 1.035.84 1.875 1.875 1.875h12.75c1.035 0 1.875-.84 1.875-1.875V12.75A3.75 3.75 0 0 0 16.5 9h-1.875a1.875 1.875 0 0 1-1.875-1.875V5.25A3.75 3.75 0 0 0 9 1.5H5.625ZM7.5 15a.75.75 0 0 1 .75-.75h7.5a.75.75 0 0 1 0 1.5h-7.5A.75.75 0 0 1 7.5 15Zm.75 2.25a.75.75 0 0 0 0 1.5H12a.75.75 0 0 0 0-1.5H8.25Z" clipRule="evenodd" />
              <path d="M12.971 1.816A5.23 5.23 0 0 1 14.25 5.25v1.875c0 .207.168.375.375.375H16.5a5.23 5.23 0 0 1 3.434 1.279 9.768 9.768 0 0 0-6.963-6.963Z" />
            </svg>
            <a
              href={value as string}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 hover:underline"
            >
              View document
            </a>
          </div>
        )}
        {!validUrl && (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-8 w-8">
              <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 0 1 2.25-2.25h16.5A2.25 2.25 0 0 1 22.5 6v12a2.25 2.25 0 0 1-2.25 2.25H3.75A2.25 2.25 0 0 1 1.5 18V6ZM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0 0 21 18v-1.94l-2.69-2.689a1.5 1.5 0 0 0-2.12 0l-.88.879.97.97a.75.75 0 1 1-1.06 1.06l-5.16-5.159a1.5 1.5 0 0 0-2.12 0L3 16.061Zm10.125-7.81a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Z" clipRule="evenodd" />
            </svg>
            <span className="text-xs">Not provided</span>
          </div>
        )}
        {pending && (
          <div className="absolute inset-0 flex items-center justify-center bg-white/75">
            <svg className="h-6 w-6 animate-spin text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          </div>
        )}
      </div>

      {/* Label + actions */}
      <div className="px-3 py-2.5">
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">{field.label}</p>
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            disabled={busy}
            onClick={triggerPicker}
            className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
              <path d="M7.25 10.25a.75.75 0 0 0 1.5 0V4.56l2.22 2.22a.75.75 0 1 0 1.06-1.06l-3.5-3.5a.75.75 0 0 0-1.06 0l-3.5 3.5a.75.75 0 0 0 1.06 1.06l2.22-2.22v5.69Z" />
              <path d="M3.5 9.75a.75.75 0 0 0-1.5 0v1.5A2.75 2.75 0 0 0 4.75 14h6.5A2.75 2.75 0 0 0 14 11.25v-1.5a.75.75 0 0 0-1.5 0v1.5c0 .69-.56 1.25-1.25 1.25h-6.5c-.69 0-1.25-.56-1.25-1.25v-1.5Z" />
            </svg>
            {pending ? 'Uploading…' : validUrl ? 'Replace' : 'Upload'}
          </button>
          {field.clearable && validUrl && (
            <button
              type="button"
              disabled={busy}
              onClick={onRemoveRequest}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors disabled:opacity-50"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="h-3 w-3">
                <path fillRule="evenodd" d="M5 3.25V4H2.75a.75.75 0 0 0 0 1.5h.3l.815 8.15A1.5 1.5 0 0 0 5.357 15h5.285a1.5 1.5 0 0 0 1.493-1.35l.815-8.15h.3a.75.75 0 0 0 0-1.5H11v-.75A2.25 2.25 0 0 0 8.75 1h-1.5A2.25 2.25 0 0 0 5 3.25Zm2.25-.75a.75.75 0 0 0-.75.75V4h3v-.75a.75.75 0 0 0-.75-.75h-1.5ZM6.05 6a.75.75 0 0 1 .787.713l.275 5.5a.75.75 0 0 1-1.498.075l-.275-5.5A.75.75 0 0 1 6.05 6Zm3.9 0a.75.75 0 0 1 .712.787l-.275 5.5a.75.75 0 0 1-1.498-.075l.275-5.5a.75.75 0 0 1 .786-.711Z" clipRule="evenodd" />
              </svg>
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export function DocumentsSection({
  fields,
  documents,
  patchDocuments,
  onUpdate,
  className,
}: DocumentsSectionProps) {
  const toast = useToast()
  const [pendingField, setPendingField] = useState<string | null>(null)
  const [confirmingRemove, setConfirmingRemove] = useState<string | null>(null)

  async function handleUpload(fieldKey: string, file: File) {
    setPendingField(fieldKey)
    try {
      const fd = new FormData()
      fd.append('file', file)
      const up = await uploadImage(fd, 'general')
      if (up.error) { toast.error(up.error); return }
      const res = await patchDocuments({ [fieldKey]: up.url! })
      if (res.error) { toast.error(res.error); return }
      onUpdate(res.data!)
      toast.success('Document updated.')
    } finally {
      setPendingField(null)
    }
  }

  async function handleRemove(fieldKey: string) {
    setPendingField(fieldKey)
    setConfirmingRemove(null)
    try {
      const res = await patchDocuments({ [fieldKey]: null })
      if (res.error) { toast.error(res.error); return }
      onUpdate(res.data!)
      toast.success('Document removed.')
    } finally {
      setPendingField(null)
    }
  }

  const busy = pendingField !== null

  return (
    <div className={className}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((field) => (
          <DocSlot
            key={field.key}
            field={field}
            value={documents[field.key] ?? null}
            pending={pendingField === field.key}
            busy={busy}
            onUpload={(file) => { if (!busy) handleUpload(field.key, file) }}
            onRemoveRequest={() => { if (!busy) setConfirmingRemove(field.key) }}
          />
        ))}
      </div>

      {confirmingRemove && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={(e) => { if (e.target === e.currentTarget) setConfirmingRemove(null) }}
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl">
            <h3 className="text-base font-bold text-slate-900">Remove document?</h3>
            <p className="mt-1 text-sm text-slate-500">
              This will clear the file. You can upload a new one at any time.
            </p>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmingRemove(null)}
                disabled={busy}
                className="rounded-xl px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleRemove(confirmingRemove)}
                disabled={busy}
                className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {busy ? 'Removing…' : 'Remove'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
