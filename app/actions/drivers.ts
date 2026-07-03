'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { apiFetch, ApiError } from '@/app/lib/api'
import type { DriverSummary, DriverDetail } from '@/app/lib/types'

type DriverUpdateData = Partial<{
  licenseNumber: string
  licenseExpiry: string
  licenseState: string
  vehicleType: string
  vehicleBrand: string
  vehicleModel: string
  vehicleYear: number
  vehicleColor: string
  vehiclePlate: string
  insuranceProvider: string
  insurancePolicyNumber: string
  insuranceExpiry: string
  maxDeliveryDistance: number
  status: DriverDetail['status']
  isVerified: boolean
}>

async function token() {
  const store = await cookies()
  return store.get('access_token')?.value ?? ''
}

interface ListResponse {
  drivers: DriverSummary[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export async function getDrivers(params?: {
  status?: string
  isVerified?: string
  search?: string
  page?: number
  limit?: number
}): Promise<ListResponse> {
  try {
    const q = new URLSearchParams()
    if (params?.status) q.set('status', params.status)
    if (params?.isVerified !== undefined && params.isVerified !== '') q.set('isVerified', params.isVerified)
    if (params?.search) q.set('search', params.search)
    q.set('page', String(params?.page ?? 1))
    q.set('limit', String(params?.limit ?? 20))
    return await apiFetch<ListResponse>(`/api/v1/drivers/admin?${q}`, { token: await token() })
  } catch {
    return { drivers: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
  }
}

export async function getDriverDetail(driverId: string): Promise<DriverDetail | null> {
  try {
    const result = await apiFetch<unknown>(`/api/v1/drivers/admin/${driverId}`, { token: await token() })
    if (!result || typeof result !== 'object') return null
    const obj = result as Record<string, unknown>
    if ('id' in obj) return obj as unknown as DriverDetail
    return (obj.driver ?? obj.data) as DriverDetail ?? null
  } catch { return null }
}

export async function updateDriverProfile(
  driverId: string,
  data: DriverUpdateData
): Promise<{ driver?: DriverDetail; error?: string }> {
  try {
    const driver = await apiFetch<DriverDetail>(
      `/api/v1/drivers/admin/${driverId}`,
      { method: 'PATCH', body: JSON.stringify(data), token: await token() }
    )
    revalidatePath(`/dashboard/partners/drivers/${driverId}`)
    return { driver }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to update driver profile.' }
  }
}

export async function approveDriver(
  driverId: string, notes?: string
): Promise<{ error?: string }> {
  try {
    await apiFetch<null>(`/api/v1/drivers/admin/${driverId}/approve`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
      token: await token(),
    })
    revalidatePath('/dashboard/partners/drivers')
    revalidatePath(`/dashboard/partners/drivers/${driverId}`)
    return {}
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to approve driver.' }
  }
}

export async function suspendDriver(
  driverId: string, reason: string
): Promise<{ error?: string }> {
  try {
    await apiFetch<null>(`/api/v1/drivers/admin/${driverId}/suspend`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
      token: await token(),
    })
    revalidatePath('/dashboard/partners/drivers')
    revalidatePath(`/dashboard/partners/drivers/${driverId}`)
    return {}
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to suspend driver.' }
  }
}

export async function setDriverAvailability(
  driverId: string,
  status: 'ONLINE' | 'OFFLINE'
): Promise<{ error?: string }> {
  try {
    await apiFetch<unknown>(`/api/v1/drivers/admin/${driverId}/availability`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
      token: await token(),
    })
    revalidatePath('/dashboard/partners/drivers')
    revalidatePath(`/dashboard/partners/drivers/${driverId}`)
    return {}
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to update driver availability.' }
  }
}

export async function reactivateDriver(
  driverId: string, notes?: string
): Promise<{ error?: string }> {
  try {
    await apiFetch<null>(`/api/v1/drivers/admin/${driverId}/reactivate`, {
      method: 'PATCH',
      body: JSON.stringify({ notes }),
      token: await token(),
    })
    revalidatePath('/dashboard/partners/drivers')
    revalidatePath(`/dashboard/partners/drivers/${driverId}`)
    return {}
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to reactivate driver.' }
  }
}

export async function updateDriverDocuments(
  driverId: string,
  data: Partial<Record<'profilePhoto' | 'driversLicenseFront' | 'driversLicenseBack' | 'vehiclePhoto' | 'vehicleRegistration' | 'insuranceDocument', string | null>>
): Promise<{ data?: Omit<DriverDetail['documents'], 'backgroundCheckConsent'>; error?: string }> {
  try {
    const res = await apiFetch<Omit<DriverDetail['documents'], 'backgroundCheckConsent'>>(
      `/api/v1/drivers/admin/${driverId}/documents`,
      { method: 'PATCH', body: JSON.stringify(data), token: await token() }
    )
    return { data: res }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to update documents.' }
  }
}
