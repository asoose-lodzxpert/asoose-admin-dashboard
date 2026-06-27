'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { apiFetch, ApiError } from '@/app/lib/api'
import type { CustomerSummary, CustomerDetail, UserStatus, UserRole, Pagination } from '@/app/lib/types'

async function token() {
  const store = await cookies()
  return store.get('access_token')?.value ?? ''
}

interface ListResponse {
  customers: CustomerSummary[]
  pagination: Pagination
}

export async function getCustomers(params?: {
  search?: string
  status?: UserStatus | ''
  page?: number
  limit?: number
}): Promise<ListResponse> {
  try {
    const q = new URLSearchParams()
    q.set('role', 'CUSTOMER')
    q.set('page', String(params?.page ?? 1))
    q.set('limit', String(params?.limit ?? 20))
    if (params?.search) q.set('search', params.search)
    if (params?.status) q.set('status', params.status)
    const result = await apiFetch<{ users: CustomerSummary[]; pagination: Pagination }>(
      `/api/v1/users?${q}`, { token: await token() }
    )
    return { customers: result?.users ?? [], pagination: result?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 } }
  } catch {
    return { customers: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
  }
}

export async function getCustomerDetail(userId: string): Promise<CustomerDetail | null> {
  try {
    const result = await apiFetch<CustomerDetail>(`/api/v1/users/${userId}`, { token: await token() })
    return result ?? null
  } catch { return null }
}

export async function updateCustomerStatus(
  userId: string,
  status: UserStatus,
  reason?: string
): Promise<{ data?: CustomerDetail; error?: string }> {
  try {
    const data = await apiFetch<CustomerDetail>(`/api/v1/users/${userId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, ...(reason ? { reason } : {}) }),
      token: await token(),
    })
    revalidatePath('/dashboard/customers')
    return { data }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to update status.' }
  }
}

export async function updateCustomerRole(
  userId: string,
  role: UserRole
): Promise<{ data?: CustomerDetail; error?: string }> {
  try {
    const data = await apiFetch<CustomerDetail>(`/api/v1/users/${userId}/role`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
      token: await token(),
    })
    revalidatePath('/dashboard/customers')
    return { data }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to update role.' }
  }
}
