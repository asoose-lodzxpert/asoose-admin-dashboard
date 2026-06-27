'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { apiFetch, ApiError } from '@/app/lib/api'
import type { Application, AppTargetRole, AppStatus } from '@/app/lib/types'

async function token() {
  const store = await cookies()
  return store.get('access_token')?.value ?? ''
}

interface ListResponse {
  applications: Application[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export async function getApplications(params?: {
  status?: AppStatus
  targetRole?: AppTargetRole
  page?: number
  limit?: number
}): Promise<ListResponse> {
  try {
    const q = new URLSearchParams()
    if (params?.status) q.set('status', params.status)
    if (params?.targetRole) q.set('targetRole', params.targetRole)
    q.set('page', String(params?.page ?? 1))
    q.set('limit', String(params?.limit ?? 20))
    return await apiFetch<ListResponse>(`/api/v1/onboarding/applications?${q}`, {
      token: await token(),
    })
  } catch {
    return { applications: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
  }
}

export async function reviewApplication(
  applicationId: string,
  approved: boolean,
  notes: string
): Promise<{ error?: string }> {
  try {
    await apiFetch<null>(`/api/v1/onboarding/review/${applicationId}`, {
      method: 'POST',
      body: JSON.stringify({ approved, notes }),
      token: await token(),
    })
    revalidatePath('/dashboard/applications')
    return {}
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to submit review.' }
  }
}
