'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import type { AdminUser } from '@/app/actions/admin-users'
import { addDisputeMessage, resolveDispute, updateDispute } from '@/app/actions/disputes'
import { Button } from '@/app/components/ui/button'
import { DetailCard, InfoGrid, InfoRow } from '@/app/components/ui/detail'
import { ImageUploader } from '@/app/components/ui/image-uploader'
import { Modal } from '@/app/components/ui/modal'
import { useToast } from '@/app/components/ui/toast'
import { cn, formatNaira } from '@/app/lib/utils'
import type {
  DisputeDetail,
  DisputePriority,
  DisputeResolution,
  DisputeStatus,
} from '@/app/lib/types'

const STATUSES: Exclude<DisputeStatus, 'RESOLVED'>[] = ['OPEN', 'IN_REVIEW', 'ESCALATED', 'CLOSED']
const PRIORITIES: DisputePriority[] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
const RESOLUTIONS: DisputeResolution[] = ['REFUND_FULL', 'REFUND_PARTIAL', 'REPLACEMENT', 'NO_ACTION', 'COMPENSATION']
const label = (value: string) => value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())
const dateTime = (value: string | null) => value ? new Date(value).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—'

export function DisputeDetailClient({
  initialDispute,
  admins,
}: {
  initialDispute: DisputeDetail
  admins: AdminUser[]
}) {
  const toast = useToast()
  const router = useRouter()
  const [dispute, setDispute] = useState(initialDispute)
  const [status, setStatus] = useState<Exclude<DisputeStatus, 'RESOLVED'>>(
    initialDispute.status === 'RESOLVED' ? 'CLOSED' : initialDispute.status
  )
  const [priority, setPriority] = useState(initialDispute.priority)
  const [assignedToId, setAssignedToId] = useState(initialDispute.assignedToId ?? '')
  const [updateError, setUpdateError] = useState('')
  const [isUpdating, startUpdate] = useTransition()

  const [message, setMessage] = useState('')
  const [attachments, setAttachments] = useState<string[]>([])
  const [isInternal, setIsInternal] = useState(false)
  const [messageError, setMessageError] = useState('')
  const [isSending, startSending] = useTransition()

  const [showResolve, setShowResolve] = useState(false)
  const [resolution, setResolution] = useState<DisputeResolution>('NO_ACTION')
  const [resolutionNotes, setResolutionNotes] = useState('')
  const [refundAmount, setRefundAmount] = useState('')
  const [resolveError, setResolveError] = useState('')
  const [isResolving, startResolving] = useTransition()

  function saveAssignment() {
    setUpdateError('')
    startUpdate(async () => {
      const result = await updateDispute(dispute.id, {
        status,
        priority,
        assignedToId: assignedToId || null,
      })
      if (result.error) { setUpdateError(result.error); toast.error(result.error); return }
      const assigned = admins.find(admin => admin.id === assignedToId)
      setDispute(current => ({
        ...current,
        ...result.data,
        status,
        priority,
        assignedToId: assignedToId || null,
        assignedAdmin: assigned ? {
          id: assigned.id,
          name: `${assigned.firstName} ${assigned.lastName}`,
          email: assigned.email,
          role: assigned.role,
        } : null,
      }))
      toast.success('Dispute updated.')
      router.refresh()
    })
  }

  function sendMessage() {
    if (!message.trim()) { setMessageError('Enter a message.'); return }
    setMessageError('')
    startSending(async () => {
      const result = await addDisputeMessage(dispute.id, {
        message: message.trim(),
        attachmentUrls: attachments,
        isInternal,
      })
      if (result.error || !result.data) { setMessageError(result.error ?? 'Failed to add message.'); return }
      setDispute(current => ({ ...current, messages: [...current.messages, result.data!] }))
      setMessage('')
      setAttachments([])
      toast.success(isInternal ? 'Internal note added.' : 'Reply sent to customer.')
    })
  }

  function submitResolution() {
    const needsRefund = resolution === 'REFUND_FULL' || resolution === 'REFUND_PARTIAL'
    const amount = Number(refundAmount)
    if (!resolutionNotes.trim()) { setResolveError('Resolution notes are required.'); return }
    if (needsRefund && (!Number.isFinite(amount) || amount <= 0)) { setResolveError('Enter a valid refund amount.'); return }
    setResolveError('')
    startResolving(async () => {
      const result = await resolveDispute(dispute.id, {
        resolution,
        resolutionNotes: resolutionNotes.trim(),
        ...(needsRefund ? { refundAmount: amount } : {}),
      })
      if (result.error) { setResolveError(result.error); toast.error(result.error); return }
      setDispute(current => ({ ...current, ...result.data, status: 'RESOLVED', resolution, refundAmount: needsRefund ? amount : null }))
      setShowResolve(false)
      toast.success('Dispute resolved.')
      router.refresh()
    })
  }

  const isResolved = dispute.status === 'RESOLVED'

  return (
    <main className="min-h-full">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/95 px-4 py-4 backdrop-blur sm:px-8">
        <Link href="/dashboard/disputes" className="mb-2 inline-flex text-xs font-semibold text-slate-500 hover:text-indigo-600">← Disputes</Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><div className="flex flex-wrap items-center gap-2"><h1 className="text-xl font-bold text-slate-900">{dispute.title}</h1><span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{label(dispute.status)}</span></div><p className="mt-1 text-sm text-slate-500">{dispute.category} · Opened {dateTime(dispute.createdAt)}</p></div>
          {!isResolved && <Button onClick={() => setShowResolve(true)}>Resolve dispute</Button>}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6 px-4 py-6 sm:px-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-6">
          <DetailCard title="Customer complaint"><p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">{dispute.message}</p></DetailCard>

          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4"><h2 className="text-sm font-semibold text-slate-900">Conversation</h2><p className="mt-0.5 text-xs text-slate-500">Public replies are visible to the customer. Internal notes are admin-only.</p></div>
            <div className="max-h-[34rem] space-y-4 overflow-y-auto bg-slate-50/60 px-6 py-5">
              {dispute.messages.length ? dispute.messages.map(item => (
                <div key={item.id} className={cn('rounded-2xl border p-4', item.isInternal ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white')}>
                  <div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase', item.isInternal ? 'bg-amber-200 text-amber-800' : 'bg-indigo-100 text-indigo-700')}>{item.isInternal ? 'Internal note' : 'Public reply'}</span><span className="text-xs font-semibold text-slate-700">{item.senderName}</span></div><time className="text-[11px] text-slate-400">{dateTime(item.createdAt)}</time></div>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-700">{item.message}</p>
                  {!!item.attachmentUrls.length && <div className="mt-3 flex gap-2">{item.attachmentUrls.map(url => <a key={url} href={url} target="_blank" rel="noreferrer" className="relative h-16 w-16 overflow-hidden rounded-lg bg-slate-100"><Image src={url} alt="Attachment" fill className="object-cover" unoptimized /></a>)}</div>}
                </div>
              )) : <p className="py-8 text-center text-sm text-slate-400">No messages yet.</p>}
            </div>
            {!isResolved && <div className="border-t border-slate-100 p-5"><div className="mb-3 flex rounded-xl bg-slate-100 p-1"><button onClick={() => setIsInternal(false)} className={cn('flex-1 rounded-lg py-2 text-xs font-semibold', !isInternal ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-500')}>Reply to customer</button><button onClick={() => setIsInternal(true)} className={cn('flex-1 rounded-lg py-2 text-xs font-semibold', isInternal ? 'bg-amber-50 text-amber-700 shadow-sm' : 'text-slate-500')}>Internal note</button></div><textarea value={message} onChange={e => setMessage(e.target.value)} rows={4} placeholder={isInternal ? 'Add a note for other admins…' : 'Write a response to the customer…'} className="w-full resize-none rounded-xl border-0 bg-slate-50 p-3 text-sm ring-1 ring-inset ring-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" /><div className="mt-3 flex flex-wrap items-end justify-between gap-3"><ImageUploader value={attachments} onChange={setAttachments} maxImages={4} category="general" /><Button size="sm" loading={isSending} onClick={sendMessage}>{isInternal ? 'Add note' : 'Send reply'}</Button></div>{messageError && <p className="mt-2 text-xs text-red-600">{messageError}</p>}</div>}
          </section>
        </div>

        <aside className="space-y-6">
          <DetailCard title="Case management"><div className="space-y-4"><div><label className="mb-1 block text-xs font-semibold text-slate-600">Status</label><select value={status} disabled={isResolved} onChange={e => setStatus(e.target.value as Exclude<DisputeStatus, 'RESOLVED'>)} className="h-10 w-full rounded-xl bg-slate-50 px-3 text-sm ring-1 ring-inset ring-slate-200">{STATUSES.map(value => <option key={value} value={value}>{label(value)}</option>)}</select></div><div><label className="mb-1 block text-xs font-semibold text-slate-600">Priority</label><select value={priority} disabled={isResolved} onChange={e => setPriority(e.target.value as DisputePriority)} className="h-10 w-full rounded-xl bg-slate-50 px-3 text-sm ring-1 ring-inset ring-slate-200">{PRIORITIES.map(value => <option key={value} value={value}>{label(value)}</option>)}</select></div><div><label className="mb-1 block text-xs font-semibold text-slate-600">Assigned admin</label><select value={assignedToId} disabled={isResolved} onChange={e => setAssignedToId(e.target.value)} className="h-10 w-full rounded-xl bg-slate-50 px-3 text-sm ring-1 ring-inset ring-slate-200"><option value="">Unassigned</option>{admins.map(admin => <option key={admin.id} value={admin.id}>{admin.firstName} {admin.lastName} · {label(admin.role)}</option>)}</select></div>{updateError && <p className="text-xs text-red-600">{updateError}</p>}{!isResolved && <Button className="w-full" loading={isUpdating} onClick={saveAssignment}>Save case changes</Button>}</div></DetailCard>
          <DetailCard title="Customer"><InfoGrid className="grid-cols-1"><InfoRow label="Name" value={dispute.customer.name} /><InfoRow label="Email" value={dispute.customer.email} /><InfoRow label="Phone" value={`${dispute.customer.phoneCountryCode ?? ''} ${dispute.customer.phone}`} /><InfoRow label="Account status" value={dispute.customer.status} /><InfoRow label="Joined" value={dateTime(dispute.customer.joinedAt)} /></InfoGrid><Link href={`/dashboard/customers/${dispute.customer.id}`} className="mt-4 inline-flex text-xs font-semibold text-indigo-600">View customer profile →</Link></DetailCard>
          {dispute.relatedTransaction && (
            <DetailCard title="Related transaction">
              <InfoGrid className="grid-cols-1">
                {Object.entries(dispute.relatedTransaction)
                  .filter(([, value]) => ['string', 'number', 'boolean'].includes(typeof value))
                  .slice(0, 8)
                  .map(([key, value]) => (
                    <InfoRow key={key} label={label(key)} value={String(value)} />
                  ))}
              </InfoGrid>
            </DetailCard>
          )}
          {isResolved && <DetailCard title="Resolution"><InfoGrid className="grid-cols-1"><InfoRow label="Outcome" value={dispute.resolution ? label(dispute.resolution) : null} /><InfoRow label="Refund" value={dispute.refundAmount != null ? formatNaira(dispute.refundAmount) : null} /><InfoRow label="Resolved" value={dateTime(dispute.resolvedAt)} /></InfoGrid></DetailCard>}
        </aside>
      </div>

      <Modal open={showResolve} onClose={() => setShowResolve(false)} title="Resolve dispute" description="This records the final outcome and closes the case." footer={<><Button variant="secondary" size="sm" onClick={() => setShowResolve(false)} disabled={isResolving}>Cancel</Button><Button size="sm" loading={isResolving} onClick={submitResolution}>Confirm resolution</Button></>}>
        <div className="space-y-4">{resolveError && <p className="rounded-lg bg-red-50 p-3 text-xs text-red-600">{resolveError}</p>}<div><label className="mb-1.5 block text-xs font-semibold text-slate-700">Resolution</label><select value={resolution} onChange={e => setResolution(e.target.value as DisputeResolution)} className="h-10 w-full rounded-xl bg-slate-50 px-3 text-sm ring-1 ring-inset ring-slate-200">{RESOLUTIONS.map(value => <option key={value} value={value}>{label(value)}</option>)}</select></div>{(resolution === 'REFUND_FULL' || resolution === 'REFUND_PARTIAL') && <div><label className="mb-1.5 block text-xs font-semibold text-slate-700">Refund amount (₦)</label><input type="number" min="0" value={refundAmount} onChange={e => setRefundAmount(e.target.value)} className="h-10 w-full rounded-xl bg-slate-50 px-3 text-sm ring-1 ring-inset ring-slate-200" /></div>}<div><label className="mb-1.5 block text-xs font-semibold text-slate-700">Resolution notes</label><textarea rows={4} value={resolutionNotes} onChange={e => setResolutionNotes(e.target.value)} className="w-full resize-none rounded-xl bg-slate-50 p-3 text-sm ring-1 ring-inset ring-slate-200" placeholder="Explain the investigation and final decision…" /></div></div>
      </Modal>
    </main>
  )
}
