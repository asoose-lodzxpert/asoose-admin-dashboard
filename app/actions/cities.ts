'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { apiFetch, ApiError } from '@/app/lib/api'
import type { City, PopularRoute, CityPricing, ParcelPricing } from '@/app/lib/types'

type ActionResult<T> = { data: T; error?: never } | { error: string; data?: never }

async function token() {
  const store = await cookies()
  return store.get('access_token')?.value ?? ''
}

export async function getCities(): Promise<City[]> {
  try {
    const result = await apiFetch<unknown>('/api/v1/locations', { token: await token() })
    if (Array.isArray(result)) return result as City[]
    return []
  } catch { return [] }
}

export async function createCity(payload: {
  name: string
  state: string
  boundary: number[][]
}): Promise<ActionResult<City>> {
  try {
    const data = await apiFetch<City>('/api/v1/locations', {
      method: 'POST',
      body: JSON.stringify(payload),
      token: await token(),
    })
    revalidatePath('/dashboard/cities')
    return { data }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to create city.' }
  }
}

export async function setCityActive(id: string, isActive: boolean): Promise<ActionResult<City>> {
  try {
    const data = await apiFetch<City>(`/api/v1/locations/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ isActive }),
      token: await token(),
    })
    revalidatePath('/dashboard/cities')
    return { data }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to update city status.' }
  }
}

export async function getPopularRoutes(cityId: string): Promise<PopularRoute[]> {
  try {
    const result = await apiFetch<unknown>(`/api/v1/locations/${cityId}/popular-routes`, { token: await token() })
    if (Array.isArray(result)) return result as PopularRoute[]
    return []
  } catch { return [] }
}

export async function createPopularRoute(
  cityId: string,
  payload: { name: string; latitude: number; longitude: number; maxRadiusKm: number; maxDistanceKm: number; fixedPrice: number }
): Promise<ActionResult<PopularRoute>> {
  try {
    const data = await apiFetch<PopularRoute>(`/api/v1/locations/${cityId}/popular-routes`, {
      method: 'POST',
      body: JSON.stringify(payload),
      token: await token(),
    })
    revalidatePath('/dashboard/locations')
    return { data }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to create popular route.' }
  }
}

export async function getCityPricing(cityId: string): Promise<CityPricing | null> {
  try {
    return await apiFetch<CityPricing>(`/api/v1/locations/${cityId}/pricing`, { token: await token() })
  } catch { return null }
}

export async function updateCityPricing(
  cityId: string,
  payload: {
    baseFare: number; perKmRate: number; minFare: number; maxFare: number
    serviceFeePercent: number; serviceFeeMin: number; serviceFeeMax: number
    vatPercent: number; commissionPercent: number
  }
): Promise<ActionResult<CityPricing>> {
  try {
    const data = await apiFetch<CityPricing>(`/api/v1/locations/${cityId}/pricing`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      token: await token(),
    })
    revalidatePath('/dashboard/locations')
    return { data }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to update city pricing.' }
  }
}

export async function deletePopularRoute(cityId: string, routeId: string): Promise<{ error?: string }> {
  try {
    const t = await token()
    const res = await fetch(`${process.env.API_BASE_URL}/api/v1/locations/${cityId}/popular-routes/${routeId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { error: (body as { message?: string }).message ?? 'Failed to delete popular route.' }
    }
    revalidatePath('/dashboard/locations')
    return {}
  } catch {
    return { error: 'Failed to delete popular route.' }
  }
}

export async function getParcelPricing(cityId: string): Promise<ParcelPricing | null> {
  try {
    return await apiFetch<ParcelPricing>(`/api/v1/locations/${cityId}/parcel-pricing`, { token: await token() })
  } catch { return null }
}

export async function updateParcelPricing(
  cityId: string,
  payload: {
    baseFare: number; perKmRate: number; minFare: number; maxFare: number
    smallMultiplier: number; mediumMultiplier: number; largeMultiplier: number
    commissionPercent: number
  }
): Promise<ActionResult<ParcelPricing>> {
  try {
    const data = await apiFetch<ParcelPricing>(`/api/v1/locations/${cityId}/parcel-pricing`, {
      method: 'PUT',
      body: JSON.stringify(payload),
      token: await token(),
    })
    revalidatePath('/dashboard/locations')
    return { data }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to update parcel pricing.' }
  }
}

export async function deleteCity(id: string): Promise<{ error?: string }> {
  try {
    const t = await token()
    const res = await fetch(`${process.env.API_BASE_URL}/api/v1/locations/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${t}`, 'Content-Type': 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      return { error: (body as { message?: string }).message ?? 'Failed to delete city.' }
    }
    revalidatePath('/dashboard/cities')
    return {}
  } catch {
    return { error: 'Failed to delete city.' }
  }
}
