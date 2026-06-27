'use client'

import Image from 'next/image'
import { useState, useTransition, useRef } from 'react'
import { cn } from '@/app/lib/utils'
import { getVendorProducts, createProduct, updateProduct, deleteProduct } from '@/app/actions/vendors'
import type { Product } from '@/app/lib/types'
import { Modal } from '@/app/components/ui/modal'
import { Button } from '@/app/components/ui/button'
import { ImageUploader } from '@/app/components/ui/image-uploader'

type PStatus = Product['status']

const STATUS_STYLES: Record<PStatus, string> = {
  ACTIVE:       'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  INACTIVE:     'bg-slate-100 text-slate-500 ring-slate-200',
  DRAFT:        'bg-amber-50 text-amber-700 ring-amber-600/20',
  OUT_OF_STOCK: 'bg-red-50 text-red-600 ring-red-600/20',
}

function formatPrice(n: number) {
  return `₦${n.toLocaleString('en-NG')}`
}

/* ─── Form ────────────────────────────────────────────────── */

const EMPTY_FORM = {
  name: '',
  basePrice: '',
  price: '',
  comparePrice: '',
  description: '',
  sku: '',
  images: [] as string[],
  stock: '',
  isFeatured: false,
  isActive: true,
}
type FormState = typeof EMPTY_FORM

function productToForm(p: Product): FormState {
  const images = p.images?.length > 0 ? p.images : (p.image ? [p.image] : [])
  return {
    name: p.name,
    basePrice: String(p.basePrice),
    price: String(p.price),
    comparePrice: p.comparePrice != null ? String(p.comparePrice) : '',
    description: p.description ?? '',
    sku: p.sku ?? '',
    images,
    stock: String(p.stock),
    isFeatured: p.isFeatured,
    isActive: p.isActive,
  }
}

const INPUT = 'w-full h-9 rounded-xl border-0 bg-slate-50 px-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none'
const LABEL = 'block text-xs font-medium text-slate-600 mb-1'

