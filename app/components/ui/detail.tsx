import { cn } from '@/app/lib/utils'

export function InfoRow({
  label,
  value,
  wide,
}: {
  label: string
  value?: string | number | null
  wide?: boolean
}) {
  if (value == null || value === '') return null
  return (
    <div className={wide ? 'col-span-2' : undefined}>
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-700">{String(value)}</dd>
    </div>
  )
}

export function InfoGrid({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <dl className={cn('grid grid-cols-2 gap-x-6 gap-y-3', className)}>{children}</dl>
  )
}

export function DetailCard({
  title,
  children,
  className,
}: {
  title: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn('rounded-2xl border border-slate-200 bg-white shadow-sm', className)}>
      <div className="border-b border-slate-100 px-6 py-4">
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}

export function Stars({ rating }: { rating: number }) {
  const r = Math.round(rating)
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill={s <= r ? '#f59e0b' : 'none'}
          stroke="#f59e0b"
          strokeWidth={1}
          className="h-3.5 w-3.5"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 0 0 .95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 0 0-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 0 0-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 0 0-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 0 0 .951-.69l1.07-3.292Z" />
        </svg>
      ))}
      <span className="ml-1.5 text-sm font-medium text-slate-700">{rating.toFixed(1)}</span>
    </span>
  )
}

export function formatDate(date: string | null | undefined): string {
  if (!date) return '—'
  return new Date(date).toLocaleDateString('en-NG', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}
