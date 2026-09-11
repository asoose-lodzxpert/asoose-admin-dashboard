'use server'

import { revalidatePath } from 'next/cache'
import { apiFetch, ApiError } from '@/app/lib/api'
import { getAccessToken } from '@/app/lib/auth'
import type { ReferralList, ReferralResult, ReferralSettings, ReferralStatus } from '@/app/lib/referrals'

async function token() {
  const value = await getAccessToken()
  if (!value) throw new ApiError(401, 'Please sign in to manage referrals.')
  return value
}

export async function getReferrals({ page = 1, limit = 20, status }: {
  page?: number; limit?: number; status?: ReferralStatus
} = {}): Promise<ReferralResult<ReferralList>> {
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(limit) || limit < 1) {
    return { error: 'Invalid pagination.' }
  }
  if (status !== undefined && status !== 'PENDING' && status !== 'CREDITED') {
    return { error: 'Invalid referral status.' }
  }
  try {
    const query = new URLSearchParams({ page: String(page), limit: String(limit) })
    if (status) query.set('status', status)
    return { data: await apiFetch<ReferralList>(`/api/v1/referrals/admin?${query}`, { token: await token() }) }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to load referrals.' }
  }
}

export async function getReferralSettings(): Promise<ReferralResult<ReferralSettings>> {
  try {
    return { data: await apiFetch<ReferralSettings>('/api/v1/referrals/admin/settings', { token: await token() }) }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to load referral settings.' }
  }
}

export async function updateReferralSettings(payload: Pick<ReferralSettings, 'bonusAmount' | 'isActive'>): Promise<ReferralResult<ReferralSettings>> {
  if (!payload || typeof payload.bonusAmount !== 'number' || !Number.isFinite(payload.bonusAmount) || payload.bonusAmount < 0 || typeof payload.isActive !== 'boolean') {
    return { error: 'Enter a valid, non-negative bonus amount and activation status.' }
  }
  try {
    const data = await apiFetch<ReferralSettings>('/api/v1/referrals/admin/settings', {
      method: 'PATCH',
      token: await token(),
      body: JSON.stringify({ bonusAmount: payload.bonusAmount, isActive: payload.isActive }),
    })
    revalidatePath('/dashboard/referrals')
    return { data }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to update referral settings.' }
  }
}
