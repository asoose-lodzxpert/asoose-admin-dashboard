'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { apiFetch, ApiError } from '@/app/lib/api'
import type { RiderSummary, RiderDetail } from '@/app/lib/types'

type RiderUpdateData = Partial<{
  vehicleType: string
  vehicleBrand: string | null
  vehicleModel: string | null
  vehicleYear: number | null
  vehicleColor: string | null
  vehiclePlate: string | null
  driversLicenseNumber: string
  driversLicenseExpiry: string
  driversLicenseState: string
  maxDeliveryDistance: number
  status: RiderDetail['status']
  isVerified: boolean
}>

async function token() {
  const store = await cookies()
  return store.get('access_token')?.value ?? ''
}

interface ListResponse {
  riders: RiderSummary[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export async function getRiders(params?: {
  status?: string
  page?: number
  limit?: number
}): Promise<ListResponse> {
  try {
    const q = new URLSearchParams()
    if (params?.status) q.set('status', params.status)
    q.set('page', String(params?.page ?? 1))
    q.set('limit', String(params?.limit ?? 20))
    return await apiFetch<ListResponse>(`/api/v1/riders/admin?${q}`, { token: await token() })
  } catch {
    return { riders: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
  }
}

export async function getRiderDetail(riderId: string): Promise<RiderDetail | null> {
  try {
    const result = await apiFetch<unknown>(`/api/v1/riders/admin/${riderId}`, { token: await token() })
    if (!result || typeof result !== 'object') return null
    const obj = result as Record<string, unknown>
    if ('id' in obj) return obj as unknown as RiderDetail
    return (obj.rider ?? obj.data) as RiderDetail ?? null
  } catch { return null }
}

export async function updateRiderProfile(
  riderId: string,
  data: RiderUpdateData
): Promise<{ rider?: RiderDetail; error?: string }> {
  try {
    const rider = await apiFetch<RiderDetail>(
      `/api/v1/riders/admin/${riderId}`,
      { method: 'PATCH', body: JSON.stringify(data), token: await token() }
    )
    revalidatePath(`/dashboard/partners/riders/${riderId}`)
    return { rider }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to update rider profile.' }
  }
}

export async function approveRider(riderId: string): Promise<{ error?: string }> {
  try {
    await apiFetch<null>(`/api/v1/riders/admin/${riderId}/approve`, {
      method: 'PATCH', token: await token(),
    })
    revalidatePath('/dashboard/rides')
    return {}
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to approve rider.' }
  }
}

export async function suspendRider(
  riderId: string, reason?: string
): Promise<{ error?: string }> {
  try {
    await apiFetch<null>(`/api/v1/riders/admin/${riderId}/suspend`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
      token: await token(),
    })
    revalidatePath('/dashboard/rides')
    return {}
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to suspend rider.' }
  }
}
