'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { apiFetch, ApiError } from '@/app/lib/api'
import type { VehicleType, VehicleBrand, StoreType, Cuisine, Category } from '@/app/lib/types'

async function token() {
  const store = await cookies()
  return store.get('access_token')?.value ?? ''
}

type ActionResult<T> = { data: T; error?: never } | { error: string; data?: never }

function pluckArray<T>(result: unknown, key: string): T[] {
  if (Array.isArray(result)) return result as T[]
  if (result && typeof result === 'object') {
    const obj = result as Record<string, unknown>
    const arr = obj[key] ?? obj.items ?? obj.data
    if (Array.isArray(arr)) return arr as T[]
  }
  return []
}

/* ─── Vehicle Types ──────────────────────────────────────── */

export async function getVehicleTypes(): Promise<VehicleType[]> {
  try {
    const result = await apiFetch<unknown>('/api/v1/vehicle-types/admin', { token: await token() })
    return pluckArray<VehicleType>(result, 'vehicleTypes')
  } catch { return [] }
}

export async function createVehicleType(
  payload: Record<string, unknown>
): Promise<ActionResult<VehicleType>> {
  try {
    const data = await apiFetch<VehicleType>('/api/v1/vehicle-types/admin', {
      method: 'POST', body: JSON.stringify(payload), token: await token(),
    })
    revalidatePath('/dashboard/configurations')
    return { data }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to create vehicle type.' }
  }
}

export async function updateVehicleType(
  id: string, payload: Record<string, unknown>
): Promise<ActionResult<VehicleType>> {
  try {
    const data = await apiFetch<VehicleType>(`/api/v1/vehicle-types/admin/${id}`, {
      method: 'PATCH', body: JSON.stringify(payload), token: await token(),
    })
    revalidatePath('/dashboard/configurations')
    return { data }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to update vehicle type.' }
  }
}

export async function deleteVehicleType(id: string): Promise<{ error?: string }> {
  try {
    await apiFetch<null>(`/api/v1/vehicle-types/admin/${id}`, {
      method: 'DELETE', token: await token(),
    })
    revalidatePath('/dashboard/configurations')
    return {}
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to delete vehicle type.' }
  }
}

/* ─── Vehicle Brands ─────────────────────────────────────── */

export async function getVehicleBrands(): Promise<VehicleBrand[]> {
  try {
    const result = await apiFetch<unknown>('/api/v1/vehicle-brands/admin', { token: await token() })
    return pluckArray<VehicleBrand>(result, 'vehicleBrands')
  } catch { return [] }
}

export async function createVehicleBrand(
  payload: Record<string, unknown>
): Promise<ActionResult<VehicleBrand>> {
  try {
    const data = await apiFetch<VehicleBrand>('/api/v1/vehicle-brands/admin', {
      method: 'POST', body: JSON.stringify(payload), token: await token(),
    })
    revalidatePath('/dashboard/configurations')
    return { data }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to create vehicle brand.' }
  }
}

export async function updateVehicleBrand(
  id: string, payload: Record<string, unknown>
): Promise<ActionResult<VehicleBrand>> {
  try {
    const data = await apiFetch<VehicleBrand>(`/api/v1/vehicle-brands/admin/${id}`, {
      method: 'PATCH', body: JSON.stringify(payload), token: await token(),
    })
    revalidatePath('/dashboard/configurations')
    return { data }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to update vehicle brand.' }
  }
}

export async function deleteVehicleBrand(id: string): Promise<{ error?: string }> {
  try {
    await apiFetch<null>(`/api/v1/vehicle-brands/admin/${id}`, {
      method: 'DELETE', token: await token(),
    })
    revalidatePath('/dashboard/configurations')
    return {}
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to delete vehicle brand.' }
  }
}

/* ─── Store Types ────────────────────────────────────────── */

export async function getStoreTypes(): Promise<StoreType[]> {
  try {
    const result = await apiFetch<unknown>('/api/v1/store-types/admin', { token: await token() })
    return pluckArray<StoreType>(result, 'storeTypes')
  } catch { return [] }
}