function ProductFormModal({
  open,
  onClose,
  onSaved,
  vendorId,
  editing,
}: {
  open: boolean
  onClose: () => void
  onSaved: (p: Product) => void
  vendorId: string
  editing: Product | null
}) {
  const [form, setForm] = useState<FormState>(() => editing ? productToForm(editing) : EMPTY_FORM)
  const [error, setError] = useState('')
  const [isPending, start] = useTransition()

  const set = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm(f => ({ ...f, [k]: e.target.value }))

  const setCheck = (k: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement>) =>
      setForm(f => ({ ...f, [k]: e.target.checked }))

  function handleSubmit() {
    setError('')
    if (!form.name.trim()) { setError('Name is required'); return }
    const basePrice = parseFloat(form.basePrice)
    if (isNaN(basePrice) || basePrice < 0) { setError('Base price must be a valid number'); return }

    const data: Record<string, unknown> = {
      name: form.name.trim(),
      basePrice,
      isFeatured: form.isFeatured,
    }
    if (form.price) data.price = parseFloat(form.price)
    if (form.comparePrice) data.comparePrice = parseFloat(form.comparePrice)
    if (form.description.trim()) data.description = form.description.trim()
    if (form.sku.trim()) data.sku = form.sku.trim()
    if (form.images.length > 0) {
      data.images = form.images
      data.image = form.images[0]
    }
    if (form.stock) data.stock = parseInt(form.stock, 10)
    if (editing) data.isActive = form.isActive

    start(async () => {
      const result = editing
        ? await updateProduct(vendorId, editing.id, data)
        : await createProduct(vendorId, data)
      if (result.error) { setError(result.error); return }
      onSaved(result.product!)
      onClose()
    })
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit Product' : 'New Product'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isPending}>Cancel</Button>
          <Button size="sm" loading={isPending} onClick={handleSubmit}>
            {editing ? 'Save Changes' : 'Create Product'}
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
            <input type="text" value={form.name} onChange={set('name')} placeholder="Product name" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Base Price (₦) *</label>
            <input type="number" min="0" step="0.01" value={form.basePrice} onChange={set('basePrice')} placeholder="0.00" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Sale Price (₦)</label>
            <input type="number" min="0" step="0.01" value={form.price} onChange={set('price')} placeholder="Leave blank to use base price" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Compare-at Price (₦)</label>
            <input type="number" min="0" step="0.01" value={form.comparePrice} onChange={set('comparePrice')} placeholder="Original / strikethrough price" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Stock Quantity</label>
            <input type="number" min="0" value={form.stock} onChange={set('stock')} placeholder="0" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>SKU</label>
            <input type="text" value={form.sku} onChange={set('sku')} placeholder="Optional identifier" className={INPUT} />
          </div>
          <div className="col-span-2">
            <label className={LABEL}>Images</label>
            <ImageUploader
              value={form.images}
              onChange={urls => setForm(f => ({ ...f, images: urls }))}
              maxImages={10}
              category="product"
            />
            {form.images.length > 0 && (
              <p className="mt-1.5 text-[11px] text-slate-400">First image is used as the main thumbnail. Hover to remove.</p>
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
          <div className="col-span-2 flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
              <input type="checkbox" checked={form.isFeatured} onChange={setCheck('isFeatured')} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
              Featured
            </label>
            {editing && (
              <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer select-none">
                <input type="checkbox" checked={form.isActive} onChange={setCheck('isActive')} className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                Active
              </label>
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}

/* ─── Product Card ────────────────────────────────────────── */

function ProductCard({
  product,
  onEdit,
  onDelete,
}: {
  product: Product
  onEdit: (p: Product) => void
  onDelete: (p: Product) => void
}) {
  const hasDiscount = product.comparePrice != null && product.comparePrice > product.price
  return (
    <div className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-slate-100">
        {product.image ? (
          <Image src={product.image} alt={product.name} fill className="object-cover" unoptimized />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="h-8 w-8 text-slate-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 0 0 1.5-1.5V6a1.5 1.5 0 0 0-1.5-1.5H3.75A1.5 1.5 0 0 0 2.25 6v12a1.5 1.5 0 0 0 1.5 1.5Zm10.5-11.25h.008v.008h-.008V8.25Zm.375 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z" />
            </svg>
          </div>
        )}
        {product.isFeatured && (
          <div className="absolute left-1 top-1 rounded-full bg-amber-400 px-1.5 py-0.5 text-[9px] font-bold text-white">★</div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{product.name}</p>
            {product.sku && <p className="text-[11px] font-mono text-slate-400">{product.sku}</p>}
            {product.description && (
              <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{product.description}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset', STATUS_STYLES[product.status])}>
              {product.status.replace(/_/g, ' ')}
            </span>
            <button
              onClick={() => onEdit(product)}
              title="Edit"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
                <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
                <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
              </svg>
            </button>
            <button
              onClick={() => onDelete(product)}
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
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-bold text-slate-900">{formatPrice(product.price)}</span>
            {hasDiscount && (
              <span className="text-xs text-slate-400 line-through">{formatPrice(product.comparePrice!)}</span>
            )}
          </div>
          <span className={cn('text-xs font-medium', product.stock > 10 ? 'text-slate-500' : product.stock > 0 ? 'text-amber-600' : 'text-red-500')}>
            {product.stock > 0 ? `${product.stock} in stock` : 'Out of stock'}
          </span>
          {!product.isAvailable && (
            <span className="text-[10px] font-medium text-slate-400">Unavailable</span>
          )}
        </div>
      </div>
    </div>
  )
}

/* ─── Section ─────────────────────────────────────────────── */

interface Props {
  vendorId: string
  initialProducts: Product[]
  total: number
}

export function VendorProductsSection({ vendorId, initialProducts, total }: Props) {
  const [products, setProducts] = useState(initialProducts)
  const [count, setCount] = useState(total)
  const [search, setSearch] = useState('')
  const [availability, setAvailability] = useState<'' | 'true' | 'false'>('')
  const [isLoading, startLoad] = useTransition()
  const [isDeleting, startDelete] = useTransition()
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [deletingProduct, setDeletingProduct] = useState<Product | null>(null)
  const [deleteError, setDeleteError] = useState('')

  function loadProducts(opts: { search?: string; availability?: '' | 'true' | 'false' }) {
    const s = opts.search ?? search
    const a = opts.availability ?? availability
    startLoad(async () => {
      const res = await getVendorProducts(vendorId, {
        page: 1, limit: 20,
        search: s || undefined,
        isAvailable: a === '' ? undefined : a === 'true',
      })
      setProducts(res.products)
      setCount(res.pagination.total)
    })
  }

  function onSearchChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setSearch(val)
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => loadProducts({ search: val }), 400)
  }

  function onAvailabilityChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value as '' | 'true' | 'false'
    setAvailability(val)
    loadProducts({ availability: val })
  }

  function openCreate() {
    setEditingProduct(null)
    setShowForm(true)
  }

  function openEdit(p: Product) {
    setEditingProduct(p)
    setShowForm(true)
  }

  function openDelete(p: Product) {
    setDeleteError('')
    setDeletingProduct(p)
  }

  function onProductSaved(saved: Product) {
    const isNew = !products.some(p => p.id === saved.id)
    setProducts(prev => {
      const idx = prev.findIndex(p => p.id === saved.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = saved
        return next
      }
      return [saved, ...prev]
    })
    if (isNew) setCount(c => c + 1)
  }

  function confirmDelete() {
    if (!deletingProduct) return
    setDeleteError('')
    startDelete(async () => {
      const result = await deleteProduct(vendorId, deletingProduct.id)
      if (result.error) {
        setDeleteError(result.error)
      } else {
        setProducts(prev => prev.filter(p => p.id !== deletingProduct.id))
        setCount(c => c - 1)
        setDeletingProduct(null)
      }
    })
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-slate-100 px-6 py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-900">Products</h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">{count}</span>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
                <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
              </svg>
              <input
                type="text"
                value={search}
                onChange={onSearchChange}
                placeholder="Search products…"
                className="h-9 rounded-xl border-0 bg-slate-50 pl-9 pr-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none w-48"
              />
              {isLoading && (
                <svg className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
            </div>
            <div className="relative">
              <select
                value={availability}
                onChange={onAvailabilityChange}
                className="h-9 appearance-none rounded-xl border-0 bg-slate-50 pl-3 pr-8 text-sm text-slate-700 ring-1 ring-inset ring-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
              >
                <option value="">All</option>
                <option value="true">Available</option>
                <option value="false">Unavailable</option>
              </select>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
                <path fillRule="evenodd" d="M5.22 8.22a.75.75 0 0 1 1.06 0L10 11.94l3.72-3.72a.75.75 0 1 1 1.06 1.06l-4.25 4.25a.75.75 0 0 1-1.06 0L5.22 9.28a.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
              </svg>
            </div>
            <Button size="sm" onClick={openCreate}>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
              </svg>
              Add Product
            </Button>
          </div>
        </div>
      </div>

      {/* List */}
      {products.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16">
          <p className="text-sm text-slate-400">{search ? 'No products match your search' : 'No products yet'}</p>
          {!search && <Button size="sm" variant="secondary" onClick={openCreate}>Add first product</Button>}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 p-6 xl:grid-cols-2">
          {products.map(p => <ProductCard key={p.id} product={p} onEdit={openEdit} onDelete={openDelete} />)}
        </div>
      )}

      {/* Create / Edit modal */}
      {showForm && (
        <ProductFormModal
          open={showForm}
          onClose={() => setShowForm(false)}
          onSaved={onProductSaved}
          vendorId={vendorId}
          editing={editingProduct}
        />
      )}

      {/* Delete confirm modal */}
      {deletingProduct && (
        <Modal
          open={!!deletingProduct}
          onClose={() => setDeletingProduct(null)}
          title="Delete product"
          description={`Delete "${deletingProduct.name}"? This action cannot be undone.`}
          size="sm"
          footer={
            <>
              <Button variant="secondary" size="sm" onClick={() => setDeletingProduct(null)} disabled={isDeleting}>Cancel</Button>
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
