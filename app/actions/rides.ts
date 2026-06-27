'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { apiFetch, ApiError } from '@/app/lib/api'
import type { RideSummary, RideDetail, RideStatus, Pagination } from '@/app/lib/types'

async function token() {
  return (await cookies()).get('access_token')?.value ?? ''
}

export async function getRides(params?: {
  status?: RideStatus | ''
  page?: number
  limit?: number
}): Promise<{ rides: RideSummary[]; pagination: Pagination }> {
  try {
    const q = new URLSearchParams()
    q.set('page', String(params?.page ?? 1))
    q.set('limit', String(params?.limit ?? 20))
    if (params?.status) q.set('status', params.status)
    const res = await apiFetch<{ rides: RideSummary[]; pagination: Pagination }>(
      `/api/v1/rides/admin?${q}`,
      { token: await token() }
    )
    return {
      rides: res?.rides ?? [],
      pagination: res?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
    }
  } catch {
    return { rides: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
  }
}

export async function getRideDetail(rideId: string): Promise<RideDetail | null> {
  try {
    return await apiFetch<RideDetail>(`/api/v1/rides/admin/${rideId}`, { token: await token() })
  } catch { return null }
}

export async function assignDriverToRide(rideId: string, driverId: string): Promise<{ error?: string }> {
  try {
    await apiFetch<unknown>(`/api/v1/admin/ops/rides/${rideId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ driverId }),
      token: await token(),
    })
    revalidatePath('/dashboard/rides')
    revalidatePath(`/dashboard/rides/${rideId}`)
    return {}
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to assign driver.' }
  }
}

export async function requeueRide(rideId: string): Promise<{ error?: string }> {
  try {
    await apiFetch<unknown>(`/api/v1/admin/ops/rides/${rideId}/requeue`, {
      method: 'POST',
      token: await token(),
    })
    revalidatePath('/dashboard/rides')
    revalidatePath(`/dashboard/rides/${rideId}`)
    return {}
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to requeue ride.' }
  }
}

export async function forceCancelRide(rideId: string, reason: string): Promise<{ error?: string }> {
  try {
    await apiFetch<unknown>(`/api/v1/admin/ops/rides/${rideId}/force-cancel`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
      token: await token(),
    })
    revalidatePath('/dashboard/rides')
    revalidatePath(`/dashboard/rides/${rideId}`)
    return {}
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to cancel ride.' }
  }
}
