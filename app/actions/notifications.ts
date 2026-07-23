'use server'

import { cookies } from 'next/headers'
import { apiFetch, ApiError } from '@/app/lib/api'
import type { NotificationsData } from '@/app/lib/types'
async function token() {
  const store = await cookies()
  return store.get('access_token')?.value ?? ''
}

export type NotificationAudience = 'ALL' | 'CUSTOMER' | 'VENDOR' | 'RIDER' | 'DRIVER'
type UserStatus = 'ACTIVE' | 'PENDING_VERIFICATION' | 'SUSPENDED' | 'BANNED' | 'DEACTIVATED'

export async function getNotifications(
  page = 1,
  limit = 20,
  unreadOnly = false
): Promise<{ data?: NotificationsData; error?: string }> {
  try {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
      ...(unreadOnly ? { unreadOnly: 'true' } : {}),
    })
    const data = await apiFetch<NotificationsData>(`/api/v1/notifications?${params}`, {
      token: await token(),
    })
    return { data }
  } catch (err) {
    return {
      error: err instanceof ApiError ? err.message : 'Failed to retrieve notifications.',
    }
  }
}

export async function getUnreadNotificationCount(): Promise<{
  data?: { unreadCount: number }
  error?: string
}> {
  try {
    const data = await apiFetch<{ unreadCount: number }>('/api/v1/notifications/unread-count', {
      token: await token(),
    })
    return { data }
  } catch (err) {
    return {
      error: err instanceof ApiError ? err.message : 'Failed to retrieve the unread count.',
    }
  }
}

export async function markAllNotificationsRead(): Promise<{
  data?: { markedCount: number }
  error?: string
}> {
  try {
    const data = await apiFetch<{ markedCount: number }>('/api/v1/notifications/read-all', {
      method: 'PATCH',
      token: await token(),
    })
    return { data }
  } catch (err) {
    return {
      error: err instanceof ApiError ? err.message : 'Failed to mark notifications as read.',
    }
  }
}

export interface EmailBroadcastResult {
  sent: number
  failed: number
  audience: NotificationAudience
}

export async function sendBroadcastEmail(payload: {
  audience: NotificationAudience
  status?: UserStatus
  search?: string
  subject: string
  heading: string
  body: string
}): Promise<{ data?: EmailBroadcastResult; error?: string }> {
  try {
    const body: Record<string, unknown> = {
      audience: payload.audience,
      subject: payload.subject,
      heading: payload.heading,
      body: payload.body,
    }
    if (payload.status) body.status = payload.status
    if (payload.search?.trim()) body.search = payload.search.trim()

    const raw = await apiFetch<Partial<EmailBroadcastResult> | null>(
      '/api/v1/admin/emails/broadcast',
      { method: 'POST', body: JSON.stringify(body), token: await token() }
    )
    return {
      data: {
        audience: raw?.audience ?? payload.audience,
        sent: raw?.sent ?? 0,
        failed: raw?.failed ?? 0,
      },
    }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to send email broadcast.' }
  }
}

export interface PushResult {
  audience: NotificationAudience
  topic: string
  messageId: string
}

export async function sendPushNotification(payload: {
  audience: NotificationAudience
  title: string
  body: string
  data?: Record<string, string>
}): Promise<{ data?: PushResult; error?: string }> {
  try {
    const raw = await apiFetch<Partial<PushResult> | null>('/api/v1/admin/notifications/push/topic', {
      method: 'POST',
      body: JSON.stringify(payload),
      token: await token(),
    })
    // API may return { success: true } with no data field — construct result from what we sent
    return {
      data: {
        audience: raw?.audience ?? payload.audience,
        topic: raw?.topic ?? payload.audience.toLowerCase(),
        messageId: raw?.messageId ?? '—',
      },
    }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to send notification.' }
  }
}
