'use client'

import { useState } from 'react'
import { cn } from '@/app/lib/utils'

interface DocCardProps {
  label: string
  url: string | null | undefined
}

export function DocCard({ label, url }: DocCardProps) {
  const [failed, setFailed] = useState(false)
  const [zoomed, setZoomed] = useState(false)
  const display = label.replace(/([A-Z])/g, ' $1').trim()

  return (
    <div className="flex flex-col gap-1.5">
      {!url ? (
        <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
          <span className="text-xs text-slate-400">Not uploaded</span>
        </div>
      ) : !failed ? (
        <button
          type="button"
          onClick={() => setZoomed(true)}
          className="group relative h-32 w-full overflow-hidden rounded-xl bg-slate-100"
        >
          <img
            src={url}
            alt={display}
            className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-105"
            onError={() => setFailed(true)}
          />
          {/* hover overlay */}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors group-hover:bg-black/25">
            <div className={cn(
              'flex h-8 w-8 items-center justify-center rounded-full bg-white/90 opacity-0 shadow',
              'transition-opacity group-hover:opacity-100'
            )}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 text-slate-700">
                <path d="M9 6a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM17.555 7.975a1 1 0 0 0 0-1.95l-5-1.667a1 1 0 0 0-.634 0l-5 1.667a1 1 0 0 0 0 1.95l5 1.666a1 1 0 0 0 .633 0l5-1.666ZM1.945 11.025a1 1 0 0 1 .634-.975l5-1.667a1 1 0 0 1 .634 0l5 1.667a1 1 0 0 1 0 1.95l-5 1.666a1 1 0 0 1-.634 0l-5-1.666a1 1 0 0 1-.634-.975ZM1.945 15.025a1 1 0 0 1 .634-.975l5-1.667a1 1 0 0 1 .634 0l5 1.667a1 1 0 0 1 0 1.95l-5 1.666a1 1 0 0 1-.634 0l-5-1.666a1 1 0 0 1-.634-.975Z" />
          </svg>
            </div>
          </div>
        </button>
      ) : (
        /* image failed to load → fallback to download link */
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex h-32 flex-col items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 text-indigo-600 transition-colors hover:bg-indigo-50"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-6 w-6 opacity-70">
            <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0-6a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5h-3Z" clipRule="evenodd" />
          </svg>
          <span className="text-xs font-medium">View Document</span>
        </a>
      )}
      <p className="text-[11px] font-medium capitalize text-slate-500">{display}</p>

      {/* Lightbox */}
      {zoomed && (
        <div
          className="fixed inset-0 z-200 flex items-center justify-center bg-black/80 backdrop-blur-sm"
          onClick={() => setZoomed(false)}
        >
          <img
            src={url ?? ''}
            alt={display}
            className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <button
            type="button"
            onClick={() => setZoomed(false)}
            className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white transition-colors hover:bg-white/30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
          <a
            href={url ?? ''}
            target="_blank"
            rel="noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="absolute left-4 top-4 flex h-9 items-center gap-2 rounded-full bg-white/20 px-3 text-xs font-medium text-white transition-colors hover:bg-white/30"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M10.75 2.75a.75.75 0 0 0-1.5 0v8.614L6.295 8.235a.75.75 0 1 0-1.09 1.03l4.25 4.5a.75.75 0 0 0 1.09 0l4.25-4.5a.75.75 0 0 0-1.09-1.03l-2.955 3.129V2.75Z" />
              <path d="M3.5 12.75a.75.75 0 0 0-1.5 0v2.5A2.75 2.75 0 0 0 4.75 18h10.5A2.75 2.75 0 0 0 18 15.25v-2.5a.75.75 0 0 0-1.5 0v2.5c0 .69-.56 1.25-1.25 1.25H4.75c-.69 0-1.25-.56-1.25-1.25v-2.5Z" />
            </svg>
            Open original
          </a>
        </div>
      )}
    </div>
  )
}

/* ─── Docs grid ──────────────────────────────────────────── */

export function DocsGrid({ docs }: { docs: Record<string, string | null | undefined | boolean> }) {
  const urlEntries = Object.entries(docs).filter(([, v]) => typeof v !== 'boolean')
  const boolEntries = Object.entries(docs).filter(([, v]) => typeof v === 'boolean') as [string, boolean][]

  if (urlEntries.length === 0 && boolEntries.length === 0) {
    return <p className="text-xs text-slate-400">No documents.</p>
  }

  return (
    <div className="space-y-4">
      {urlEntries.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {urlEntries.map(([key, url]) => (
            <DocCard key={key} label={key} url={url as string | null} />
          ))}
        </div>
      )}
      {boolEntries.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {boolEntries.map(([key, val]) => (
            <div key={key} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
              <span className={cn('h-2 w-2 rounded-full', val ? 'bg-emerald-500' : 'bg-red-400')} />
              <span className="text-xs text-slate-600 capitalize">
                {key.replace(/([A-Z])/g, ' $1').trim()}: <strong>{val ? 'Yes' : 'No'}</strong>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
