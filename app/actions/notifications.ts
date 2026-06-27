'use server'

import { cookies } from 'next/headers'
import { apiFetch, ApiError } from '@/app/lib/api'

async function token() {
  const store = await cookies()
  return store.get('access_token')?.value ?? ''
}

export type NotificationAudience = 'ALL' | 'CUSTOMER' | 'VENDOR' | 'RIDER' | 'DRIVER'

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
    const data = await apiFetch<PushResult>('/api/v1/admin/notifications/push/topic', {
      method: 'POST',
      body: JSON.stringify(payload),
      token: await token(),
    })
    return { data: data! }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to send notification.' }
  }
}
