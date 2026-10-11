'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { apiFetch, ApiError } from '@/app/lib/api'
import { getCurrentUser } from '@/app/lib/auth'

export interface AdminCityOption {
  id: string
  name: string
  state: string
}

export interface AdminCityScope {
  all: boolean
  activeCity: AdminCityOption | null
  cities: AdminCityOption[]
}

const EMPTY_CITY_SCOPE: AdminCityScope = { all: false, activeCity: null, cities: [] }

async function token() {
  const store = await cookies()
  return store.get('access_token')?.value ?? ''
}

async function persistActiveCity(cityId: string | null) {
  await apiFetch<unknown>('/api/v1/admin/me/active-city', {
    method: 'PATCH',
    body: JSON.stringify({ cityId }),
    token: await token(),
  })
}

export async function getAdminCityScope(): Promise<AdminCityScope> {
  try {
    const scope = await apiFetch<AdminCityScope>('/api/v1/admin/me/cities', { token: await token() })
    const defaultCity = !scope.all && !scope.activeCity ? scope.cities[0] : undefined

    if (!defaultCity) return scope

    try {
      await persistActiveCity(defaultCity.id)
      return { ...scope, activeCity: defaultCity }
    } catch {
      return scope
    }
  } catch {
    return EMPTY_CITY_SCOPE
  }
}

export async function setActiveAdminCity(
  cityId: string | null
): Promise<{ data?: AdminCityScope; error?: string }> {
  if ((await getCurrentUser())?.role !== 'SUPER_ADMIN') {
    return { error: 'Unauthorized. Only super admins can change the active city.' }
  }

  if (cityId !== null && (!cityId || typeof cityId !== 'string')) {
    return { error: 'Select a valid city.' }
  }

  try {
    await persistActiveCity(cityId)
    revalidatePath('/dashboard', 'layout')
    return { data: await getAdminCityScope() }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to change the active city.' }
  }
}
