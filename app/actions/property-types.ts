'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { apiFetch, ApiError } from '@/app/lib/api'
import type { PropertyType } from '@/app/lib/types'

async function token() {
  const store = await cookies()
  return store.get('access_token')?.value ?? ''
}

type ActionResult<T> = { data: T; error?: never } | { error: string; data?: never }

export async function getPropertyTypes(): Promise<PropertyType[]> {
  try {
    const result = await apiFetch<{ propertyTypes: PropertyType[] }>(
      '/api/v1/property-types/admin?page=1&limit=100&includeInactive=true',
      { token: await token() }
    )
    return result?.propertyTypes ?? []
  } catch { return [] }
}

export async function createPropertyType(
  payload: Record<string, unknown>
): Promise<ActionResult<PropertyType>> {
  try {
    const data = await apiFetch<PropertyType>('/api/v1/property-types', {
      method: 'POST', body: JSON.stringify(payload), token: await token(),
    })
    revalidatePath('/dashboard/property-types')
    return { data }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to create property type.' }
  }
}

export async function updatePropertyType(
  id: string, payload: Record<string, unknown>
): Promise<ActionResult<PropertyType>> {
  try {
    const data = await apiFetch<PropertyType>(`/api/v1/property-types/${id}`, {
      method: 'PATCH', body: JSON.stringify(payload), token: await token(),
    })
    revalidatePath('/dashboard/property-types')
    return { data }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to update property type.' }
  }
}

export async function deletePropertyType(id: string): Promise<{ error?: string }> {
  try {
    await apiFetch<null>(`/api/v1/property-types/${id}`, {
      method: 'DELETE', token: await token(),
    })
    revalidatePath('/dashboard/property-types')
    return {}
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to delete property type.' }
  }
}
