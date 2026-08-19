import Link from 'next/link'

export default function UnauthorizedPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-6">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-widest text-red-500">Unauthorized</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">You cannot access this page</h1>
        <p className="mt-3 text-sm leading-6 text-slate-500">
          This admin portal is limited to Admin and Super Admin accounts. Some sensitive areas are
          available to Super Admins only.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Link
            href="/dashboard"
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-700"
          >
            Go to dashboard
          </Link>
          <Link
            href="/login"
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Back to login
          </Link>
        </div>
      </div>
    </main>
  )
}
