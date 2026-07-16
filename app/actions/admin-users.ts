'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { apiFetch, ApiError } from '@/app/lib/api'
import type { Pagination, UserStatus } from '@/app/lib/types'

async function token() {
  const store = await cookies()
  return store.get('access_token')?.value ?? ''
}

export type AdminRole = 'ADMIN' | 'ADMIN_FINANCE' | 'ADMIN_SUPPORT' | 'ADMIN_MANAGER'
export type AnyAdminRole = AdminRole | 'SUPER_ADMIN'

export interface AdminUser {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string | null
  role: AnyAdminRole
  status: UserStatus
  isActive: boolean
  emailVerified: boolean
  phoneVerified: boolean
  authProvider: string
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ProvisionedAdmin {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string | null
  role: AdminRole
  status: string
  emailVerified: boolean
  isActive: boolean
  authProvider: string
  walletBalance: number
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ProvisionResult {
  user: ProvisionedAdmin
  temporaryPassword: string
}

export async function getAdmins(params?: {
  role?: AnyAdminRole | ''
  status?: UserStatus | ''
  search?: string
  page?: number
  limit?: number
}): Promise<{ admins: AdminUser[]; pagination: Pagination }> {
  try {
    const q = new URLSearchParams()
    q.set('page', String(params?.page ?? 1))
    q.set('limit', String(params?.limit ?? 20))
    if (params?.role) q.set('role', params.role)
    if (params?.status) q.set('status', params.status)
    if (params?.search) q.set('search', params.search)
    const result = await apiFetch<{ users: AdminUser[]; pagination: Pagination }>(
      `/api/v1/users/admins?${q}`, { token: await token() }
    )
    return { admins: result?.users ?? [], pagination: result?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 } }
  } catch {
    return { admins: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
  }
}

export async function provisionAdmin(payload: {
  email: string
  firstName: string
  lastName: string
  phone?: string
  role: AdminRole
}): Promise<{ data?: ProvisionResult; error?: string }> {
  try {
    const data = await apiFetch<ProvisionResult>('/api/v1/users/provision', {
      method: 'POST',
      body: JSON.stringify(payload),
      token: await token(),
    })
    revalidatePath('/dashboard/admin-users')
    return { data: data! }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to provision admin.' }
  }
}

export async function deactivateAdmin(
  adminId: string,
  reason?: string
): Promise<{ data?: AdminUser; error?: string }> {
  try {
    const data = await apiFetch<AdminUser>(`/api/v1/users/${adminId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'DEACTIVATED', ...(reason ? { reason } : {}) }),
      token: await token(),
    })
    revalidatePath('/dashboard/admin-users')
    return { data: data! }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to deactivate admin.' }
  }
}
