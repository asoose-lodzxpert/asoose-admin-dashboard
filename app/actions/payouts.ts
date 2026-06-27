'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { apiFetch, ApiError } from '@/app/lib/api'
import type { PayoutSummary, PayoutStatus, Pagination } from '@/app/lib/types'

async function token() {
  return (await cookies()).get('access_token')?.value ?? ''
}

interface ListResponse {
  payouts: PayoutSummary[]
  pagination: Pagination
}

export async function getPayouts(params?: {
  status?: PayoutStatus | ''
  page?: number
  limit?: number
}): Promise<ListResponse> {
  try {
    const q = new URLSearchParams()
    q.set('page', String(params?.page ?? 1))
    q.set('limit', String(params?.limit ?? 20))
    if (params?.status) q.set('status', params.status)
    const res = await apiFetch<{ payouts: PayoutSummary[]; pagination: Pagination }>(
      `/api/v1/payouts/admin?${q}`,
      { token: await token() }
    )
    return {
      payouts: res?.payouts ?? [],
      pagination: res?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
    }
  } catch {
    return { payouts: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
  }
}

export async function approvePayout(
  payoutId: string
): Promise<{ error?: string }> {
  try {
    await apiFetch<unknown>(`/api/v1/payouts/admin/${payoutId}/approve`, {
      method: 'POST',
      token: await token(),
    })
    return {}
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to approve payout.' }
  }
}

export async function confirmApproval(
  payoutId: string,
  otp: string
): Promise<{ error?: string }> {
  try {
    await apiFetch<unknown>(`/api/v1/payouts/admin/${payoutId}/approve/confirm`, {
      method: 'POST',
      body: JSON.stringify({ otp }),
      token: await token(),
    })
    revalidatePath('/dashboard/finance/payouts')
    return {}
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to confirm approval.' }
  }
}

export async function rejectPayout(
  payoutId: string,
  reason: string
): Promise<{ error?: string }> {
  try {
    await apiFetch<unknown>(`/api/v1/payouts/admin/${payoutId}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
      token: await token(),
    })
    revalidatePath('/dashboard/finance/payouts')
    return {}
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to reject payout.' }
  }
}