export async function createStoreType(
  payload: Record<string, unknown>
): Promise<ActionResult<StoreType>> {
  try {
    const data = await apiFetch<StoreType>('/api/v1/store-types/admin', {
      method: 'POST', body: JSON.stringify(payload), token: await token(),
    })
    revalidatePath('/dashboard/configurations')
    return { data }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to create store type.' }
  }
}

export async function updateStoreType(
  id: string, payload: Record<string, unknown>
): Promise<ActionResult<StoreType>> {
  try {
    const data = await apiFetch<StoreType>(`/api/v1/store-types/admin/${id}`, {
      method: 'PATCH', body: JSON.stringify(payload), token: await token(),
    })
    revalidatePath('/dashboard/configurations')
    return { data }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to update store type.' }
  }
}

export async function deleteStoreType(id: string): Promise<{ error?: string }> {
  try {
    await apiFetch<null>(`/api/v1/store-types/admin/${id}`, {
      method: 'DELETE', token: await token(),
    })
    revalidatePath('/dashboard/configurations')
    return {}
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to delete store type.' }
  }
}

/* ─── Cuisines ───────────────────────────────────────────── */

export async function getCuisines(): Promise<Cuisine[]> {
  try {
    const result = await apiFetch<unknown>('/api/v1/cuisines/admin', { token: await token() })
    return pluckArray<Cuisine>(result, 'cuisines')
  } catch { return [] }
}

export async function createCuisine(
  payload: Record<string, unknown>
): Promise<ActionResult<Cuisine>> {
  try {
    const data = await apiFetch<Cuisine>('/api/v1/cuisines/admin', {
      method: 'POST', body: JSON.stringify(payload), token: await token(),
    })
    revalidatePath('/dashboard/configurations')
    return { data }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to create cuisine.' }
  }
}

export async function updateCuisine(
  id: string, payload: Record<string, unknown>
): Promise<ActionResult<Cuisine>> {
  try {
    const data = await apiFetch<Cuisine>(`/api/v1/cuisines/admin/${id}`, {
      method: 'PATCH', body: JSON.stringify(payload), token: await token(),
    })
    revalidatePath('/dashboard/configurations')
    return { data }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to update cuisine.' }
  }
}

export async function deleteCuisine(id: string): Promise<{ error?: string }> {
  try {
    await apiFetch<null>(`/api/v1/cuisines/admin/${id}`, {
      method: 'DELETE', token: await token(),
    })
    revalidatePath('/dashboard/configurations')
    return {}
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to delete cuisine.' }
  }
}

/* ─── Categories ─────────────────────────────────────────── */

export async function getCategories(): Promise<Category[]> {
  try {
    const result = await apiFetch<unknown>('/api/v1/categories?page=1&limit=100', {
      token: await token(),
    })
    return pluckArray<Category>(result, 'categories')
  } catch { return [] }
}

export async function createCategory(
  payload: Record<string, unknown>
): Promise<ActionResult<Category>> {
  try {
    const data = await apiFetch<Category>('/api/v1/categories', {
      method: 'POST', body: JSON.stringify(payload), token: await token(),
    })
    revalidatePath('/dashboard/configurations')
    return { data }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to create category.' }
  }
}

export async function updateCategory(
  id: string, payload: Record<string, unknown>
): Promise<ActionResult<Category>> {
  try {
    const data = await apiFetch<Category>(`/api/v1/categories/${id}`, {
      method: 'PATCH', body: JSON.stringify(payload), token: await token(),
    })
    revalidatePath('/dashboard/configurations')
    return { data }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to update category.' }
  }
}

export async function deleteCategory(id: string): Promise<{ error?: string }> {
  try {
    await apiFetch<null>(`/api/v1/categories/${id}`, {
      method: 'DELETE', token: await token(),
    })
    revalidatePath('/dashboard/configurations')
    return {}
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to delete category.' }
  }
}
