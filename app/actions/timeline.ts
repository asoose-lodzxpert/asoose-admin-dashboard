'use server'

import { cookies } from 'next/headers'
import { apiFetch, ApiError } from '@/app/lib/api'
import type { TimelineEntity, TimelineEvent } from '@/app/lib/types'

async function token() {
  return (await cookies()).get('access_token')?.value ?? ''
}

export interface TimelineResult {
  events: TimelineEvent[]
  error?: string
}

export async function getTimeline(
  entity: TimelineEntity,
  entityId: string
): Promise<TimelineResult> {
  try {
    const events = await apiFetch<TimelineEvent[]>(
      `/api/v1/${entity}/${encodeURIComponent(entityId)}/timeline`,
      { token: await token() }
    )

    return {
      events: [...(events ?? [])].sort(
        (first, second) =>
          new Date(first.createdAt).getTime() - new Date(second.createdAt).getTime()
      ),
    }
  } catch (error) {
    return {
      events: [],
      error: error instanceof ApiError ? error.message : 'Failed to retrieve activity.',
    }
  }
}
