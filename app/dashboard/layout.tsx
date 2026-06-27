import type { Metadata } from 'next'
import { Sidebar } from './sidebar'
import { getCurrentUser } from '@/app/lib/auth'

export const metadata: Metadata = {
  title: { default: 'Dashboard', template: '%s — Asoose Admin' },
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser()
  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar user={user} />
      <div className="flex flex-1 flex-col min-w-0 overflow-y-auto">
        {children}
      </div>
    </div>
  )
}
