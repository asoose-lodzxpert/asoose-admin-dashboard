'use client'

import Image from 'next/image'
import { useState, useTransition } from 'react'
import { cn, formatNaira } from '@/app/lib/utils'
import { createRoomType, updateRoomType, deleteRoomType } from '@/app/actions/properties'
import type { RoomType } from '@/app/lib/types'
import { Modal } from '@/app/components/ui/modal'
import { Button } from '@/app/components/ui/button'
import { ImageUploader } from '@/app/components/ui/image-uploader'

const INPUT = 'w-full h-9 rounded-xl border-0 bg-slate-50 px-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none'
const LABEL = 'block text-xs font-medium text-slate-600 mb-1'

/* ─── Form ────────────────────────────────────────────────── */

const EMPTY_FORM = {
  name: '',
  description: '',
  pricePerNight: '',
  quantity: '',
  maxGuests: '',
  images: [] as string[],
}
type FormState = typeof EMPTY_FORM

function roomTypeToForm(r: RoomType): FormState {
  const images = r.images?.length > 0 ? r.images : (r.image ? [r.image] : [])
  return {
    name: r.name,
    description: r.description ?? '',
    pricePerNight: String(r.pricePerNight),
    quantity: String(r.quantity),
    maxGuests: String(r.maxGuests),
    images,
  }
}

