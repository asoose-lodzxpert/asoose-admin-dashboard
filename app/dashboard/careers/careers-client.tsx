'use client'

import Image from 'next/image'
import { useRef, useState, useTransition, type FormEvent, type ReactNode } from 'react'
import { getCareerJob, getCareerJobs, saveCareerJob } from '@/app/actions/careers'
import { uploadImage } from '@/app/actions/uploads'
import { Button } from '@/app/components/ui/button'
import { employmentTypes, workplaceTypes, jobStatuses, label, validateJob, validWebUrl, type CareerJob, type CareerResult, type JobInput, type JobList } from '@/app/lib/careers'

const inputClass = 'w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100'
function Field({ title, children, hint }: { title: string; children: ReactNode; hint?: string }) {
  return <label className="block space-y-2"><span className="text-sm font-medium text-slate-700">{title}</span>{children}{hint && <span className="block text-xs leading-5 text-slate-500">{hint}</span>}</label>
}
function localDate(value: string) {
  const date = new Date(value)
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
}

function MarkdownEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [view, setView] = useState<'write' | 'preview'>('write')

  function replaceSelection(prefix: string, suffix = prefix, placeholder = 'text') {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = value.slice(start, end) || placeholder
    const next = `${value.slice(0, start)}${prefix}${selected}${suffix}${value.slice(end)}`
    onChange(next)
    requestAnimationFrame(() => {
      textarea.focus()
      textarea.setSelectionRange(start + prefix.length, start + prefix.length + selected.length)
    })
  }

  function prefixLines(prefix: string) {
    const textarea = textareaRef.current
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const lineStart = value.lastIndexOf('\n', start - 1) + 1
    const lineEnd = value.indexOf('\n', end)
    const selected = value.slice(lineStart, lineEnd === -1 ? value.length : lineEnd) || 'Write here'
    const next = `${value.slice(0, lineStart)}${selected.split('\n').map(line => `${prefix}${line}`).join('\n')}${lineEnd === -1 ? '' : value.slice(lineEnd)}`
    onChange(next)
    requestAnimationFrame(() => textarea.focus())
  }

  const toolClass = 'rounded-md px-2 py-1 text-xs font-semibold text-slate-600 transition hover:bg-white hover:text-indigo-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500'

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white transition focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100">
      <div className="flex flex-wrap items-center gap-1 border-b border-slate-100 bg-slate-50 px-2 py-2">
        {view === 'write' && <>
          <button type="button" className={toolClass} onClick={() => prefixLines('## ')} title="Heading">H2</button>
          <button type="button" className={toolClass} onClick={() => replaceSelection('**')} title="Bold"><strong>B</strong></button>
          <button type="button" className={toolClass} onClick={() => replaceSelection('_')} title="Italic"><em>I</em></button>
          <span className="mx-1 h-4 w-px bg-slate-200" />
          <button type="button" className={toolClass} onClick={() => prefixLines('- ')} title="Bullet list">• List</button>
          <button type="button" className={toolClass} onClick={() => prefixLines('1. ')} title="Numbered list">1. List</button>
          <button type="button" className={toolClass} onClick={() => replaceSelection('[', '](https://)', 'link text')} title="Link">Link</button>
        </>}
        <div className="ml-auto flex rounded-lg bg-white p-0.5 text-[11px] font-semibold shadow-sm ring-1 ring-inset ring-slate-200">
          <button type="button" onClick={() => setView('write')} className={`rounded-md px-2 py-1 ${view === 'write' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Write</button>
          <button type="button" onClick={() => setView('preview')} className={`rounded-md px-2 py-1 ${view === 'preview' ? 'bg-indigo-600 text-white' : 'text-slate-500'}`}>Preview</button>
        </div>
      </div>
      {view === 'write' ? <textarea
        ref={textareaRef}
        required
        maxLength={100000}
        rows={16}
        value={value}
        onChange={event => onChange(event.target.value)}
        placeholder={'## About the role\n\nTell candidates what they will work on.\n\n## Responsibilities\n\n- \n\n## Requirements\n\n- \n\n## Benefits\n\n- '}
        className="min-h-80 w-full resize-y border-0 px-4 py-3 font-mono text-sm leading-6 text-slate-900 outline-none placeholder:text-slate-400"
      /> : <MarkdownPreview value={value} />}
    </div>
  )
}

function MarkdownPreview({ value }: { value: string }) {
  const lines = value.split('\n')
  const nodes: ReactNode[] = []
  let index = 0
  while (index < lines.length) {
    const line = lines[index]
    if (!line.trim()) { index += 1; continue }
    const heading = /^(#{1,3})\s+(.+)$/.exec(line)
    if (heading) {
      const Heading = (`h${heading[1].length}` as 'h1' | 'h2' | 'h3')
      nodes.push(<Heading key={index} className={heading[1].length === 1 ? 'text-2xl font-bold' : heading[1].length === 2 ? 'text-xl font-bold' : 'text-base font-semibold'}>{inlineMarkdown(heading[2])}</Heading>)
      index += 1; continue
    }
    const unordered = /^[-*]\s+(.+)$/.exec(line)
    const ordered = /^\d+\.\s+(.+)$/.exec(line)
    if (unordered || ordered) {
      const orderedList = Boolean(ordered)
      const items: ReactNode[] = []
      while (index < lines.length) {
        const match = (orderedList ? /^\d+\.\s+(.+)$/ : /^[-*]\s+(.+)$/).exec(lines[index])
        if (!match) break
        items.push(<li key={index}>{inlineMarkdown(match[1])}</li>)
        index += 1
      }
      const List = orderedList ? 'ol' : 'ul'
      nodes.push(<List key={`list-${index}`} className={orderedList ? 'list-decimal space-y-1 pl-5' : 'list-disc space-y-1 pl-5'}>{items}</List>)
      continue
    }
    const paragraph: string[] = [line]
    index += 1
    while (index < lines.length && lines[index].trim() && !/^(#{1,3})\s+|^[-*]\s+|^\d+\.\s+/.test(lines[index])) paragraph.push(lines[index++])
    nodes.push(<p key={index}>{inlineMarkdown(paragraph.join(' '))}</p>)
  }
  return <div className="prose prose-sm min-h-80 max-w-none p-4 text-slate-800"><p className="mb-5 text-xs font-medium text-slate-400">Preview</p>{nodes.length ? nodes : <p className="text-slate-400">Your formatted job description will appear here.</p>}</div>
}

function inlineMarkdown(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*|_[^_]+_|\[[^\]]+\]\(https?:\/\/[^\s)]+\))/g)
  return parts.filter(Boolean).map((part, index) => {
    if (part.startsWith('**')) return <strong key={index}>{part.slice(2, -2)}</strong>
    if (part.startsWith('_')) return <em key={index}>{part.slice(1, -1)}</em>
    const link = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/.exec(part)
    if (link) return <a key={index} href={link[2]} target="_blank" rel="noreferrer" className="text-indigo-600 underline">{link[1]}</a>
    return part
  })
}

function JobEditor({ job, onClose, onSaved }: { job: CareerJob | null; onClose: () => void; onSaved: () => void }) {
  const [imageUrl, setImageUrl] = useState(job?.headerImageUrl ?? '')
  const [description, setDescription] = useState(job?.description ?? '')
  const [error, setError] = useState('')
  const [uploading, setUploading] = useState(false)
  const [saving, startSave] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)
  const initialDeadline = job ? localDate(job.endDate) : ''
  async function upload(file?: File) {
    if (!file) return
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { setError('Choose a JPG, PNG, or WebP image.'); return }
    if (file.size > 8 * 1024 * 1024) { setError('Choose an image smaller than 8 MB.'); return }
    setUploading(true)
    setError('')
    try {
      const data = new FormData()
      data.append('file', file)
      const result = await uploadImage(data, 'general')
      if (result.error) setError(result.error)
      else if (result.url && validWebUrl(result.url)) setImageUrl(result.url)
      else setError('The upload did not return a valid image URL. Please try again.')
    } catch { setError('Image upload failed. Please try again.') }
    finally { setUploading(false) }
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (uploading || saving) return
    const form = new FormData(event.currentTarget)
    const deadline = String(form.get('endDate'))
    const status = String(form.get('status')) as JobInput['status']
    const payload: Partial<JobInput> = {
      title: String(form.get('title')).trim(), description,
      headerImageUrl: imageUrl, formUrl: String(form.get('formUrl')).trim(),
      department: String(form.get('department')).trim() || null, location: String(form.get('location')).trim() || null,
      employmentType: String(form.get('employmentType')) as JobInput['employmentType'],
      workplaceType: String(form.get('workplaceType')) as JobInput['workplaceType'],
    }
    // Preserve unchanged deadlines (including their seconds) and allow edits after expiry.
    if (!job || deadline !== initialDeadline) {
      const timestamp = new Date(deadline)
      if (!Number.isFinite(timestamp.getTime())) { setError('Choose a valid application deadline.'); return }
      payload.endDate = timestamp.toISOString()
    }
    if (!job || status !== job.status) payload.status = status
    if (payload.status === 'PUBLISHED' && Date.parse(payload.endDate ?? job?.endDate ?? '') <= Date.now()) {
      setError('Set a future deadline before publishing or reopening this job.'); return
    }
    const validation = validateJob(payload, !job)
    if (validation) { setError(validation); return }
    setError('')
    startSave(async () => {
      try {
        const result = await saveCareerJob(payload, job?.id)
        if (result.error) setError(result.error)
        else onSaved()
      } catch { setError('Unable to save the job. Please try again.') }
    })
  }
  return <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-8">
    <Button variant="ghost" onClick={onClose} disabled={saving || uploading}>← Back to careers</Button>
    <div><p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Build the team</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">{job ? 'Edit vacancy' : 'Create a vacancy'}</h1><p className="mt-2 text-sm text-slate-500">Give great candidates a clear picture of their next role.</p></div>
    <form onSubmit={submit} className="space-y-6">
      <fieldset disabled={saving || uploading} className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="font-semibold text-slate-900">Role details</h2>
            <Field title="Job title *"><input autoFocus name="title" required minLength={2} maxLength={200} defaultValue={job?.title} placeholder="e.g. Backend Engineer" className={inputClass} /></Field>
            <div className="grid gap-5 sm:grid-cols-2"><Field title="Department"><input name="department" maxLength={120} defaultValue={job?.department ?? ''} placeholder="e.g. Engineering" className={inputClass} /></Field><Field title="Location"><input name="location" maxLength={200} defaultValue={job?.location ?? ''} placeholder="e.g. Lagos, Nigeria" className={inputClass} /></Field></div>
            <div className="grid gap-5 sm:grid-cols-2"><Field title="Employment type"><select name="employmentType" defaultValue={job?.employmentType ?? 'FULL_TIME'} className={inputClass}>{employmentTypes.map(value => <option key={value} value={value}>{label(value)}</option>)}</select></Field><Field title="Workplace"><select name="workplaceType" defaultValue={job?.workplaceType ?? 'ON_SITE'} className={inputClass}>{workplaceTypes.map(value => <option key={value} value={value}>{label(value)}</option>)}</select></Field></div>
          </section>
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <Field title="Job description *" hint="Use the formatting bar or type Markdown directly. Include responsibilities, requirements, benefits, and hiring steps."><MarkdownEditor value={description} onChange={setDescription} /></Field>
          </section>
        </div>
        <div className="space-y-6">
          <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-900">Header image <span className="text-slate-400">*</span></h2>
            <div className="relative flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-dashed border-slate-300 bg-slate-50">
              {imageUrl ? <Image src={imageUrl} alt="Job header preview" fill unoptimized className="object-cover" /> : <div className="px-4 text-center"><span className="text-3xl text-indigo-400" aria-hidden>↥</span><p className="mt-2 text-sm text-slate-500">Add a cover for this role</p></div>}
              {uploading && <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-900/60 text-center text-white backdrop-blur-sm" role="status" aria-live="polite">
                <svg className="h-7 w-7 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" className="opacity-25" stroke="currentColor" strokeWidth="3" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
                <span className="text-sm font-medium">Uploading image…</span>
              </div>}
            </div>
            <Button type="button" variant="secondary" className="w-full" onClick={() => fileRef.current?.click()} disabled={uploading}>{uploading ? 'Uploading image…' : imageUrl ? 'Replace image' : 'Upload image'}</Button>
            <input ref={fileRef} aria-label="Upload header image" type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={event => { void upload(event.target.files?.[0]); event.target.value = '' }} />
            <p className="text-xs leading-5 text-slate-500">JPG, PNG, or WebP · Up to 8 MB.<br />A wide landscape image works best.</p>
          </section>
          <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="font-semibold text-slate-900">Applications & visibility</h2>
            <Field title="Application form URL *" hint="Candidates apply through this external link."><input name="formUrl" type="url" required maxLength={2048} defaultValue={job?.formUrl} placeholder="https://forms.example.com/…" className={inputClass} /></Field>
            <Field title="Application deadline *" hint="Uses your local timezone. Applications close automatically at this time."><input name="endDate" type="datetime-local" required defaultValue={initialDeadline} className={inputClass} /></Field>
            <Field title="Status"><select name="status" defaultValue={job?.status ?? 'DRAFT'} className={inputClass}>{jobStatuses.map(value => <option key={value} value={value}>{label(value)}</option>)}</select></Field>
            <p className="rounded-xl bg-indigo-50 p-3 text-xs leading-5 text-indigo-700">Published jobs appear on the website until their deadline. Draft and inactive jobs remain hidden.</p>
          </section>
        </div>
      </fieldset>
      <div aria-live="polite">{uploading && <p className="text-sm text-indigo-600">Uploading header image…</p>}{error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</p>}</div>
      <div className="flex justify-end gap-3 border-t border-slate-200 pt-5"><Button type="button" variant="secondary" onClick={onClose} disabled={saving || uploading}>Cancel</Button><Button type="submit" loading={saving} disabled={uploading}>{job ? 'Save changes' : 'Create job'}</Button></div>
    </form>
  </div>
}

export function CareersClient({ initialResult }: { initialResult: CareerResult<JobList> }) {
  const [result, setResult] = useState(initialResult)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [expired, setExpired] = useState('')
  const [page, setPage] = useState(1)
  const [editor, setEditor] = useState<CareerJob | null | undefined>(undefined)
  const [notice, setNotice] = useState('')
  const [actionError, setActionError] = useState('')
  const [pending, startLoad] = useTransition()
  function load(nextPage = 1, nextStatus = status, nextExpired = expired) {
    setPage(nextPage)
    setStatus(nextStatus)
    setExpired(nextExpired)
    startLoad(async () => {
      try { setResult(await getCareerJobs({ page: nextPage, search, status: nextStatus, expired: nextExpired })) }
      catch { setResult({ error: 'Unable to load jobs. Please try again.' }) }
    })
  }
  function edit(id: string) {
    setActionError('')
    startLoad(async () => {
      try {
        const detail = await getCareerJob(id)
        if (detail.error) setActionError(detail.error)
        else setEditor(detail.data)
      } catch { setActionError('Unable to open this job. Please try again.') }
    })
  }
  if (editor !== undefined) return <JobEditor job={editor} onClose={() => setEditor(undefined)} onSaved={() => { setEditor(undefined); setNotice(editor ? 'Job updated successfully.' : 'Job created successfully.'); load(1) }} />
  return <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-8">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">Team & opportunities</p><h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900">Careers</h1><p className="mt-2 text-sm text-slate-500">Create opportunities. Find the people who will build what comes next.</p></div><Button onClick={() => { setNotice(''); setEditor(null) }} disabled={pending}>+ Create job</Button></div>
    {/* <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-slate-900 p-6 text-white"><div><h2 className="text-lg font-semibold">A great team starts with a great role.</h2><p className="mt-1 text-sm text-slate-300">Manage vacancies from the first draft to the final application.</p></div><span className="rounded-full border border-white/20 px-4 py-2 text-xs text-slate-200">Asoose Careers</span></div> */}
    {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700">{notice}</p>}
    {actionError && <p role="alert" className="text-sm text-red-600">{actionError}</p>}
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5"><div><h2 className="font-semibold text-slate-900">Job vacancies</h2><p className="mt-1 text-xs text-slate-500">{result.data ? `${result.data.pagination.total} matching vacancies` : 'Manage your website listings'}</p></div><Button variant="secondary" size="sm" disabled={pending} onClick={() => load(page)}>Refresh</Button></div>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3">
        <form onSubmit={event => { event.preventDefault(); load() }} className="relative min-w-0 flex-1 sm:max-w-sm">
          <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"><circle cx="11" cy="11" r="6" /><path strokeLinecap="round" d="m20 20-4.35-4.35" /></svg>
          <input aria-label="Search jobs" value={search} onChange={event => setSearch(event.target.value)} placeholder="Search jobs…" className="h-8 w-full rounded-lg border border-slate-200 bg-white py-1.5 pl-9 pr-3 text-xs text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100" />
        </form>
        <div className="flex items-center gap-1 rounded-lg bg-slate-50 p-1">
          <select aria-label="Filter by status" value={status} disabled={pending} onChange={event => load(1, event.target.value)} className="h-7 max-w-28 rounded-md border-0 bg-transparent px-2 text-xs font-medium text-slate-600 outline-none hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-500"><option value="">Status</option>{jobStatuses.map(value => <option key={value} value={value}>{label(value)}</option>)}</select>
          <span className="h-4 w-px bg-slate-200" />
          <select aria-label="Filter by deadline" value={expired} disabled={pending} onChange={event => load(1, status, event.target.value)} className="h-7 max-w-28 rounded-md border-0 bg-transparent px-2 text-xs font-medium text-slate-600 outline-none hover:bg-white focus:bg-white focus:ring-1 focus:ring-indigo-500"><option value="">Deadline</option><option value="false">Open</option><option value="true">Expired</option></select>
        </div>
        {(search || status || expired) && <button type="button" disabled={pending} onClick={() => { setSearch(''); load(1, '', '') }} className="h-7 rounded-md px-2 text-xs font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50">Clear</button>}
      </div>
      <div aria-busy={pending}>
        {pending && <p role="status" className="px-5 pt-4 text-sm text-indigo-600">Loading jobs…</p>}
        {!result.data ? <div className="p-10 text-center"><p role="alert" className="mb-4 text-sm text-red-600">{result.error}</p><Button variant="secondary" disabled={pending} onClick={() => load(page)}>Try again</Button></div> : result.data.jobs.length === 0 ? <div className="px-6 py-16 text-center"><div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50 text-2xl text-indigo-600" aria-hidden>＋</div><h3 className="font-semibold text-slate-900">No vacancies found</h3><p className="mt-2 text-sm text-slate-500">Create your first role or adjust the search filters.</p></div> : <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">{result.data.jobs.map(job => <article key={job.id} className="flex flex-col overflow-hidden rounded-xl border border-slate-200 transition-shadow hover:shadow-md"><div className="relative h-36 bg-slate-100">{validWebUrl(job.headerImageUrl) && <Image src={job.headerImageUrl} alt={`Cover for ${job.title}`} fill unoptimized className="object-cover" />}<span className={`absolute left-3 top-3 rounded-full px-2.5 py-1 text-xs font-semibold shadow-sm ${job.status === 'PUBLISHED' ? 'bg-emerald-50 text-emerald-700' : job.status === 'DRAFT' ? 'bg-amber-50 text-amber-700' : 'bg-slate-100 text-slate-600'}`}>{label(job.status)}</span>{job.isExpired && <span className="absolute right-3 top-3 rounded-full bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">Expired</span>}</div><div className="flex flex-1 flex-col p-4"><p className="text-xs font-medium text-indigo-600">{job.department || 'General'}</p><h3 className="mt-1 break-words text-base font-semibold text-slate-900">{job.title}</h3><p className="mt-2 text-sm text-slate-500">{job.location || 'Location not specified'}</p><div className="my-4 flex flex-wrap gap-2">{[job.employmentType, job.workplaceType].map(value => <span key={value} className="rounded-md bg-slate-50 px-2 py-1 text-xs text-slate-600">{label(value)}</span>)}</div><div className="mt-auto flex items-center justify-between gap-2 border-t border-slate-100 pt-3"><p className="text-xs text-slate-500">Closes {new Date(job.endDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Africa/Lagos' })}</p><Button variant="secondary" size="sm" disabled={pending} onClick={() => edit(job.id)}>Manage job</Button></div></div></article>)}</div>}
      </div>
      {result.data && result.data.pagination.totalPages > 1 && <div className="flex items-center justify-between border-t border-slate-100 p-5"><span className="text-sm text-slate-500">Page {result.data.pagination.page} of {result.data.pagination.totalPages}</span><div className="flex gap-2"><Button variant="secondary" size="sm" disabled={pending || page <= 1} onClick={() => load(page - 1)}>Previous</Button><Button variant="secondary" size="sm" disabled={pending || page >= result.data.pagination.totalPages} onClick={() => load(page + 1)}>Next</Button></div></div>}
    </section>
  </div>
}
