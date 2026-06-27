'use client'

import { useState } from 'react'
import { cn, formatNaira, formatNumber } from '@/app/lib/utils'
import type { ChartPoint, RevenuePoint } from '@/app/actions/admin'

/* ─── Smooth curve helper (monotone cubic spline) ────────── */

function monotonePath(points: { x: number; y: number }[]): string {
  if (points.length < 2) return ''
  if (points.length === 2) return `M${points[0].x},${points[0].y}L${points[1].x},${points[1].y}`

  const n = points.length
  const dx: number[] = []
  const dy: number[] = []
  const m: number[] = []

  for (let i = 0; i < n - 1; i++) {
    dx.push(points[i + 1].x - points[i].x)
    dy.push(points[i + 1].y - points[i].y)
    m.push(dy[i] / dx[i])
  }

  const tangents: number[] = [m[0]]
  for (let i = 1; i < n - 1; i++) {
    if (m[i - 1] * m[i] <= 0) {
      tangents.push(0)
    } else {
      tangents.push((m[i - 1] + m[i]) / 2)
    }
  }
  tangents.push(m[n - 2])

  for (let i = 0; i < n - 1; i++) {
    if (Math.abs(m[i]) < 1e-6) {
      tangents[i] = 0
      tangents[i + 1] = 0
    } else {
      const a = tangents[i] / m[i]
      const b = tangents[i + 1] / m[i]
      const s = a * a + b * b
      if (s > 9) {
        const t = 3 / Math.sqrt(s)
        tangents[i] = t * a * m[i]
        tangents[i + 1] = t * b * m[i]
      }
    }
  }

  let path = `M${points[0].x},${points[0].y}`
  for (let i = 0; i < n - 1; i++) {
    const d = dx[i] / 3
    const cp1x = points[i].x + d
    const cp1y = points[i].y + d * tangents[i]
    const cp2x = points[i + 1].x - d
    const cp2y = points[i + 1].y - d * tangents[i + 1]
    path += `C${cp1x},${cp1y},${cp2x},${cp2y},${points[i + 1].x},${points[i + 1].y}`
  }
  return path
}

/* ─── Nice Y-axis ticks ──────────────────────────────────── */

function niceScale(maxVal: number, tickCount = 4): number[] {
  if (maxVal <= 0) return [0]
  const rough = maxVal / (tickCount - 1)
  const pow = Math.pow(10, Math.floor(Math.log10(rough)))
  const nice = [1, 2, 2.5, 5, 10].find((n) => n * pow >= rough)! * pow
  const ticks: number[] = []
  for (let i = 0; i <= tickCount - 1; i++) {
    ticks.push(nice * i)
  }
  return ticks
}