function RoomTypeFormModal({
  open,
  onClose,
  onSaved,
  propertyId,
  editing,
}: {
  open: boolean
  onClose: () => void
  onSaved: (r: RoomType) => void
  propertyId: string
  editing: RoomType | null
}) {
  const [form, setForm] = useState<FormState>(() => editing ? roomTypeToForm(editing) : EMPTY_FORM)
  const [error, setError] = useState('')
  const [isPending, start] = useTransition()

  const set = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  function handleSubmit() {
    setError('')
    if (!form.name.trim()) { setError('Name is required'); return }
    const pricePerNight = parseFloat(form.pricePerNight)
    if (isNaN(pricePerNight) || pricePerNight < 0) { setError('Price per night must be a valid number'); return }
    const quantity = parseInt(form.quantity, 10)
    if (isNaN(quantity) || quantity < 1) { setError('Quantity must be at least 1'); return }
    const maxGuests = parseInt(form.maxGuests, 10)
    if (isNaN(maxGuests) || maxGuests < 1) { setError('Max guests must be at least 1'); return }

    const data: Record<string, unknown> = { name: form.name.trim(), pricePerNight, quantity, maxGuests }
    if (form.description.trim()) data.description = form.description.trim()
    if (form.images.length > 0) {
      data.images = form.images
      data.image = form.images[0]
    }

    start(async () => {
      const result = editing
        ? await updateRoomType(propertyId, editing.id, data)
        : await createRoomType(propertyId, data)
      if (result.error) { setError(result.error); return }
      onSaved(result.roomType!)
      onClose()
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Room Type' : 'New Room Type'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button size="sm" loading={isPending} onClick={handleSubmit}>
            {editing ? 'Save Changes' : 'Create Room Type'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-600 ring-1 ring-inset ring-red-600/20">{error}</p>
        )}
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={LABEL}>Name *</label>
            <input type="text" value={form.name} onChange={set('name')} placeholder="Executive Suite" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Price / Night (₦) *</label>
            <input type="number" min="0" step="0.01" value={form.pricePerNight} onChange={set('pricePerNight')} placeholder="0.00" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Quantity *</label>
            <input type="number" min="1" value={form.quantity} onChange={set('quantity')} placeholder="1" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Max Guests *</label>
            <input type="number" min="1" value={form.maxGuests} onChange={set('maxGuests')} placeholder="2" className={INPUT} />
          </div>
          <div className="col-span-2">
            <label className={LABEL}>Images</label>
            <ImageUploader
              value={form.images}
              onChange={urls => setForm(f => ({ ...f, images: urls }))}
              maxImages={10}
              category="general"
            />
            {form.images.length > 0 && (
              <p className="mt-1.5 text-[11px] text-slate-400">First image is used as the main thumbnail.</p>
            )}
          </div>
          <div className="col-span-2">
            <label className={LABEL}>Description</label>
            <textarea
              value={form.description}
              onChange={set('description')}
              placeholder="Optional"
              rows={3}
              className="w-full rounded-xl border-0 bg-slate-50 px-3 py-2 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none resize-none"
            />
          </div>
        </div>
      </div>
    </Modal>
  )
}

/* ─── Card ────────────────────────────────────────────────── */

function RoomTypeCard({
  roomType,
  onEdit,
  onDelete,
}: {
  roomType: RoomType
  onEdit: (r: RoomType) => void
  onDelete: (r: RoomType) => void
}) {
  return (
    <div className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
        {roomType.image ? (
          <Image src={roomType.image} alt={roomType.name} fill className="object-cover" unoptimized />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="h-8 w-8 text-slate-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75" />
            </svg>
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{roomType.name}</p>
            {roomType.description && (
              <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{roomType.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {!roomType.isActive && (
              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-slate-100 text-slate-500">Inactive</span>
            )}
            <button
              onClick={() => onEdit(roomType)}
              title="Edit"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(roomType)}
              title="Delete"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path fillRule="evenodd" d="M8.75 1A2.75 2.75 0 0 0 6 3.75v.443c-.795.077-1.584.176-2.365.298a.75.75 0 1 0 .23 1.482l.149-.022.841 10.518A2.75 2.75 0 0 0 7.596 19h4.807a2.75 2.75 0 0 0 2.742-2.53l.841-10.52.149.023a.75.75 0 0 0 .23-1.482A41.03 41.03 0 0 0 14 4.193V3.75A2.75 2.75 0 0 0 11.25 1h-2.5ZM10 4c.84 0 1.673.025 2.5.075V3.75c0-.69-.56-1.25-1.25-1.25h-2.5c-.69 0-1.25.56-1.25 1.25v.325C8.327 4.025 9.16 4 10 4ZM8.58 7.72a.75.75 0 0 0-1.5.06l.3 7.5a.75.75 0 1 0 1.5-.06l-.3-7.5Zm4.34.06a.75.75 0 1 0-1.5-.06l-.3 7.5a.75.75 0 1 0 1.5.06l.3-7.5Z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-2 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-bold text-slate-900">{formatNaira(roomType.pricePerNight)}/night</span>
          <span className="text-xs text-slate-500">{roomType.quantity} unit{roomType.quantity !== 1 ? 's' : ''}</span>
          <span className="text-xs text-slate-500">Up to {roomType.maxGuests} guest{roomType.maxGuests !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </div>
  )
}

/* ─── Section ─────────────────────────────────────────────── */

export function PropertyRoomTypesSection({ propertyId, initialRoomTypes }: { propertyId: string; initialRoomTypes: RoomType[] }) {
  const [roomTypes, setRoomTypes] = useState(initialRoomTypes)
  const [isDeleting, startDelete] = useTransition()

  const [showForm, setShowForm] = useState(false)
  const [editingRoomType, setEditingRoomType] = useState<RoomType | null>(null)
  const [deletingRoomType, setDeletingRoomType] = useState<RoomType | null>(null)
  const [deleteError, setDeleteError] = useState('')

  function openCreate() {
    setEditingRoomType(null)
    setShowForm(true)
  }

  function openEdit(r: RoomType) {
    setEditingRoomType(r)
    setShowForm(true)
  }

  function onRoomTypeSaved(saved: RoomType) {
    setRoomTypes(prev => {
      const idx = prev.findIndex(r => r.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [saved, ...prev]
    })
  }

  function confirmDelete() {
    if (!deletingRoomType) return
    setDeleteError('')
    startDelete(async () => {
      const result = await deleteRoomType(propertyId, deletingRoomType.id)
      if (result.error) {
        setDeleteError(result.error)
      } else {
        setRoomTypes(prev => prev.filter(r => r.id !== deletingRoomType.id))
        setDeletingRoomType(null)
      }
    })
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-100 px-6 py-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Room Types</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{roomTypes.length}</span>
          </div>
          <Button size="sm" onClick={openCreate}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            Add Room Type
          </Button>
        </div>
      </div>

      {roomTypes.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <p className="text-sm text-slate-400">No room types yet</p>
          <Button size="sm" variant="secondary" onClick={openCreate}>Add first room type</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 p-6 xl:grid-cols-2">
          {roomTypes.map(r => <RoomTypeCard key={r.id} roomType={r} onEdit={openEdit} onDelete={(rt) => { setDeleteError(''); setDeletingRoomType(rt) }} />)}
        </div>
      )}

      {showForm && (
        <RoomTypeFormModal
          open={showForm}
          onClose={() => setShowForm(false)}
          onSaved={onRoomTypeSaved}
          propertyId={propertyId}
          editing={editingRoomType}
        />
      )}

      {deletingRoomType && (
        <Modal
          open={!!deletingRoomType}
          onClose={() => setDeletingRoomType(null)}
          title="Delete room type"
          description={`Delete "${deletingRoomType.name}"? This action cannot be undone.`}
          size="sm"
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setDeletingRoomType(null)} disabled={isDeleting}>Cancel</Button>
              <Button variant="danger" size="sm" loading={isDeleting} onClick={confirmDelete}>Delete</Button>
            </>
          }
        >
          {deleteError ? (
            <p className="text-xs font-medium text-red-600">{deleteError}</p>
          ) : (
            <div />
          )}
        </Modal>
      )}
    </div>
  )
}
