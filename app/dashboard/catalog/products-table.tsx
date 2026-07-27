'use client'

import Image from 'next/image'
import { useState, useTransition, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/app/lib/utils'
import { formatNaira } from '@/app/lib/utils'
import { useToast } from '@/app/components/ui/toast'
import { Button } from '@/app/components/ui/button'
import { Modal } from '@/app/components/ui/modal'
import {
  getCatalogProducts,
  toggleCatalogFeatured,
  updateAdminProduct,
} from '@/app/actions/catalog'
import { updateDish } from '@/app/actions/menu'
import type { CatalogItem, CatalogPagination, Category } from '@/app/lib/types'

/* ─── Star icon ──────────────────────────────────────── */

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.5}
      className={cn(
        'h-5 w-5 transition-transform duration-150 group-hover:scale-110',
        filled ? 'text-white drop-shadow-sm' : 'text-slate-400 group-hover:text-amber-500'
      )}
    >
      <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
    </svg>
  )
}

/* ─── Product card ───────────────────────────────────── */

function ProductCard({
  item,
  isPending,
  onEdit,
  onToggleFeatured,
}: {
  item: CatalogItem
  isPending: boolean
  onEdit: (item: CatalogItem) => void
  onToggleFeatured: (e: React.MouseEvent, item: CatalogItem) => void
}) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-2xl border bg-white shadow-sm overflow-hidden transition-all',
        item.isFeatured
          ? 'border-amber-300 ring-2 ring-amber-300 bg-amber-50/30 shadow-amber-100'
          : 'border-slate-200 hover:border-slate-300 hover:shadow-md'
      )}
    >
      {/* Image */}
      <div className="relative h-48 w-full shrink-0 bg-slate-100">
        {item.image ? (
          <Image src={item.image} alt={item.name} fill className="object-cover" unoptimized />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-10 w-10 text-slate-200">
              <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 0 1 2.25-2.25h16.5A2.25 2.25 0 0 1 22.5 6v12a2.25 2.25 0 0 1-2.25 2.25H3.75A2.25 2.25 0 0 1 1.5 18V6ZM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0 0 21 18v-1.94l-2.69-2.689a1.5 1.5 0 0 0-2.12 0l-2.5 2.5-1.4-1.401a1.5 1.5 0 0 0-2.12 0L3 16.061Zm10.125-7.81a1.125 1.125 0 1 1 2.25 0 1.125 1.125 0 0 1-2.25 0Z" clipRule="evenodd" />
            </svg>
          </div>
        )}

        {/* Type badge overlay */}
        <div className="absolute left-3 top-3">
          {item.type === 'PRODUCT' ? (
            <span className="inline-flex items-center rounded-full bg-indigo-600/90 backdrop-blur-sm px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm">
              Retail
            </span>
          ) : (
            <span className="inline-flex items-center rounded-full bg-orange-500/90 backdrop-blur-sm px-2.5 py-0.5 text-xs font-semibold text-white shadow-sm">
              Menu item
            </span>
          )}
        </div>

        <div className="absolute right-3 top-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onEdit(item)}
            disabled={isPending}
            aria-label={`Edit ${item.name}`}
            title={item.type === 'PRODUCT' ? 'Edit product' : 'Edit menu item'}
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-white/90 text-slate-500 shadow-sm backdrop-blur-sm transition-all hover:bg-white hover:text-indigo-600 hover:shadow-md active:scale-90 disabled:opacity-50"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
              <path d="m5.433 13.917 1.262-3.155A4 4 0 0 1 7.58 9.42l6.92-6.918a2.121 2.121 0 0 1 3 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 0 1-.65-.65Z" />
              <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0 0 10 3H4.75A2.75 2.75 0 0 0 2 5.75v9.5A2.75 2.75 0 0 0 4.75 18h9.5A2.75 2.75 0 0 0 17 15.25V10a.75.75 0 0 0-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5Z" />
            </svg>
          </button>

          <button
            onClick={(e) => onToggleFeatured(e, item)}
            disabled={isPending}
            aria-label={item.isFeatured ? 'Remove from featured' : 'Mark as featured'}
            title={item.isFeatured ? 'Remove from featured' : 'Mark as featured'}
            className={cn(
              'group rounded-xl p-1.5 shadow-sm transition-all duration-150 active:scale-90 disabled:opacity-50 disabled:active:scale-100',
              item.isFeatured
                ? 'bg-amber-400 ring-2 ring-white/70 hover:bg-amber-500'
                : 'bg-white/90 backdrop-blur-sm hover:bg-white hover:shadow-md'
            )}
          >
            <StarIcon filled={item.isFeatured} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className={cn('flex flex-col gap-2 p-4 flex-1', item.isFeatured && 'bg-amber-50/20')}>
        {/* Name */}
        <h3 className="font-semibold text-slate-900 leading-snug line-clamp-2">{item.name}</h3>

        {/* Vendor / store */}
        <div>
          <p className="text-xs font-medium text-slate-600 truncate">{item.vendorName}</p>
          <div className="mt-0.5 flex items-center gap-1.5">
            <p className="text-xs text-slate-400 truncate">{item.storefront.name}</p>
            <span className={cn(
              'shrink-0 inline-flex items-center rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
              item.storefront.kind === 'RESTAURANT'
                ? 'bg-orange-50 text-orange-600'
                : 'bg-slate-100 text-slate-500'
            )}>
              {item.storefront.kind === 'RESTAURANT' ? 'Restaurant' : 'Store'}
            </span>
          </div>
        </div>

        {/* Category */}
        {item.category && (
          <p className="text-xs text-slate-400">{item.category}</p>
        )}

        {/* Footer */}
        <div className="mt-auto flex items-center justify-between pt-2.5 border-t border-slate-100">
          <span className={cn('text-base font-bold', item.isFeatured ? 'text-amber-700' : 'text-slate-900')}>
            {formatNaira(item.price)}
          </span>
          {item.isAvailable ? (
            <span className="text-xs font-medium text-emerald-600">Available</span>
          ) : (
            <span className="text-xs text-slate-400">Unavailable</span>
          )}
        </div>

        <p className="text-[11px] text-slate-400">
          {new Date(item.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
        </p>
      </div>
    </div>
  )
}

