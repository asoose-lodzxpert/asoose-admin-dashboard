import type { Metadata } from 'next'
import Link from 'next/link'
import { getCurrentUser } from '@/app/lib/auth'
import { getDashboardStats, getRecentOrders } from '@/app/actions/admin'
import { formatNaira, formatNumber, cn } from '@/app/lib/utils'
import { DashboardCharts } from './dashboard-charts'

export const metadata: Metadata = { title: 'Overview' }

/* ─── Stat Card ──────────────────────────────────────────── */

function StatCard({
  label,
  value,
  sub,
  icon,
  iconBg,
}: {
  label: string
  value: string
  sub: string
  icon: React.ReactNode
  iconBg: string
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <p className="mt-2 text-[28px] font-bold tracking-tight text-slate-900">{value}</p>
        </div>
        <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl', iconBg)}>
          {icon}
        </div>
      </div>
      <p className="mt-4 text-xs text-slate-400">{sub}</p>
    </div>
  )
}

/* ─── Order status mapping ───────────────────────────────── */

type DisplayStatus = 'Pending' | 'Processing' | 'En Route' | 'Completed' | 'Cancelled'

function toDisplayStatus(status: string): DisplayStatus {
  switch (status) {
    case 'PENDING':
    case 'PAYMENT_PENDING':
      return 'Pending'
    case 'CONFIRMED':
    case 'PREPARING':
    case 'READY':
      return 'Processing'
    case 'PICKED_UP':
    case 'IN_TRANSIT':
      return 'En Route'
    case 'DELIVERED':
    case 'COMPLETED':
      return 'Completed'
    default:
      return 'Cancelled'
  }
}

const STATUS_STYLES: Record<DisplayStatus, string> = {
  Pending:    'bg-amber-50   text-amber-700   ring-amber-600/20',
  Processing: 'bg-indigo-50  text-indigo-700  ring-indigo-600/20',
  'En Route': 'bg-sky-50     text-sky-700     ring-sky-600/20',
  Completed:  'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  Cancelled:  'bg-red-50     text-red-600     ring-red-600/20',
}

/* ─── Page ───────────────────────────────────────────────── */