function shortNum(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(n >= 10_000 ? 0 : 1)}K`
  return String(Math.round(n))
}

/* ─── SVG Area Chart ─────────────────────────────────────── */

const CHART_COLORS = {
  indigo: { stroke: '#6366f1', gradStart: '#6366f1', dot: '#4f46e5', text: 'text-indigo-600' },
  emerald: { stroke: '#10b981', gradStart: '#10b981', dot: '#059669', text: 'text-emerald-600' },
  violet: { stroke: '#8b5cf6', gradStart: '#8b5cf6', dot: '#7c3aed', text: 'text-violet-600' },
  sky: { stroke: '#0ea5e9', gradStart: '#0ea5e9', dot: '#0284c7', text: 'text-sky-600' },
} as const

function AreaChart({
  data,
  color,
  formatTooltip,
  isCurrency,
}: {
  data: { label: string; value: number }[]
  color: keyof typeof CHART_COLORS
  formatTooltip?: (v: number) => string
  isCurrency?: boolean
}) {
  const [hovered, setHovered] = useState<number | null>(null)

  if (data.length < 2) {
    return (
      <div className="flex h-full items-center justify-center">
        <p className="text-xs text-slate-400">Not enough data</p>
      </div>
    )
  }

  const c = CHART_COLORS[color]
  const gradId = `area-grad-${color}`

  const rawMax = Math.max(...data.map((d) => d.value))
  const ticks = niceScale(rawMax)
  const maxY = ticks[ticks.length - 1] || 1

  const padL = 36
  const padR = 8
  const padT = 12
  const padB = 24
  const svgW = 400
  const svgH = 180
  const plotW = svgW - padL - padR
  const plotH = svgH - padT - padB

  const points = data.map((d, i) => ({
    x: padL + (i / (data.length - 1)) * plotW,
    y: padT + plotH - (d.value / maxY) * plotH,
    ...d,
  }))

  const curvePath = monotonePath(points)
  const areaPath = `${curvePath}L${points[points.length - 1].x},${padT + plotH}L${points[0].x},${padT + plotH}Z`

  // Show ~5 x-axis labels evenly spaced
  const xLabelStep = Math.max(1, Math.floor(data.length / 5))

  return (
    <div className="relative h-full">
      {/* Tooltip */}
      {hovered !== null && points[hovered] && (
        <div
          className="pointer-events-none absolute z-10 rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-lg"
          style={{
            left: `${(points[hovered].x / svgW) * 100}%`,
            top: `${(points[hovered].y / svgH) * 100}%`,
            transform: `translate(${points[hovered].x > svgW * 0.75 ? '-100%' : points[hovered].x < svgW * 0.25 ? '0%' : '-50%'}, -110%)`,
          }}
        >
          <p className="text-[11px] font-bold text-slate-900">
            {formatTooltip ? formatTooltip(points[hovered].value) : formatNumber(points[hovered].value)}
          </p>
          <p className="text-[10px] text-slate-500">{points[hovered].label}</p>
        </div>
      )}

      <svg viewBox={`0 0 ${svgW} ${svgH}`} className="h-full w-full" preserveAspectRatio="xMidYMid meet">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={c.gradStart} stopOpacity="0.12" />
            <stop offset="100%" stopColor={c.gradStart} stopOpacity="0.01" />
          </linearGradient>
        </defs>

        {/* Y-axis grid + labels */}
        {ticks.map((tick) => {
          const y = padT + plotH - (tick / maxY) * plotH
          return (
            <g key={tick}>
              <line
                x1={padL}
                y1={y}
                x2={svgW - padR}
                y2={y}
                stroke="#f1f5f9"
                strokeWidth="1"
              />
              <text
                x={padL - 6}
                y={y + 1}
                textAnchor="end"
                dominantBaseline="middle"
                className="fill-slate-400"
                fontSize="9"
                fontFamily="system-ui"
              >
                {isCurrency ? `₦${shortNum(tick)}` : shortNum(tick)}
              </text>
            </g>
          )
        })}

        {/* X-axis labels */}
        {points.map((p, i) =>
          i % xLabelStep === 0 || i === points.length - 1 ? (
            <text
              key={i}
              x={p.x}
              y={svgH - 4}
              textAnchor="middle"
              className="fill-slate-400"
              fontSize="8.5"
              fontFamily="system-ui"
            >
              {p.label}
            </text>
          ) : null
        )}

        {/* Area fill */}
        <path d={areaPath} fill={`url(#${gradId})`} />

        {/* Smooth line */}
        <path
          d={curvePath}
          fill="none"
          stroke={c.stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Hover crosshair + dot */}
        {hovered !== null && points[hovered] && (
          <>
            <line
              x1={points[hovered].x}
              y1={padT}
              x2={points[hovered].x}
              y2={padT + plotH}
              stroke={c.stroke}
              strokeWidth="0.75"
              strokeDasharray="3,3"
              opacity="0.4"
            />
            <circle cx={points[hovered].x} cy={points[hovered].y} r="5" fill="white" stroke={c.dot} strokeWidth="2" />
          </>
        )}

        {/* Invisible hover zones */}
        {points.map((p, i) => {
          const prevX = i > 0 ? points[i - 1].x : padL
          const nextX = i < points.length - 1 ? points[i + 1].x : svgW - padR
          const x0 = (prevX + p.x) / 2
          const x1 = (p.x + nextX) / 2
          return (
            <rect
              key={i}
              x={x0}
              y={padT}
              width={x1 - x0}
              height={plotH}
              fill="transparent"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
            />
          )
        })}
      </svg>
    </div>
  )
}

