'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { cn } from '@/app/lib/utils'
import { formatNaira } from '@/app/lib/utils'
import { getOrders } from '@/app/actions/orders'
import type { OrderSummary, OrderStatus, PaymentStatus } from '@/app/lib/types'

const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  PENDING:         'bg-amber-50 text-amber-700 ring-amber-600/20',
  PAYMENT_PENDING: 'bg-orange-50 text-orange-700 ring-orange-600/20',
  CONFIRMED:       'bg-sky-50 text-sky-700 ring-sky-600/20',
  PREPARING:       'bg-violet-50 text-violet-700 ring-violet-600/20',
  READY:           'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  DISPATCHED:      'bg-blue-50 text-blue-700 ring-blue-600/20',
  DELIVERED:       'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  CANCELLED:       'bg-red-50 text-red-700 ring-red-600/20',
  REJECTED:        'bg-red-50 text-red-700 ring-red-600/20',
  REFUNDED:        'bg-slate-100 text-slate-600 ring-slate-500/20',
  ACCEPTED:        'bg-sky-50 text-sky-700 ring-sky-600/20',
  PICKED_UP:       'bg-blue-50 text-blue-700 ring-blue-600/20',
  IN_TRANSIT:      'bg-blue-50 text-blue-700 ring-blue-600/20',
  DELIVERING:      'bg-blue-50 text-blue-700 ring-blue-600/20',
  COMPLETED:       'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
}

const ORDER_STATUS_DOT: Record<OrderStatus, string> = {
  PENDING:         'bg-amber-400',
  PAYMENT_PENDING: 'bg-orange-400',
  CONFIRMED:       'bg-sky-500',
  PREPARING:       'bg-violet-500',
  READY:           'bg-indigo-500',
  DISPATCHED:      'bg-blue-500',
  DELIVERED:       'bg-emerald-500',
  CANCELLED:       'bg-red-500',
  REJECTED:        'bg-red-500',
  REFUNDED:        'bg-slate-400',
  ACCEPTED:        'bg-sky-500',
  PICKED_UP:       'bg-blue-400',
  IN_TRANSIT:      'bg-blue-400',
  DELIVERING:      'bg-blue-400',
  COMPLETED:       'bg-emerald-500',
}

const PAYMENT_STATUS_STYLES: Record<PaymentStatus, string> = {
  PENDING:            'bg-amber-50 text-amber-600',
  PROCESSING:         'bg-sky-50 text-sky-600',
  COMPLETED:          'bg-emerald-50 text-emerald-700',
  FAILED:             'bg-red-50 text-red-600',
  REFUNDED:           'bg-slate-100 text-slate-500',
  PARTIALLY_REFUNDED: 'bg-orange-50 text-orange-600',
}

const STATUS_FILTERS: { label: string; value: OrderStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Confirmed', value: 'CONFIRMED' },
  { label: 'Preparing', value: 'PREPARING' },
  { label: 'Ready', value: 'READY' },
  { label: 'Dispatched', value: 'DISPATCHED' },
  { label: 'Delivered', value: 'DELIVERED' },
  { label: 'Cancelled', value: 'CANCELLED' },
  { label: 'Rejected', value: 'REJECTED' },
]

function formatOrderStatus(s: OrderStatus): string {
  return s.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())
}

export function OrdersTable({
  initialOrders,
  total,
}: {
  initialOrders: OrderSummary[]
  total: number
}) {
  const router = useRouter()
  const [orders, setOrders] = useState(initialOrders)
  const [count, setCount] = useState(total)
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState<OrderStatus | ''>('')
  const [isPending, startTransition] = useTransition()
  const searchRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function refetch(opts: { search?: string; status?: OrderStatus | '' }) {
    const s = opts.search ?? search
    const st = opts.status !== undefined ? opts.status : status
    startTransition(async () => {
      const res = await getOrders({ search: s || undefined, status: st || undefined, page: 1, limit: 20 })
      setOrders(res.orders)
      setCount(res.pagination.total)
    })
  }

  function onSearch(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value
    setSearch(val)
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => refetch({ search: val }), 400)
  }

  function onStatusFilter(value: OrderStatus | '') {
    setStatus(value)
    refetch({ status: value })
  }

  return (
    <main className="px-8 py-8">
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Orders</h1>
          <p className="mt-0.5 text-sm text-slate-500">{count} orders on the platform.</p>
        </div>
        <div className="relative">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400">
            <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 1 0 0 11 5.5 5.5 0 0 0 0-11ZM2 9a7 7 0 1 1 12.452 4.391l3.328 3.329a.75.75 0 1 1-1.06 1.06l-3.329-3.328A7 7 0 0 1 2 9Z" clipRule="evenodd" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={onSearch}
            placeholder="Search order number or customer…"
            className="h-9 rounded-xl border-0 bg-white pl-9 pr-3 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none w-64"
          />
          {isPending && (
            <svg className="absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 animate-spin text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          )}
        </div>
      </div>

      <div className="mb-5 flex gap-2 flex-wrap">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => onStatusFilter(f.value)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors',
              status === f.value
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16">
            <p className="text-sm font-medium text-slate-700">No orders found</p>
            <p className="mt-0.5 text-xs text-slate-400">Try adjusting your search or filter.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/60">
                <tr>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400 min-w-48">Order</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Status</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Customer</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Vendor</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Items</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Total</th>
                  <th className="px-5 py-3.5 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Payment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {orders.map((order) => (
                  <tr
                    key={order.id}
                    onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                    className="cursor-pointer hover:bg-slate-50/80 transition-colors"
                  >
                    <td className="px-5 py-3.5">
                      <p className="font-mono text-xs font-medium text-slate-900">{order.orderNumber}</p>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {new Date(order.createdAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn('inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset', ORDER_STATUS_STYLES[order.status])}>
                        <span className={cn('h-1.5 w-1.5 rounded-full', ORDER_STATUS_DOT[order.status])} />
                        {formatOrderStatus(order.status)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-900">{order.customer.firstName} {order.customer.lastName}</p>
                      <p className="text-xs text-slate-400">{order.customer.email}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2.5">
                        {order.vendor.image ? (
                          <div className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
                            <Image src={order.vendor.image} alt={order.vendor.name} fill className="object-cover" unoptimized />
                          </div>
                        ) : (
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-xs font-bold text-slate-500">
                            {order.vendor.name[0]?.toUpperCase() ?? '?'}
                          </div>
                        )}
                        <p className="text-slate-700 truncate">{order.vendor.name}</p>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-500">
                      {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                    </td>
                    <td className="px-5 py-3.5 font-medium text-slate-900">
                      {formatNaira(order.pricing.total)}
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={cn('inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium', PAYMENT_STATUS_STYLES[order.payment.status])}>
                        {order.payment.status.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