export default async function DashboardPage() {
  const [user, stats, recentOrders] = await Promise.all([
    getCurrentUser(),
    getDashboardStats(),
    getRecentOrders(8),
  ])

  const firstName = user?.firstName ?? 'Admin'

  return (
    <main className="flex-1 px-8 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Overview</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Welcome back, {firstName}. Here&apos;s what&apos;s happening today.
          </p>
        </div>
        <span className="hidden rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-500 shadow-sm sm:inline">
          {new Date().toLocaleDateString('en-NG', { weekday: 'long', month: 'long', day: 'numeric' })}
        </span>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={formatNaira(stats.finance.totalRevenue)}
          sub={`Today: ${formatNaira(stats.finance.todayRevenue)}`}
          iconBg="bg-emerald-50"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-emerald-600">
              <path fillRule="evenodd" d="M1 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V4Zm12 4a3 3 0 1 1-6 0 3 3 0 0 1 6 0ZM4 9a1 1 0 1 0 0-2 1 1 0 0 0 0 2Zm13-1a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM1.5 14.5A.5.5 0 0 1 2 14h16a.5.5 0 0 1 0 1H2a.5.5 0 0 1-.5-.5ZM2.5 17.5A.5.5 0 0 1 3 17h14a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5Z" clipRule="evenodd" />
            </svg>
          }
        />
        <StatCard
          label="Total Orders"
          value={formatNumber(stats.orders.total)}
          sub={`Today: ${formatNumber(stats.orders.today)} · Pending: ${formatNumber(stats.orders.pending)}`}
          iconBg="bg-indigo-50"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-indigo-600">
              <path d="M2.879 7.121A3 3 0 0 0 7.5 6.66a2.997 2.997 0 0 0 2.5 1.34 2.997 2.997 0 0 0 2.5-1.34 3 3 0 1 0 4.622-3.78l-.293-.293a1 1 0 0 0-1.415 0l-.293.293a3.001 3.001 0 0 0-4.243 0l-.293.293a1 1 0 0 1-1.414 0l-.293-.293A3.001 3.001 0 0 0 5.121 3.88l-.293-.293a1 1 0 0 0-1.415 0l-.293.293A3 3 0 0 0 2.879 7.12ZM2 12.25v2.25A.75.75 0 0 0 2.75 15h14.5A.75.75 0 0 0 18 14.5v-2.25a.75.75 0 0 0-.75-.75H2.75a.75.75 0 0 0-.75.75ZM2.75 16.5A.75.75 0 0 0 2 17.25v.5c0 .414.336.75.75.75h14.5A.75.75 0 0 0 18 17.75v-.5a.75.75 0 0 0-.75-.75H2.75Z" />
            </svg>
          }
        />
        <StatCard
          label="Registered Users"
          value={formatNumber(stats.users.total)}
          sub={`New today: ${formatNumber(stats.users.newToday)} · Customers: ${formatNumber(stats.users.customers)}`}
          iconBg="bg-violet-50"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-violet-600">
              <path d="M7 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM14.5 9a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5ZM1.615 16.428a1.224 1.224 0 0 1-.569-1.175 6.002 6.002 0 0 1 11.908 0c.058.467-.172.92-.57 1.174A9.953 9.953 0 0 1 7 18a9.953 9.953 0 0 1-5.385-1.572ZM14.5 16h-.106c.07-.297.088-.611.048-.933a7.47 7.47 0 0 0-1.588-3.755 4.502 4.502 0 0 1 5.874 2.636.818.818 0 0 1-.36.72A7.468 7.468 0 0 1 14.5 16Z" />
            </svg>
          }
        />
        <StatCard
          label="Active Vendors"
          value={formatNumber(stats.vendors.total)}
          sub={`Pending approval: ${formatNumber(stats.vendors.pendingApproval)}`}
          iconBg="bg-amber-50"
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5 text-amber-600">
              <path d="M2.879 7.121A3 3 0 0 0 7.5 6.66a2.997 2.997 0 0 0 2.5 1.34 2.997 2.997 0 0 0 2.5-1.34 3 3 0 1 0 4.622-3.78l-.293-.293a1 1 0 0 0-1.415 0l-.293.293a3.001 3.001 0 0 0-4.243 0l-.293.293a1 1 0 0 1-1.414 0l-.293-.293A3.001 3.001 0 0 0 5.121 3.88l-.293-.293a1 1 0 0 0-1.415 0l-.293.293A3 3 0 0 0 2.879 7.12ZM2.75 13.5a.75.75 0 0 0-.75.75v1.5c0 .414.336.75.75.75h14.5a.75.75 0 0 0 .75-.75v-1.5a.75.75 0 0 0-.75-.75H2.75ZM1.5 18.25A.75.75 0 0 1 2.25 17.5h15.5a.75.75 0 0 1 0 1.5H2.25a.75.75 0 0 1-.75-.75Z" />
            </svg>
          }
        />
      </div>

      {/* Charts */}
      <DashboardCharts
        dailyOrders={stats.charts.dailyOrders}
        dailyRides={stats.charts.dailyRides}
        dailyRevenue={stats.charts.dailyRevenue}
        dailySignups={stats.charts.dailySignups}
      />

      {/* Content grid */}
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent Orders */}
        <div className="lg:col-span-2 rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Recent Orders</h2>
            <Link
              href="/dashboard/orders"
              className="text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
            >
              View all →
            </Link>
          </div>
          {recentOrders.length === 0 ? (
            <div className="flex items-center justify-center py-12">
              <p className="text-sm text-slate-400">No orders yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100">
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Order</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Customer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Vendor</th>
                    <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wide text-slate-400">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-400">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {recentOrders.map(order => {
                    const display = toDisplayStatus(order.status)
                    const customerName = order.customer
                      ? `${order.customer.firstName} ${order.customer.lastName}`
                      : 'Unknown'
                    return (
                      <tr key={order.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-6 py-3.5 font-mono text-xs text-slate-400">{order.orderNumber}</td>
                        <td className="px-6 py-3.5 font-medium text-slate-900">{customerName}</td>
                        <td className="px-6 py-3.5 text-slate-500 max-w-[140px] truncate">{order.restaurantName ?? '—'}</td>
                        <td className="px-6 py-3.5 text-right font-medium text-slate-900">{formatNaira(order.total)}</td>
                        <td className="px-6 py-3.5">
                          <span className={cn('inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset', STATUS_STYLES[display])}>
                            {display}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Activity Overview */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <h2 className="text-sm font-semibold text-slate-900">Platform Activity</h2>
          </div>
          <div className="divide-y divide-slate-50 px-6">
            {[
              { label: 'Active Deliveries',   value: stats.deliveries.active,         sub: `${formatNumber(stats.deliveries.completedToday)} completed today` },
              { label: 'Active Rides',         value: stats.rides.active,              sub: `${formatNumber(stats.rides.today)} rides today` },
              { label: 'Online Riders',        value: stats.riders.online,             sub: `${formatNumber(stats.riders.total)} total · ${formatNumber(stats.riders.pendingApproval)} pending` },
              { label: 'Online Drivers',       value: stats.drivers.online,            sub: `${formatNumber(stats.drivers.total)} total · ${formatNumber(stats.drivers.pendingApproval)} pending` },
              { label: 'Pending Vendor Apps',  value: stats.vendors.pendingApproval,   sub: `${formatNumber(stats.vendors.total)} vendors total` },
              { label: 'Open Disputes',        value: stats.finance.openDisputes,      sub: 'Requires attention' },
              { label: 'Pending Payouts',      value: stats.finance.pendingPayouts,    sub: 'Awaiting processing' },
            ].map(({ label, value, sub }) => (
              <div key={label} className="flex items-center justify-between py-3.5">
                <div>
                  <p className="text-sm font-medium text-slate-700">{label}</p>
                  <p className="text-xs text-slate-400">{sub}</p>
                </div>
                <span className={cn(
                  'text-lg font-bold tabular-nums',
                  value > 0 ? 'text-slate-900' : 'text-slate-300'
                )}>
                  {formatNumber(value)}
                </span>
              </div>
            ))}
          </div>
          <div className="border-t border-slate-100 px-6 py-4">
            <p className="text-xs text-slate-400">Live data · refreshes on page load</p>
          </div>
        </div>
      </div>
    </main>
  )
}
