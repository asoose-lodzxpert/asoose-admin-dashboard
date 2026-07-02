'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { apiFetch, ApiError } from '@/app/lib/api'
import type { ParcelSummary, ParcelDetail, ParcelStatus, Pagination } from '@/app/lib/types'

async function token() {
  return (await cookies()).get('access_token')?.value ?? ''
}

export async function getParcels(params?: {
  status?: ParcelStatus | ''
  page?: number
  limit?: number
}): Promise<{ parcels: ParcelSummary[]; pagination: Pagination }> {
  try {
    const q = new URLSearchParams()
    q.set('page', String(params?.page ?? 1))
    q.set('limit', String(params?.limit ?? 20))
    if (params?.status) q.set('status', params.status)
    const res = await apiFetch<{ parcels: ParcelSummary[]; pagination: Pagination }>(
      `/api/v1/parcels/admin?${q}`,
      { token: await token() }
    )
    return {
      parcels: res?.parcels ?? [],
      pagination: res?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
    }
  } catch {
    return { parcels: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
  }
}

export async function getParcelDetail(parcelId: string): Promise<ParcelDetail | null> {
  try {
    return await apiFetch<ParcelDetail>(`/api/v1/parcels/admin/${parcelId}`, { token: await token() })
  } catch { return null }
}

export async function assignRiderToParcel(parcelId: string, riderId: string): Promise<{ error?: string }> {
  try {
    await apiFetch<unknown>(`/api/v1/parcels/admin/${parcelId}/assign`, {
      method: 'POST',
      body: JSON.stringify({ riderId }),
      token: await token(),
    })
    revalidatePath('/dashboard/parcels')
    revalidatePath(`/dashboard/parcels/${parcelId}`)
    return {}
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to assign rider.' }
  }
}
