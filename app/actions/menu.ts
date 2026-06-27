'use server'

import { cookies } from 'next/headers'
import { apiFetch, ApiError } from '@/app/lib/api'
import type { VendorMenu, MenuItem } from '@/app/lib/types'

async function token() {
  const store = await cookies()
  return store.get('access_token')?.value ?? ''
}

export async function getVendorMenu(restaurantId: string): Promise<VendorMenu | null> {
  try {
    return await apiFetch<VendorMenu>(`/api/v1/menu/admin/vendor/${restaurantId}`, {
      token: await token(),
    })
  } catch { return null }
}

export async function createDish(
  restaurantId: string,
  data: Record<string, unknown>
): Promise<{ dish?: MenuItem; error?: string }> {
  try {
    const dish = await apiFetch<MenuItem>(
      `/api/v1/menu/admin/vendor/${restaurantId}`,
      { method: 'POST', body: JSON.stringify(data), token: await token() }
    )
    return { dish }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to create dish.' }
  }
}

export async function updateDish(
  itemId: string,
  data: Record<string, unknown>
): Promise<{ dish?: MenuItem; error?: string }> {
  try {
    const dish = await apiFetch<MenuItem>(
      `/api/v1/menu/admin/${itemId}`,
      { method: 'PATCH', body: JSON.stringify(data), token: await token() }
    )
    return { dish }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to update dish.' }
  }
}

export async function deleteDish(itemId: string): Promise<{ error?: string }> {
  try {
    await apiFetch<unknown>(`/api/v1/menu/admin/${itemId}`, {
      method: 'DELETE', token: await token(),
    })
    return {}
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to delete dish.' }
  }
}

export async function addDishOption(
  itemId: string,
  data: Record<string, unknown>
): Promise<{ error?: string }> {
  try {
    await apiFetch<unknown>(
      `/api/v1/menu/admin/${itemId}/options`,
      { method: 'POST', body: JSON.stringify(data), token: await token() }
    )
    return {}
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to add option group.' }
  }
}

export async function toggleDishAvailability(
  itemId: string,
  isAvailable: boolean
): Promise<{ dish?: MenuItem; error?: string }> {
  try {
    const dish = await apiFetch<MenuItem>(
      `/api/v1/menu/admin/${itemId}/toggle-availability`,
      { method: 'PATCH', body: JSON.stringify({ isAvailable }), token: await token() }
    )
    return { dish }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to toggle availability.' }
  }
}
