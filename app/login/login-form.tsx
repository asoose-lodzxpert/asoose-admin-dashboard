'use client'

import { useActionState, useState } from 'react'
import Image from 'next/image'
import { loginAction } from '@/app/actions/auth'
import { Button } from '@/app/components/ui/button'
import { cn } from '@/app/lib/utils'

/* ─── Icons ─────────────────────────────────────────────── */

function EyeIcon({ open }: { open: boolean }) {
  return open ? (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-4 h-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
    </svg>
  ) : (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="w-4 h-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
      />
    </svg>
  )
}

/* ─── Field ──────────────────────────────────────────────── */

interface FieldProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  suffix?: React.ReactNode
}

function Field({ label, suffix, id, className, ...props }: FieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-medium text-slate-700">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          className={cn(
            'w-full rounded-xl border-0 bg-white px-4 py-2.5 text-sm text-slate-900',
            'shadow-sm ring-1 ring-inset ring-slate-200 placeholder:text-slate-400',
            'transition-shadow focus:ring-2 focus:ring-inset focus:ring-indigo-500 outline-none',
            suffix != null && 'pr-11',
            className
          )}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2">{suffix}</span>
        )}
      </div>
    </div>
  )
}

/* ─── Brand panel ────────────────────────────────────────── */

const VERTICALS = [
  { label: 'Food Delivery', color: 'text-orange-400 bg-orange-400/10 border-orange-500/20' },
  { label: 'Ecommerce', color: 'text-sky-400 bg-sky-400/10 border-sky-500/20' },
  { label: 'Logistics', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-500/20' },
  { label: 'Ride-hailing', color: 'text-violet-400 bg-violet-400/10 border-violet-500/20' },
  { label: 'Payments', color: 'text-pink-400 bg-pink-400/10 border-pink-500/20' },
]

function BrandPanel() {
  return (
    <div className="hidden lg:flex flex-col w-[460px] shrink-0 relative overflow-hidden bg-[#080d1a]">
      {/* Glow blobs */}
      <div className="pointer-events-none absolute -top-40 -right-40 h-[500px] w-[500px] rounded-full bg-indigo-600/25 blur-[120px]" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 h-[500px] w-[500px] rounded-full bg-violet-600/20 blur-[120px]" />
      {/* Subtle grid */}
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,.03)_1px,transparent_1px),linear-gradient(to_right,rgba(255,255,255,.03)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="relative flex h-full flex-col px-10 py-10">
        {/* Logo badge — white pill so the icon colours show correctly on dark bg */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white shadow-sm">
            <Image
              src="/asoose.png"
              alt=""
              width={36}
              height={36}
              priority
              className="h-9 w-9 object-contain"
            />
          </div>
          <span className="text-[17px] font-bold tracking-tight text-white">Asoose</span>
        </div>

        <div className="flex flex-1 flex-col justify-center">
          <span className="mb-4 inline-block text-[11px] font-semibold uppercase tracking-[0.2em] text-indigo-400">
            Admin Portal
          </span>
          <h2 className="text-[40px] font-bold leading-[1.15] text-white">
            One platform.
            <br />
            Infinite
            <br />
            possibilities.
          </h2>
          <p className="mt-5 max-w-[300px] text-[15px] leading-relaxed text-slate-400">
            Manage food delivery, ecommerce, logistics, ride-hailing, and payments from a single powerful dashboard.
          </p>

          <div className="mt-10 flex flex-wrap gap-2">
            {VERTICALS.map(({ label, color }) => (
              <span
                key={label}
                className={cn(
                  'inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium',
                  color
                )}
              >
                {label}
              </span>
            ))}
          </div>
        </div>

        <p className="text-[11px] text-slate-700">
          &copy; {new Date().getFullYear()} Asoose Inc. All rights reserved.
        </p>
      </div>
    </div>
  )
}

/* ─── Login form ─────────────────────────────────────────── */

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, null)
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  return (
    <div className="flex min-h-screen">
      <BrandPanel />

      {/* Right — form panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-slate-50 px-6 py-12">
        <div className="w-full max-w-90">
          {/* Logo — visible on mobile; on desktop the brand panel carries it */}
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
              <Image src="/asoose.png" alt="" width={36} height={36} className="h-9 w-9 object-contain" />
            </div>
            <span className="text-[17px] font-bold tracking-tight text-slate-900">Asoose</span>
          </div>

          <div className="mb-8">
            <h1 className="text-[26px] font-bold tracking-tight text-slate-900">Sign in</h1>
            <p className="mt-1.5 text-sm text-slate-500">
              Enter your credentials to continue to the admin portal.
            </p>
          </div>

          <form action={action} className="space-y-4">
            {state?.error && (
              <div className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                  className="h-4 w-4 shrink-0"
                >
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
                    clipRule="evenodd"
                  />
                </svg>
                {state.error}
              </div>
            )}

            <Field
              id="email"
              label="Email address"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <Field
              id="password"
              label="Password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  <EyeIcon open={showPassword} />
                </button>
              }
            />

            <div className="pt-1">
              <Button type="submit" size="lg" loading={pending} className="w-full cursor-pointer">
                {pending ? 'Signing in…' : 'Sign in'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