/* ─── Edit catalog item modal ────────────────────────── */

const INPUT_CLASS =
  'h-10 w-full rounded-xl border-0 bg-slate-50 px-3.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 outline-none transition-shadow placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500'

function EditCatalogItemModal({
  item,
  categories,
  onClose,
  onSaved,
}: {
  item: CatalogItem
  categories: Category[]
  onClose: () => void
  onSaved: (patch: Partial<CatalogItem>) => void
}) {
  const toast = useToast()
  const matchedCategory = categories.find(
    (category) => category.name.toLowerCase() === item.category?.toLowerCase()
  )
  const [name, setName] = useState(item.name)
  const [categoryId, setCategoryId] = useState(item.categoryId ?? matchedCategory?.id ?? '')
  const [price, setPrice] = useState(String(item.price))
  const [stock, setStock] = useState(item.stock == null ? '' : String(item.stock))
  const [error, setError] = useState('')
  const [isSaving, startSaving] = useTransition()

  function save() {
    const parsedPrice = Number(price)
    const parsedStock = Number(stock)

    if (!name.trim()) {
      setError('Product name is required.')
      return
    }
    if (!categoryId) {
      setError('Select a category.')
      return
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setError('Enter a valid price.')
      return
    }
    if (item.type === 'PRODUCT' && (!Number.isInteger(parsedStock) || parsedStock < 0)) {
      setError('Stock must be a whole number of zero or more.')
      return
    }

    setError('')
    startSaving(async () => {
      let serverPatch: Partial<CatalogItem> = {}
      let requestError: string | undefined

      if (item.type === 'PRODUCT') {
        const result = await updateAdminProduct(item.id, {
          name: name.trim(),
          categoryId,
          price: parsedPrice,
          stock: parsedStock,
        })
        serverPatch = result.data ?? {}
        requestError = result.error
      } else {
        const result = await updateDish(item.id, {
          name: name.trim(),
          categoryId,
          price: parsedPrice,
        })
        requestError = result.error
      }

      if (requestError) {
        setError(requestError)
        toast.error(requestError)
        return
      }

      const category = categories.find((option) => option.id === categoryId)
      onSaved({
        ...serverPatch,
        name: name.trim(),
        categoryId,
        category: category?.name ?? item.category,
        price: parsedPrice,
        ...(item.type === 'PRODUCT' ? { stock: parsedStock } : {}),
      })
      toast.success(item.type === 'PRODUCT' ? 'Product updated.' : 'Menu item updated.')
      onClose()
    })
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={item.type === 'PRODUCT' ? 'Edit product' : 'Edit menu item'}
      description={`Update ${item.name}'s catalog information.`}
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSaving}>
            Cancel
          </Button>
          <Button size="sm" loading={isSaving} onClick={save}>
            Save changes
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {error && (
          <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm text-red-600 ring-1 ring-inset ring-red-200">
            {error}
          </p>
        )}

        <div>
          <label htmlFor="product-name" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Product name
          </label>
          <input
            id="product-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            className={INPUT_CLASS}
            autoFocus
          />
        </div>

        <div>
          <label htmlFor="product-category" className="mb-1.5 block text-xs font-semibold text-slate-700">
            Category
          </label>
          <select
            id="product-category"
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className={cn(INPUT_CLASS, 'cursor-pointer')}
          >
            <option value="">Select a category</option>
            {[...categories]
              .sort((first, second) => first.name.localeCompare(second.name))
              .map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
          </select>
        </div>

        <div className={cn('grid grid-cols-1 gap-4', item.type === 'PRODUCT' && 'sm:grid-cols-2')}>
          <div>
            <label htmlFor="product-price" className="mb-1.5 block text-xs font-semibold text-slate-700">
              Price (₦)
            </label>
            <input
              id="product-price"
              type="number"
              min="0"
              step="0.01"
              value={price}
              onChange={(event) => setPrice(event.target.value)}
              className={INPUT_CLASS}
            />
          </div>
          {item.type === 'PRODUCT' && (
            <div>
              <label htmlFor="product-stock" className="mb-1.5 block text-xs font-semibold text-slate-700">
                Stock
              </label>
              <input
                id="product-stock"
                type="number"
                min="0"
                step="1"
                value={stock}
                onChange={(event) => setStock(event.target.value)}
                placeholder="Enter quantity"
                className={INPUT_CLASS}
              />
            </div>
          )}
        </div>
      </div>
    </Modal>
  )
}

