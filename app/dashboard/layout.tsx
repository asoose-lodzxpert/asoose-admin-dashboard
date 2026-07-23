import type { Metadata } from 'next'
import { Sidebar } from './sidebar'
import { NotificationCenter } from '@/app/components/notifications/notification-center'
import { getNotifications, getUnreadNotificationCount } from '@/app/actions/notifications'
import { getAccessToken, getCurrentUser } from '@/app/lib/auth'

export const metadata: Metadata = {
  title: { default: 'Dashboard', template: '%s — Asoose Admin' },
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [user, accessToken, notificationsResult, unreadCountResult] = await Promise.all([
    getCurrentUser(),
    getAccessToken(),
    getNotifications(),
    getUnreadNotificationCount(),
  ])

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar user={user} />
      <div className="flex min-w-0 flex-1 flex-col">
        <NotificationCenter
          accessToken={accessToken ?? ''}
          initialData={notificationsResult.data ?? null}
          initialUnreadCount={
            unreadCountResult.data?.unreadCount ?? notificationsResult.data?.unreadCount ?? 0
          }
          socketUrl={process.env.API_BASE_URL?.trim() ?? ''}
        />
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  )
}
