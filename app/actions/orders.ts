'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { apiFetch, ApiError } from '@/app/lib/api'
import type { OrderSummary, OrderDetail, OrderStatus, Pagination } from '@/app/lib/types'

async function token() {
  return (await cookies()).get('access_token')?.value ?? ''
}

interface ListResponse {
  orders: OrderSummary[]
  pagination: Pagination
}

export async function getOrders(params?: {
  status?: OrderStatus | ''
  search?: string
  page?: number
  limit?: number
}): Promise<ListResponse> {
  try {
    const q = new URLSearchParams()
    q.set('page', String(params?.page ?? 1))
    q.set('limit', String(params?.limit ?? 20))
    if (params?.status) q.set('status', params.status)
    if (params?.search) q.set('search', params.search)
    const res = await apiFetch<{ orders: OrderSummary[]; pagination: Pagination }>(
      `/api/v1/orders/admin?${q}`,
      { token: await token() }
    )
    return {
      orders: res?.orders ?? [],
      pagination: res?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
    }
  } catch {
    return { orders: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
  }
}

export async function getOrderDetail(orderId: string): Promise<OrderDetail | null> {
  try {
    const result = await apiFetch<Record<string, unknown>>(`/api/v1/orders/admin/${orderId}`, {
      token: await token(),
    })
    if (!result) return null
    // The API may return some nested fields as JSON strings — parse them
    for (const key of ['customer', 'items'] as const) {
      if (typeof result[key] === 'string') {
        try { result[key] = JSON.parse(result[key] as string) } catch { /* leave as-is */ }
      }
    }
    return result as unknown as OrderDetail
  } catch {
    return null
  }
}

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  reason?: string
): Promise<{ data?: OrderDetail; error?: string }> {
  try {
    const data = await apiFetch<OrderDetail>(`/api/v1/orders/admin/${orderId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, ...(reason ? { reason } : {}) }),
      token: await token(),
    })
    revalidatePath('/dashboard/orders')
    revalidatePath(`/dashboard/orders/${orderId}`)
    return { data }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to update order status.' }
  }
}

export async function assignRiderToOrder(
  deliveryId: string,
  riderId: string
): Promise<{ error?: string }> {
  try {
    await apiFetch<unknown>(`/api/v1/admin/ops/deliveries/${deliveryId}/assign-rider`, {
      method: 'POST',
      body: JSON.stringify({ riderId }),
      token: await token(),
    })
    revalidatePath('/dashboard/orders')
    return {}
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to assign rider.' }
  }
}
