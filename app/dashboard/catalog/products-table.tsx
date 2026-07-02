'use client'

import Image from 'next/image'
import { useState, useEffect, useTransition, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/app/lib/utils'
import { formatNaira } from '@/app/lib/utils'
import { getCatalogProducts, toggleCatalogFeatured } from '@/app/actions/catalog'
import type { CatalogItem, CatalogPagination } from '@/app/lib/types'

/* ─── Toast ──────────────────────────────────────────── */

function Toast({ msg, ok, onDismiss }: { msg: string; ok: boolean; onDismiss: () => void }) {
  return (
    <div
      onClick={onDismiss}
      className={cn(
        'fixed bottom-6 right-6 z-50 flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium shadow-lg cursor-pointer',
        ok ? 'bg-emerald-600 text-white' : 'bg-red-600 text-white'
      )}
    >
      {ok ? (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0">
          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
        </svg>
      ) : (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4 shrink-0">
          <path fillRule="evenodd" d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z" clipRule="evenodd" />
        </svg>
      )}
      {msg}
    </div>
  )
}

/* ─── Star icon ──────────────────────────────────────── */

function StarIcon({ filled }: { filled: boolean }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 20 20"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={filled ? 0 : 1.5}
      className={cn('h-5 w-5', filled ? 'text-amber-400' : 'text-slate-300')}
    >
      <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401Z" clipRule="evenodd" />
    </svg>
  )
}

/* ─── Product card ───────────────────────────────────── */

function ProductCard({
  item,
  isPending,
  onToggleFeatured,
}: {
  item: CatalogItem
  isPending: boolean
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

        {/* Featured star button */}
        <button
          onClick={(e) => onToggleFeatured(e, item)}
          disabled={isPending}
          aria-label={item.isFeatured ? 'Remove from featured' : 'Mark as featured'}
          className={cn(
            'absolute right-3 top-3 rounded-xl p-1.5 transition-colors disabled:opacity-50 shadow-sm',
            item.isFeatured
              ? 'bg-amber-400 text-white hover:bg-amber-500'
              : 'bg-white/90 backdrop-blur-sm hover:bg-white'
          )}
        >
          <StarIcon filled={item.isFeatured} />
        </button>
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
}: {
  initialItems: CatalogItem[]
  initialPagination: CatalogPagination
  initialParams: InitialParams
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [items, setItems] = useState(initialItems)
  const [pagination, setPagination] = useState(initialPagination)
  const [search, setSearch] = useState(initialParams.search ?? '')
  const [typeFilter, setTypeFilter] = useState<TypeFilter>((initialParams.type as TypeFilter) ?? '')
  const [featuredOnly, setFeaturedOnly] = useState(initialParams.isFeatured === 'true')
  const [isPending, startTransition] = useTransition()
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null)
  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(t)
  }, [toast])

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
        limit: 20,
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
        setToast({ msg: res.error, ok: false })
      } else {
        patchItem(item.id, { isFeatured: res.data!.isFeatured })
        setToast({
          msg: res.data!.isFeatured ? 'Marked as featured' : 'Removed from featured',
          ok: true,
        })
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

      {/* Toast */}
      {toast && <Toast msg={toast.msg} ok={toast.ok} onDismiss={() => setToast(null)} />}
    </main>
  )
}
