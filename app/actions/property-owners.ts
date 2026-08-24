'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { apiFetch, ApiError } from '@/app/lib/api'
import type { Pagination, PropertyOwnerDetail, PropertyOwnerSummary } from '@/app/lib/types'

async function token() {
  const store = await cookies()
  return store.get('access_token')?.value ?? ''
}

interface PropertyOwnerListResponse {
  propertyOwners: PropertyOwnerSummary[]
  pagination: Pagination
}

const EMPTY_LIST: PropertyOwnerListResponse = {
  propertyOwners: [],
  pagination: { page: 1, limit: 20, total: 0, totalPages: 0 },
}

export async function getPropertyOwners(params?: {
  page?: number
  limit?: number
  search?: string
  isVerified?: boolean
}): Promise<PropertyOwnerListResponse> {
  try {
    const query = new URLSearchParams({
      page: String(params?.page ?? 1),
      limit: String(params?.limit ?? 20),
    })
    if (params?.search) query.set('search', params.search)
    if (params?.isVerified !== undefined) query.set('isVerified', String(params.isVerified))

    return await apiFetch<PropertyOwnerListResponse>(
      `/api/v1/property-owners/admin?${query}`,
      { token: await token() }
    )
  } catch {
    return EMPTY_LIST
  }
}

export async function getPropertyOwnerDetail(
  propertyOwnerId: string
): Promise<PropertyOwnerDetail | null> {
  try {
    return await apiFetch<PropertyOwnerDetail>(
      `/api/v1/property-owners/admin/${propertyOwnerId}`,
      { token: await token() }
    )
  } catch {
    return null
  }
}

export async function adjustPropertyOwnerCommission(
  propertyOwnerId: string,
  payload: { commissionPercent: number | null }
): Promise<{ propertyOwner?: PropertyOwnerDetail; error?: string }> {
  try {
    const propertyOwner = await apiFetch<PropertyOwnerDetail>(
      `/api/v1/property-owners/admin/${propertyOwnerId}/commission`,
      {
        method: 'PATCH',
        body: JSON.stringify(payload),
        token: await token(),
      }
    )
    revalidatePath('/dashboard/partners/property-owners')
    revalidatePath(`/dashboard/partners/property-owners/${propertyOwnerId}`)
    return { propertyOwner }
  } catch (err) {
    return {
      error: err instanceof ApiError ? err.message : 'Failed to update property owner commission.',
    }
  }
}

export interface PropertyOwnerPasswordResetResult {
  temporaryPassword: string
  emailSent: boolean
}

export async function resetPropertyOwnerPassword(
  propertyOwnerId: string
): Promise<{ data?: PropertyOwnerPasswordResetResult; error?: string }> {
  try {
    const data = await apiFetch<PropertyOwnerPasswordResetResult>(
      `/api/v1/property-owners/admin/${propertyOwnerId}/reset-password`,
      { method: 'POST', token: await token() }
    )
    return { data }
  } catch (err) {
    return {
      error: err instanceof ApiError ? err.message : 'Failed to reset property owner password.',
    }
  }
}