/* ─── Chart Card ─────────────────────────────────────────── */

function ChartCard({
  title,
  value,
  sub,
  data,
  color,
  formatTooltip,
  isCurrency,
}: {
  title: string
  value: string
  sub: string
  data: { label: string; value: number }[]
  color: keyof typeof CHART_COLORS
  formatTooltip?: (v: number) => string
  isCurrency?: boolean
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden flex flex-col">
      <div className="px-5 pt-5 pb-2">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{title}</p>
        <p className="mt-1.5 text-2xl font-bold tracking-tight text-slate-900">{value}</p>
        <p className="mt-0.5 text-xs text-slate-400">{sub}</p>
      </div>
      <div className="flex-1 min-h-40 px-1 pb-1">
        <AreaChart data={data} color={color} formatTooltip={formatTooltip} isCurrency={isCurrency} />
      </div>
    </div>
  )
}

/* ─── Exported Component ─────────────────────────────────── */

function formatShortDate(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })
}

export function DashboardCharts({
  dailyOrders,
  dailyRides,
  dailyRevenue,
  dailySignups,
}: {
  dailyOrders: ChartPoint[]
  dailyRides: ChartPoint[]
  dailyRevenue: RevenuePoint[]
  dailySignups: ChartPoint[]
}) {
  const [range, setRange] = useState<'7d' | '30d'>('30d')

  const slice = <T,>(arr: T[]) => (range === '7d' ? arr.slice(-7) : arr)

  const ordersSlice = slice(dailyOrders)
  const ridesSlice = slice(dailyRides)
  const revenueSlice = slice(dailyRevenue)
  const signupsSlice = slice(dailySignups)

  const ordersTotal = ordersSlice.reduce((s, d) => s + d.count, 0)
  const ridesTotal = ridesSlice.reduce((s, d) => s + d.count, 0)
  const revenueTotal = revenueSlice.reduce((s, d) => s + d.amount, 0)
  const signupsTotal = signupsSlice.reduce((s, d) => s + d.count, 0)

  const toData = (arr: ChartPoint[]) =>
    arr.map((d) => ({ label: formatShortDate(d.date), value: d.count }))

  const rangeLabel = range === '7d' ? 'Last 7 days' : 'Last 30 days'

  return (
    <div className="mt-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Trends</h2>
        <div className="flex rounded-lg bg-slate-100 p-0.5">
          {(['7d', '30d'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={cn(
                'rounded-md px-3 py-1 text-xs font-medium transition-all',
                range === r
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              )}
            >
              {r === '7d' ? '7 days' : '30 days'}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <ChartCard
          title="Orders"
          value={formatNumber(ordersTotal)}
          sub={rangeLabel}
          data={toData(ordersSlice)}
          color="indigo"
        />
        <ChartCard
          title="Rides"
          value={formatNumber(ridesTotal)}
          sub={rangeLabel}
          data={toData(ridesSlice)}
          color="sky"
        />
        <ChartCard
          title="Revenue"
          value={formatNaira(revenueTotal)}
          sub={rangeLabel}
          data={revenueSlice.map((d) => ({ label: formatShortDate(d.date), value: d.amount }))}
          color="emerald"
          formatTooltip={(v) => formatNaira(v)}
          isCurrency
        />
        <ChartCard
          title="New Signups"
          value={formatNumber(signupsTotal)}
          sub={rangeLabel}
          data={toData(signupsSlice)}
          color="violet"
        />
      </div>
    </div>
  )
}
