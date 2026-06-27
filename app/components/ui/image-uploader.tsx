'use client'

import Image from 'next/image'
import { useRef, useState, useTransition } from 'react'
import { cn } from '@/app/lib/utils'
import { uploadImage } from '@/app/actions/uploads'

interface ImageUploaderProps {
  value: string[]
  onChange: (urls: string[]) => void
  maxImages?: number
  category?: 'product' | 'general'
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

export function ImageUploader({
  value,
  onChange,
  maxImages = 1,
  category = 'product',
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isUploading, startUpload] = useTransition()
  const [error, setError] = useState('')
  const isMulti = maxImages > 1
  const canAddMore = value.length < maxImages

  function handleFiles(files: FileList) {
    setError('')
    const toUpload = Array.from(files).slice(0, maxImages - value.length)
    if (toUpload.length === 0) return

    startUpload(async () => {
      const results = await Promise.all(
        toUpload.map(file => {
          const fd = new FormData()
          fd.append('file', file)
          return uploadImage(fd, category)
        })
      )

      const urls = results.flatMap(r => (r.url ? [r.url] : []))
      const firstError = results.find(r => r.error)?.error
      if (firstError) setError(firstError)
      if (urls.length > 0) onChange([...value, ...urls])
    })
  }

  function remove(idx: number) {
    onChange(value.filter((_, i) => i !== idx))
  }

  return (
    <div>
      {/* Thumbnails */}
      {value.length > 0 && (
        <div className="mb-3 flex flex-wrap gap-2">
          {value.map((url, idx) => (
            <div key={url + idx} className="group relative h-20 w-20 overflow-hidden rounded-xl bg-slate-100">
              <Image src={url} alt={`Image ${idx + 1}`} fill className="object-cover" unoptimized />
              {isMulti && idx === 0 && (
                <div className="absolute bottom-0 left-0 right-0 rounded-b-xl bg-indigo-600 py-0.5 text-center text-[9px] font-bold text-white">
                  Main
                </div>
              )}
              <button
                type="button"
                onClick={() => remove(idx)}
                className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-slate-900/50 text-white opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-600"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3">
                  <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Upload trigger */}
      {canAddMore && (
        <button
          type="button"
          disabled={isUploading}
          onClick={() => inputRef.current?.click()}
          className={cn(
            'inline-flex items-center gap-2 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-600 transition-colors',
            'hover:border-indigo-400 hover:bg-indigo-50 hover:text-indigo-700',
            'disabled:cursor-not-allowed disabled:opacity-60',
          )}
        >
          {isUploading ? <Spinner /> : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path fillRule="evenodd" d="M1 5.25A2.25 2.25 0 0 1 3.25 3h13.5A2.25 2.25 0 0 1 19 5.25v9.5A2.25 2.25 0 0 1 16.75 17H3.25A2.25 2.25 0 0 1 1 14.75v-9.5Zm1.5 5.81v3.69c0 .414.336.75.75.75h13.5a.75.75 0 0 0 .75-.75v-2.69l-2.22-2.219a.75.75 0 0 0-1.06 0l-1.91 1.909.47.47a.75.75 0 1 1-1.06 1.06L6.53 8.091a.75.75 0 0 0-1.06 0l-2.97 2.97ZM12 7a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" clipRule="evenodd" />
            </svg>
          )}
          {isUploading
            ? 'Uploading…'
            : isMulti
              ? value.length === 0 ? 'Upload Images' : 'Add Image'
              : value.length === 0 ? 'Upload Image' : 'Replace Image'}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        multiple={isMulti}
        className="sr-only"
        onChange={e => {
          if (e.target.files) handleFiles(e.target.files)
          e.target.value = ''
        }}
      />

      {error && <p className="mt-1.5 text-xs text-red-600">{error}</p>}
    </div>
  )
}