/* ─── Main component ─────────────────────────────────── */

type TypeFilter = 'PRODUCT' | 'MENU_ITEM' | ''

const TYPE_TABS: { label: string; value: TypeFilter }[] = [
  { label: 'All', value: '' },
  { label: 'Retail', value: 'PRODUCT' },
  { label: 'Menu items', value: 'MENU_ITEM' },
]

interface InitialParams {
  search?: string
  type?: string
  isFeatured?: string
  page?: string
}

export function CatalogProductsTable({
  initialItems,
  initialPagination,
  initialParams,
  categories,
}: {
  initialItems: CatalogItem[]
  initialPagination: CatalogPagination
  initialParams: InitialParams
  categories: Category[]
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()

  const [items, setItems] = useState(initialItems)
  const [pagination, setPagination] = useState(initialPagination)
  const [search, setSearch] = useState(initialParams.search ?? '')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>((initialParams.type as TypeFilter) ?? '')
  const [featuredOnly, setFeaturedOnly] = useState(initialParams.isFeatured === 'true')
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null)
  const [isPending, startTransition] = useTransition()
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  /* ── URL sync ── */

  function pushURL(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v)
      else params.delete(k)
    }
    router.replace(`/dashboard/catalog?${params}`, { scroll: false })
  }

  /* ── Data fetch ── */

  function refetch(opts: {
    search?: string
    type?: TypeFilter
    isFeatured?: boolean
    page?: number
  }) {
    const s = opts.search ?? search
    const t = opts.type !== undefined ? opts.type : typeFilter
    const f = opts.isFeatured !== undefined ? opts.isFeatured : featuredOnly
    const pg = opts.page ?? 1
    startTransition(async () => {
      const res = await getCatalogProducts({
        search: s || undefined,
        type: t || undefined,
        isFeatured: f ? 'true' : undefined,
        page: pg,
        limit: 50,
      })
      setItems(res.items)
      setPagination(res.pagination)
    })
  }

  /* ── Handlers ── */

  function onSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setSearch(val)
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => {
      pushURL({ search: val || undefined, page: undefined })
      refetch({ search: val })
    }, 400)
  }

  function onTypeFilter(val: TypeFilter) {
    setTypeFilter(val)
    pushURL({ type: val || undefined, page: undefined })
    refetch({ type: val })
  }

  function onFeaturedToggle() {
    const next = !featuredOnly
    setFeaturedOnly(next)
    pushURL({ isFeatured: next ? 'true' : undefined, page: undefined })
    refetch({ isFeatured: next })
  }

  function onPage(pg: number) {
    pushURL({ page: String(pg) })
    refetch({ page: pg })
  }

  /* ── Featured toggle per card ── */

  function patchItem(id: string, patch: Partial<CatalogItem>) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  function handleToggleFeatured(e: React.MouseEvent, item: CatalogItem) {
    e.stopPropagation()
    patchItem(item.id, { isFeatured: !item.isFeatured })
    startTransition(async () => {
      const res = await toggleCatalogFeatured(item.id)
      if (res.error) {
        patchItem(item.id, { isFeatured: item.isFeatured })
        toast.error(res.error)
      } else {
        patchItem(item.id, { isFeatured: res.data!.isFeatured })
        toast.success(res.data!.isFeatured ? 'Marked as featured.' : 'Removed from featured.')
      }
    })
  }

  return (
    <main className="px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Products</h1>
        <p className="mt-0.5 text-sm text-slate-500">{pagination.total.toLocaleString()} items in the catalog.</p>
      </div>

      {/* Filters */}
      <div className="mb-6 flex items-center gap-2.5 flex-wrap">
        {/* Search */}
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={onSearch}
            placeholder="Search by name or vendor…"
            className="h-9 rounded-xl border-0 bg-white pl-9 pr-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none w-60"
          />
          {isPending && (
            <svg className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
        </div>

        {/* Type tabs */}
        <div className="flex gap-1.5">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => onTypeFilter(tab.value)}
              disabled={isPending}
              className={cn(
                'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-60',
                typeFilter === tab.value
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50'
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Featured only */}
        <button
          onClick={onFeaturedToggle}
          disabled={isPending}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors disabled:opacity-60',
            featuredOnly
              ? 'bg-amber-400 text-white shadow-sm'
              : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50'
          )}
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
            <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
          </svg>
          Featured only
        </button>
      </div>

      {/* Grid */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-20">
          <p className="text-sm font-medium text-slate-700">No products found</p>
          <p className="mt-0.5 text-xs text-slate-400">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className={cn(
          'grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
          isPending && 'opacity-60 pointer-events-none transition-opacity'
        )}>
          {items.map((item) => (
            <ProductCard
              key={item.id}
              item={item}
              isPending={isPending}
              onEdit={setEditingItem}
              onToggleFeatured={handleToggleFeatured}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Page {pagination.page} of {pagination.totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => onPage(pagination.page - 1)}
              disabled={pagination.page <= 1 || isPending}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                pagination.page <= 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-100'
              )}
            >
              Previous
            </button>
            <button
              onClick={() => onPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || isPending}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                pagination.page >= pagination.totalPages ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-100'
              )}
            >
              Next
            </button>
          </div>
        </div>
      )}

      {editingItem && (
        <EditCatalogItemModal
          item={editingItem}
          categories={categories}
          onClose={() => setEditingItem(null)}
          onSaved={(patch) => patchItem(editingItem.id, patch)}
        />
      )}
    </main>
  )
}
