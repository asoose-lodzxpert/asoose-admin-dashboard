'use client'

import { useState, useTransition } from 'react'
import { cn, formatNaira, formatNumber } from '@/app/lib/utils'
import { fetchReport } from '@/app/actions/reports'
import type {
  ReportType,
  ReportData,
  OrdersReport,
  RevenueReport,
  RidesReport,
  UsersReport,
} from '@/app/actions/reports'

/* ─── Helpers ────────────────────────────────────────────── */

const INPUT_CLS =
  'w-full rounded-xl border-0 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-500 outline-none transition-shadow'

function formatLabel(s: string): string {
  return s
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function formatDateRange(from: string, to: string): string {
  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  return `${fmt(from)} — ${fmt(to)}`
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

function thirtyDaysAgo(): string {
  const d = new Date()
  d.setDate(d.getDate() - 30)
  return d.toISOString().slice(0, 10)
}

/* ─── Stat Pill ──────────────────────────────────────────── */

function Stat({
  label,
  value,
  color = 'slate',
}: {
  label: string
  value: string
  color?: 'emerald' | 'red' | 'indigo' | 'amber' | 'sky' | 'slate' | 'violet'
}) {
  const bg: Record<string, string> = {
    emerald: 'bg-emerald-50 ring-emerald-200/60',
    red: 'bg-red-50 ring-red-200/60',
    indigo: 'bg-indigo-50 ring-indigo-200/60',
    amber: 'bg-amber-50 ring-amber-200/60',
    sky: 'bg-sky-50 ring-sky-200/60',
    slate: 'bg-slate-50 ring-slate-200/60',
    violet: 'bg-violet-50 ring-violet-200/60',
  }
  const text: Record<string, string> = {
    emerald: 'text-emerald-700',
    red: 'text-red-700',
    indigo: 'text-indigo-700',
    amber: 'text-amber-700',
    sky: 'text-sky-700',
    slate: 'text-slate-700',
    violet: 'text-violet-700',
  }
  return (
    <div className={cn('rounded-2xl px-5 py-4 ring-1 ring-inset', bg[color])}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={cn('mt-1.5 text-2xl font-bold tracking-tight', text[color])}>{value}</p>
    </div>
  )
}

/* ─── Bar breakdown ──────────────────────────────────────── */

function BarBreakdown({
  title,
  items,
}: {
  title: string
  items: { label: string; value: number; sub?: string }[]
}) {
  const max = Math.max(...items.map((i) => i.value), 1)

  const COLORS = [
    'bg-indigo-500',
    'bg-emerald-500',
    'bg-sky-500',
    'bg-amber-500',
    'bg-violet-500',
    'bg-rose-500',
    'bg-teal-500',
    'bg-orange-500',
  ]

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-slate-900">{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-slate-400">No data</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={item.label}>
              <div className="mb-1 flex items-baseline justify-between">
                <span className="text-sm font-medium text-slate-700">{item.label}</span>
                <span className="text-sm font-bold tabular-nums text-slate-900">
                  {formatNumber(item.value)}
                  {item.sub && (
                    <span className="ml-1 text-xs font-normal text-slate-400">{item.sub}</span>
                  )}
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100">
                <div
                  className={cn('h-2 rounded-full transition-all', COLORS[i % COLORS.length])}
                  style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Donut Chart ────────────────────────────────────────── */

function DonutChart({
  title,
  items,
}: {
  title: string
  items: { label: string; value: number; color: string }[]
}) {
  const total = items.reduce((s, i) => s + i.value, 0)
  if (total === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h3 className="mb-4 text-sm font-semibold text-slate-900">{title}</h3>
        <p className="text-sm text-slate-400">No data</p>
      </div>
    )
  }

  const r = 42
  const cx = 50
  const cy = 50
  const circ = 2 * Math.PI * r
  let offset = 0

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-4 text-sm font-semibold text-slate-900">{title}</h3>
      <div className="flex items-center gap-6">
        <svg viewBox="0 0 100 100" className="h-28 w-28 shrink-0">
          {items.map((item) => {
            const pct = item.value / total
            const dash = pct * circ
            const gap = circ - dash
            const currentOffset = offset
            offset += dash
            return (
              <circle
                key={item.label}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={item.color}
                strokeWidth="12"
                strokeDasharray={`${dash} ${gap}`}
                strokeDashoffset={-currentOffset}
                strokeLinecap="round"
                transform={`rotate(-90 ${cx} ${cy})`}
              />
            )
          })}
          <text
            x={cx}
            y={cy}
            textAnchor="middle"
            dominantBaseline="middle"
            className="fill-slate-900"
            fontSize="14"
            fontWeight="700"
            fontFamily="system-ui"
          >
            {formatNumber(total)}
          </text>
        </svg>
        <div className="space-y-2 min-w-0">
          {items.map((item) => (
            <div key={item.label} className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="truncate text-sm text-slate-600">{item.label}</span>
              <span className="ml-auto text-sm font-semibold tabular-nums text-slate-900">
                {formatNumber(item.value)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ─── Mini sparkline for daily signups ───────────────────── */

function SparklineCard({
  data,
}: {
  data: { date: string; count: number }[]
}) {
  if (data.length < 2) return null

  const max = Math.max(...data.map((d) => d.count), 1)
  const w = 300
  const h = 60
  const pad = 4

  const points = data.map((d, i) => ({
    x: pad + (i / (data.length - 1)) * (w - pad * 2),
    y: pad + (h - pad * 2) - (d.count / max) * (h - pad * 2),
  }))

  const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ')
  const area = `${path}L${points[points.length - 1].x},${h - pad}L${points[0].x},${h - pad}Z`

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <h3 className="mb-3 text-sm font-semibold text-slate-900">Daily Signups</h3>
      <svg viewBox={`0 0 ${w} ${h}`} className="h-16 w-full" preserveAspectRatio="none">
        <defs>
          <linearGradient id="spark-grad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={area} fill="url(#spark-grad)" />
        <path d={path} fill="none" stroke="#8b5cf6" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="white" stroke="#7c3aed" strokeWidth="1.5" />
        ))}
      </svg>
      <div className="mt-2 flex justify-between text-[10px] text-slate-400">
        <span>{new Date(data[0].date + 'T00:00:00').toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}</span>
        <span>{new Date(data[data.length - 1].date + 'T00:00:00').toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}</span>
      </div>
    </div>
  )
}

/* ─── Report views ───────────────────────────────────────── */

const DONUT_COLORS = ['#6366f1', '#10b981', '#0ea5e9', '#f59e0b', '#8b5cf6', '#f43f5e', '#14b8a6', '#f97316']

function OrdersReportView({ data }: { data: OrdersReport }) {
  const statusItems = Object.entries(data.byStatus).map(([k, v], i) => ({
    label: formatLabel(k),
    value: v,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total Orders" value={formatNumber(data.totalOrders)} color="indigo" />
        <Stat label="Completed" value={formatNumber(data.completedOrders)} color="emerald" />
        <Stat label="Cancelled" value={formatNumber(data.cancelledOrders)} color="red" />
        <Stat label="Avg. Order Value" value={formatNaira(data.averageOrderValue)} color="amber" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Stat label="Total Revenue" value={formatNaira(data.totalRevenue)} color="emerald" />
        <DonutChart title="By Status" items={statusItems} />
      </div>
    </div>
  )
}

function RevenueReportView({ data }: { data: RevenueReport }) {
  const methodItems = Object.entries(data.byMethod).map(([k, v]) => ({
    label: formatLabel(k),
    value: v.count,
    sub: formatNaira(v.amount),
  }))

  const purposeItems = Object.entries(data.byPurpose).map(([k, v], i) => ({
    label: formatLabel(k),
    value: v.amount,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Total Revenue" value={formatNaira(data.totalAmount)} color="emerald" />
        <Stat label="Total Payments" value={formatNumber(data.totalPayments)} color="indigo" />
        <Stat
          label="Avg. Payment"
          value={formatNaira(data.totalPayments > 0 ? data.totalAmount / data.totalPayments : 0)}
          color="amber"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <BarBreakdown title="By Payment Method" items={methodItems} />
        <DonutChart
          title="Revenue by Purpose"
          items={purposeItems}
        />
      </div>
    </div>
  )
}

function RidesReportView({ data }: { data: RidesReport }) {
  const statusItems = Object.entries(data.byStatus).map(([k, v], i) => ({
    label: formatLabel(k),
    value: v,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total Rides" value={formatNumber(data.totalRides)} color="sky" />
        <Stat label="Completed" value={formatNumber(data.completedRides)} color="emerald" />
        <Stat label="Cancelled" value={formatNumber(data.cancelledRides)} color="red" />
        <Stat label="Avg. Fare" value={formatNaira(data.averageFare)} color="amber" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Stat label="Total Fare" value={formatNaira(data.totalFare)} color="emerald" />
        <DonutChart title="By Status" items={statusItems} />
      </div>
    </div>
  )
}

function UsersReportView({ data }: { data: UsersReport }) {
  const roleItems = Object.entries(data.byRole).map(([k, v], i) => ({
    label: formatLabel(k),
    value: v,
    color: DONUT_COLORS[i % DONUT_COLORS.length],
  }))

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <Stat label="New Users" value={formatNumber(data.newUsers)} color="violet" />
        <Stat
          label="Roles"
          value={formatNumber(Object.keys(data.byRole).length)}
          color="indigo"
        />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DonutChart title="By Role" items={roleItems} />
        {data.dailySignups.length > 0 && <SparklineCard data={data.dailySignups} />}
      </div>
    </div>
  )
}

/* ─── Main Component ─────────────────────────────────────── */

const REPORT_TYPES: { label: string; value: ReportType; icon: string }[] = [
  { label: 'Orders', value: 'orders', icon: 'M15.75 10.5V6a3.75 3.75 0 1 0-7.5 0v4.5m11.356-1.993 1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 0 1-1.12-1.243l1.264-12A1.125 1.125 0 0 1 5.513 7.5h12.974c.576 0 1.059.435 1.119 1.007ZM8.625 10.5a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Zm7.5 0a.375.375 0 1 1-.75 0 .375.375 0 0 1 .75 0Z' },
  { label: 'Revenue', value: 'revenue', icon: 'M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z' },
  { label: 'Rides', value: 'rides', icon: 'M8.25 18.75a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 0 1-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 0 1-3 0m3 0a1.5 1.5 0 0 0-3 0m3 0h1.125c.621 0 1.129-.504 1.09-1.124a17.902 17.902 0 0 0-3.213-9.193 2.056 2.056 0 0 0-1.58-.86H14.25M16.5 18.75h-2.25m0-11.177v-.958c0-.568-.422-1.048-.987-1.106a48.554 48.554 0 0 0-10.026 0 1.106 1.106 0 0 0-.987 1.106v7.635m12-6.677v6.677m0 4.5v-4.5m0 0h-12' },
  { label: 'Users', value: 'users', icon: 'M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z' },
]

export function ReportsClient() {
  const [reportType, setReportType] = useState<ReportType>('orders')
  const [from, setFrom] = useState(thirtyDaysAgo)
  const [to, setTo] = useState(todayStr)
  const [report, setReport] = useState<ReportData | null>(null)
  const [error, setError] = useState('')
  const [isPending, startTransition] = useTransition()

  function generate() {
    setError('')
    startTransition(async () => {
      const res = await fetchReport(reportType, from, to)
      if (res.error) {
        setError(res.error)
        setReport(null)
      } else if (res.report) {
        setReport(res.report)
      }
    })
  }

  return (
    <main className="px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Reports</h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Generate and view platform reports.
        </p>
      </div>

      {/* Controls */}
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {/* Report type tabs */}
        <div className="mb-5 flex gap-2 flex-wrap">
          {REPORT_TYPES.map((rt) => (
            <button
              key={rt.value}
              onClick={() => setReportType(rt.value)}
              className={cn(
                'inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium transition-all',
                reportType === rt.value
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-50 text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-100'
              )}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.6}
                stroke="currentColor"
                className="h-4 w-4"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d={rt.icon} />
              </svg>
              {rt.label}
            </button>
          ))}
        </div>

        {/* Date range + generate */}
        <div className="flex items-end gap-4 flex-wrap">
          <div className="min-w-40">
            <label className="mb-1.5 block text-xs font-medium text-slate-500">From</label>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className={INPUT_CLS}
            />
          </div>
          <div className="min-w-40">
            <label className="mb-1.5 block text-xs font-medium text-slate-500">To</label>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className={INPUT_CLS}
            />
          </div>
          <button
            onClick={generate}
            disabled={isPending}
            className={cn(
              'inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-all',
              isPending
                ? 'bg-indigo-400 cursor-not-allowed'
                : 'bg-indigo-600 hover:bg-indigo-700'
            )}
          >
            {isPending && (
              <svg className="h-3.5 w-3.5 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            )}
            Generate Report
          </button>
        </div>

        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}
      </div>

      {/* Report results */}
      {report && (
        <div>
          {/* Period badge */}
          <div className="mb-5 inline-flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-1.5 text-xs text-slate-500 ring-1 ring-inset ring-slate-200">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-3.5 w-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
            </svg>
            {formatDateRange(
              (report.data as { period: { from: string; to: string } }).period.from,
              (report.data as { period: { from: string; to: string } }).period.to
            )}
          </div>

          {report.type === 'orders' && <OrdersReportView data={report.data as OrdersReport} />}
          {report.type === 'revenue' && <RevenueReportView data={report.data as RevenueReport} />}
          {report.type === 'rides' && <RidesReportView data={report.data as RidesReport} />}
          {report.type === 'users' && <UsersReportView data={report.data as UsersReport} />}
        </div>
      )}

      {/* Empty state */}
      {!report && !isPending && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 py-20">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.2} stroke="currentColor" className="h-10 w-10 text-slate-300">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
          </svg>
          <p className="mt-3 text-sm font-medium text-slate-500">Select a report type and date range</p>
          <p className="mt-0.5 text-xs text-slate-400">Click &quot;Generate Report&quot; to view your data.</p>
        </div>
      )}
    </main>
  )
}
