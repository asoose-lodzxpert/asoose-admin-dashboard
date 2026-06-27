'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { apiFetch, ApiError } from '@/app/lib/api'

async function token() {
  const store = await cookies()
  return store.get('access_token')?.value ?? ''
}

export interface AdminProvisionResult {
  userId: string
  email: string
  firstName: string
  lastName: string
  temporaryPassword: string
  emailSent: boolean
  applicationId: string
}

export async function adminProvisionVendor(
  payload: unknown
): Promise<{ data?: AdminProvisionResult; error?: string }> {
  try {
    const data = await apiFetch<AdminProvisionResult>(
      '/api/v1/onboarding/admin-provision/vendor',
      { method: 'POST', body: JSON.stringify(payload), token: await token() }
    )
    revalidatePath('/dashboard/partners/vendors')
    return { data: data! }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to provision vendor.' }
  }
}

export async function adminProvisionRider(
  payload: unknown
): Promise<{ data?: AdminProvisionResult; error?: string }> {
  try {
    const data = await apiFetch<AdminProvisionResult>(
      '/api/v1/onboarding/admin-provision/rider',
      { method: 'POST', body: JSON.stringify(payload), token: await token() }
    )
    revalidatePath('/dashboard/partners/riders')
    return { data: data! }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to provision rider.' }
  }
}

export async function getPublicStoreTypes(): Promise<{
  data?: { id: string; name: string; code: string }[]
  error?: string
}> {
  try {
    const data = await apiFetch<{ storeTypes: { id: string; name: string; code: string }[] }>(
      '/api/v1/store-types/'
    )
    return { data: data!.storeTypes }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to load store types.' }
  }
}

export async function getBanks(): Promise<{
  data?: { name: string; code: string }[]
  error?: string
}> {
  try {
    const data = await apiFetch<{ name: string; code: string }[]>('/api/v1/bank-accounts/banks')
    return { data: data! }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to load banks.' }
  }
}

export async function resolveCity(latitude: number, longitude: number): Promise<{
  data?: { city: { name: string; state: string; country: string | null } | null; serviceAvailable: boolean }
  error?: string
}> {
  try {
    const res = await fetch(`${process.env.API_BASE_URL}/api/v1/locations/resolve-city`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ latitude, longitude }),
      cache: 'no-store',
    })
    if (!res.ok) return { error: 'Failed to resolve city.' }
    const data = await res.json() as { city: { name: string; state: string; country: string | null } | null; serviceAvailable: boolean }
    return { data }
  } catch {
    return { error: 'Failed to resolve city.' }
  }
}

export async function resolveBankAccount(accountNumber: string, bankCode: string): Promise<{
  data?: { accountNumber: string; accountName: string }
  error?: string
}> {
  try {
    const data = await apiFetch<{ accountNumber: string; accountName: string }>(
      `/api/v1/bank-accounts/verify?accountNumber=${encodeURIComponent(accountNumber)}&bankCode=${encodeURIComponent(bankCode)}`,
      { token: await token() }
    )
    return { data: data! }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to verify account.' }
  }
}

export async function adminProvisionDriver(
  payload: unknown
): Promise<{ data?: AdminProvisionResult; error?: string }> {
  try {
    const data = await apiFetch<AdminProvisionResult>(
      '/api/v1/onboarding/admin-provision/driver',
      { method: 'POST', body: JSON.stringify(payload), token: await token() }
    )
    revalidatePath('/dashboard/partners/drivers')
    return { data: data! }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to provision driver.' }
  }
}
