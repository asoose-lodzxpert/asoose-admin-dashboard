'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { apiFetch, ApiError } from '@/app/lib/api'
import type { PropertySummary, PropertyDetail, RoomType, Pagination } from '@/app/lib/types'

type MutationData = Record<string, unknown>

async function token() {
  const store = await cookies()
  return store.get('access_token')?.value ?? ''
}

interface ListResponse {
  properties: PropertySummary[]
  pagination: Pagination
}

export async function getProperties(params?: {
  search?: string
  page?: number
  limit?: number
}): Promise<ListResponse> {
  try {
    const q = new URLSearchParams()
    q.set('page', String(params?.page ?? 1))
    q.set('limit', String(params?.limit ?? 20))
    if (params?.search) q.set('search', params.search)
    return await apiFetch<ListResponse>(`/api/v1/properties/admin?${q}`, { token: await token() })
  } catch {
    return { properties: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
  }
}

export async function getPropertyDetail(propertyId: string): Promise<PropertyDetail | null> {
  try {
    const result = await apiFetch<unknown>(`/api/v1/properties/admin/${propertyId}`, { token: await token() })
    if (!result || typeof result !== 'object') return null
    const obj = result as Record<string, unknown>
    if ('id' in obj) return obj as unknown as PropertyDetail
    return (obj.property ?? obj.data) as PropertyDetail ?? null
  } catch { return null }
}

export async function createProperty(
  data: MutationData
): Promise<{ property?: PropertyDetail; error?: string }> {
  try {
    const property = await apiFetch<PropertyDetail>('/api/v1/properties/admin', {
      method: 'POST', body: JSON.stringify(data), token: await token(),
    })
    revalidatePath('/dashboard/properties')
    return { property }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to create property.' }
  }
}

export async function updateProperty(
  propertyId: string,
  data: MutationData
): Promise<{ property?: PropertyDetail; error?: string }> {
  try {
    const property = await apiFetch<PropertyDetail>(`/api/v1/properties/admin/${propertyId}`, {
      method: 'PATCH', body: JSON.stringify(data), token: await token(),
    })
    revalidatePath('/dashboard/properties')
    revalidatePath(`/dashboard/properties/${propertyId}`)
    return { property }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to update property.' }
  }
}

export async function publishProperty(propertyId: string): Promise<{ property?: PropertyDetail; error?: string }> {
  try {
    const property = await apiFetch<PropertyDetail>(`/api/v1/properties/admin/${propertyId}/publish`, {
      method: 'PATCH', token: await token(),
    })
    revalidatePath('/dashboard/properties')
    revalidatePath(`/dashboard/properties/${propertyId}`)
    return { property }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to publish property.' }
  }
}

export async function suspendProperty(propertyId: string): Promise<{ property?: PropertyDetail; error?: string }> {
  try {
    const property = await apiFetch<PropertyDetail>(`/api/v1/properties/admin/${propertyId}/suspend`, {
      method: 'PATCH', token: await token(),
    })
    revalidatePath('/dashboard/properties')
    revalidatePath(`/dashboard/properties/${propertyId}`)
    return { property }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to suspend property.' }
  }
}

export async function deleteProperty(propertyId: string): Promise<{ error?: string }> {
  try {
    await apiFetch<unknown>(`/api/v1/properties/admin/${propertyId}`, {
      method: 'DELETE', token: await token(),
    })
    revalidatePath('/dashboard/properties')
    return {}
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to delete property.' }
  }
}

export async function createRoomType(
  propertyId: string,
  data: MutationData
): Promise<{ roomType?: RoomType; error?: string }> {
  try {
    const roomType = await apiFetch<RoomType>(
      `/api/v1/properties/admin/${propertyId}/room-types`,
      { method: 'POST', body: JSON.stringify(data), token: await token() }
    )
    return { roomType }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to create room type.' }
  }
}

export async function updateRoomType(
  propertyId: string,
  roomTypeId: string,
  data: MutationData
): Promise<{ roomType?: RoomType; error?: string }> {
  try {
    const roomType = await apiFetch<RoomType>(
      `/api/v1/properties/admin/${propertyId}/room-types/${roomTypeId}`,
      { method: 'PATCH', body: JSON.stringify(data), token: await token() }
    )
    return { roomType }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to update room type.' }
  }
}

export async function deleteRoomType(
  propertyId: string,
  roomTypeId: string
): Promise<{ error?: string }> {
  try {
    await apiFetch<unknown>(
      `/api/v1/properties/admin/${propertyId}/room-types/${roomTypeId}`,
      { method: 'DELETE', token: await token() }
    )
    return {}
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to delete room type.' }
  }
}
