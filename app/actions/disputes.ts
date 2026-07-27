'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { apiFetch, ApiError } from '@/app/lib/api'
import type {
  DisputeDetail,
  DisputeMessage,
  DisputePriority,
  DisputeResolution,
  DisputeStatus,
  DisputeSummary,
  Pagination,
} from '@/app/lib/types'

async function token() {
  return (await cookies()).get('access_token')?.value ?? ''
}

export async function getDisputeCategories(): Promise<string[]> {
  try {
    const result = await apiFetch<{ categories: string[] }>('/api/v1/disputes/categories', {
      token: await token(),
    })
    return result?.categories ?? []
  } catch {
    return []
  }
}

export async function getDisputes(params?: {
  page?: number
  limit?: number
  status?: DisputeStatus | ''
  priority?: DisputePriority | ''
  category?: string
}): Promise<{ disputes: DisputeSummary[]; pagination: Pagination }> {
  try {
    const query = new URLSearchParams({
      page: String(params?.page ?? 1),
      limit: String(params?.limit ?? 20),
    })
    if (params?.status) query.set('status', params.status)
    if (params?.priority) query.set('priority', params.priority)
    if (params?.category) query.set('category', params.category)
    const result = await apiFetch<{ disputes: DisputeSummary[]; pagination: Pagination }>(
      `/api/v1/disputes/admin?${query}`,
      { token: await token() }
    )
    return {
      disputes: result?.disputes ?? [],
      pagination: result?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
    }
  } catch {
    return { disputes: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
  }
}

export async function getDisputeDetail(disputeId: string): Promise<DisputeDetail | null> {
  try {
    return await apiFetch<DisputeDetail>(
      `/api/v1/disputes/admin/${encodeURIComponent(disputeId)}`,
      { token: await token() }
    )
  } catch {
    return null
  }
}

export async function updateDispute(
  disputeId: string,
  payload: {
    status: Exclude<DisputeStatus, 'RESOLVED'>
    priority: DisputePriority
    assignedToId?: string | null
  }
): Promise<{ data?: Partial<DisputeDetail>; error?: string }> {
  try {
    const data = await apiFetch<Partial<DisputeDetail>>(
      `/api/v1/disputes/admin/${encodeURIComponent(disputeId)}`,
      { method: 'PATCH', body: JSON.stringify(payload), token: await token() }
    )
    revalidatePath('/dashboard/disputes')
    revalidatePath(`/dashboard/disputes/${disputeId}`)
    return { data }
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : 'Failed to update dispute.' }
  }
}

export async function addDisputeMessage(
  disputeId: string,
  payload: { message: string; attachmentUrls?: string[]; isInternal: boolean }
): Promise<{ data?: DisputeMessage; error?: string }> {
  try {
    const data = await apiFetch<DisputeMessage>(
      `/api/v1/disputes/admin/${encodeURIComponent(disputeId)}/messages`,
      { method: 'POST', body: JSON.stringify(payload), token: await token() }
    )
    revalidatePath(`/dashboard/disputes/${disputeId}`)
    return { data }
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : 'Failed to add message.' }
  }
}

export async function resolveDispute(
  disputeId: string,
  payload: {
    resolution: DisputeResolution
    resolutionNotes: string
    refundAmount?: number
  }
): Promise<{ data?: Partial<DisputeDetail>; error?: string }> {
  try {
    const data = await apiFetch<Partial<DisputeDetail>>(
      `/api/v1/disputes/admin/${encodeURIComponent(disputeId)}/resolve`,
      { method: 'POST', body: JSON.stringify(payload), token: await token() }
    )
    revalidatePath('/dashboard/disputes')
    revalidatePath(`/dashboard/disputes/${disputeId}`)
    return { data }
  } catch (error) {
    return { error: error instanceof ApiError ? error.message : 'Failed to resolve dispute.' }
  }
}
