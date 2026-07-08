'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useState, useTransition, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { cn, formatNaira } from '@/app/lib/utils'
import { getProperties } from '@/app/actions/properties'
import { Button } from '@/app/components/ui/button'
import type { PropertySummary, PropertyStatus, Pagination } from '@/app/lib/types'

const STATUS_STYLES: Record<PropertyStatus, string> = {
  DRAFT: 'bg-slate-100 text-slate-600 ring-slate-500/20',
  PUBLISHED: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  SUSPENDED: 'bg-red-50 text-red-700 ring-red-600/20',
}

const STATUS_DOT: Record<PropertyStatus, string> = {
  DRAFT: 'bg-slate-400',
  PUBLISHED: 'bg-emerald-500',
  SUSPENDED: 'bg-red-500',
}

function PropertyCard({ property }: { property: PropertySummary }) {
  const cheapestRoom = property.roomTypes.length > 0
    ? Math.min(...property.roomTypes.map((r) => r.pricePerNight))
    : null

  return (
    <Link
      href={`/dashboard/properties/${property.id}`}
      className="flex flex-col rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden transition-all hover:border-slate-300 hover:shadow-md"
    >
      <div className="relative h-44 w-full shrink-0 bg-slate-100">
        {property.image ? (
          <Image src={property.image} alt={property.name} fill className="object-cover" unoptimized />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1} stroke="currentColor" className="h-10 w-10 text-slate-300">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
            </svg>
          </div>
        )}
        <div className="absolute left-3 top-3">
          <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset backdrop-blur-sm', STATUS_STYLES[property.status])}>
            <span className={cn('h-1.5 w-1.5 rounded-full', STATUS_DOT[property.status])} />
            {property.status}
          </span>
        </div>
      </div>

      <div className="flex flex-col gap-1.5 p-4 flex-1">
        <h3 className="font-semibold text-slate-900 leading-snug line-clamp-1">{property.name}</h3>
        <p className="text-xs text-slate-500">{property.propertyType} · {property.city.name}</p>

        <div className="mt-auto flex items-center justify-between pt-2.5 border-t border-slate-100">
          <span className="text-sm font-bold text-slate-900">
            {cheapestRoom != null ? `From ${formatNaira(cheapestRoom)}/night` : 'No rooms yet'}
          </span>
          <span className="text-xs text-slate-400">{property.roomTypes.length} room type{property.roomTypes.length !== 1 ? 's' : ''}</span>
        </div>
      </div>
    </Link>
  )
}

interface InitialParams {
  search?: string
  page?: string
}

export function PropertiesGrid({
  initialProperties,
  initialPagination,
  initialParams,
}: {
  initialProperties: PropertySummary[]
  initialPagination: Pagination
  initialParams: InitialParams
}) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [properties, setProperties] = useState(initialProperties)
  const [pagination, setPagination] = useState(initialPagination)
  const [search, setSearch] = useState(initialParams.search ?? '')
  const [isPending, startTransition] = useTransition()
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function pushURL(updates: Record<string, string | undefined>) {
    const params = new URLSearchParams(searchParams.toString())
    for (const [k, v] of Object.entries(updates)) {
      if (v) params.set(k, v)
      else params.delete(k)
    }
    router.replace(`/dashboard/properties?${params}`, { scroll: false })
  }

  function refetch(opts: { search?: string; page?: number }) {
    const s = opts.search ?? search
    const pg = opts.page ?? 1
    startTransition(async () => {
      const res = await getProperties({ search: s || undefined, page: pg, limit: 20 })
      setProperties(res.properties)
      setPagination(res.pagination)
    })
  }

  function onSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setSearch(val)
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => {
      pushURL({ search: val || undefined, page: undefined })
      refetch({ search: val })
    }, 400)
  }

  function onPage(pg: number) {
    pushURL({ page: String(pg) })
    refetch({ page: pg })
  }

  return (
    <main className="px-8 py-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Properties</h1>
          <p className="mt-0.5 text-sm text-slate-500">{pagination.total.toLocaleString()} properties listed.</p>
        </div>
        <Link href="/dashboard/properties/create">
          <Button size="sm">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M10.75 4.75a.75.75 0 0 0-1.5 0v4.5h-4.5a.75.75 0 0 0 0 1.5h4.5v4.5a.75.75 0 0 0 1.5 0v-4.5h4.5a.75.75 0 0 0 0-1.5h-4.5v-4.5Z" />
            </svg>
            New Property
          </Button>
        </Link>
      </div>

      <div className="mb-6 relative w-72">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
          <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={onSearch}
          placeholder="Search properties…"
          className="h-9 w-full rounded-xl border-0 bg-white pl-9 pr-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none"
        />
        {isPending && (
          <svg className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        )}
      </div>

      {properties.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-20">
          <p className="text-sm font-medium text-slate-700">No properties found</p>
          <p className="mt-0.5 text-xs text-slate-400">Try adjusting your search, or create a new property.</p>
        </div>
      ) : (
        <div className={cn(
          'grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4',
          isPending && 'opacity-60 pointer-events-none transition-opacity'
        )}>
          {properties.map((property) => (
            <PropertyCard key={property.id} property={property} />
          ))}
        </div>
      )}

      {pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-slate-500">Page {pagination.page} of {pagination.totalPages}</p>
          <div className="flex gap-2">
            <button
              onClick={() => onPage(pagination.page - 1)}
              disabled={pagination.page <= 1 || isPending}
              className={cn('rounded-lg px-3 py-1.5 text-sm font-medium transition-colors', pagination.page <= 1 ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-100')}
            >
              Previous
            </button>
            <button
              onClick={() => onPage(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || isPending}
              className={cn('rounded-lg px-3 py-1.5 text-sm font-medium transition-colors', pagination.page >= pagination.totalPages ? 'text-slate-300 cursor-not-allowed' : 'text-slate-700 hover:bg-slate-100')}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </main>
  )
}
