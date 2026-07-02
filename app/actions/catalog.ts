'use server'

import { cookies } from 'next/headers'
import { apiFetch, ApiError } from '@/app/lib/api'
import type { CatalogItem, CatalogPagination } from '@/app/lib/types'

async function token() {
  const store = await cookies()
  return store.get('access_token')?.value ?? ''
}

interface RawResponse {
  items: CatalogItem[]
  page: number
  limit: number
  total: number
  totalPages: number
}

export async function getCatalogProducts(params?: {
  page?: number
  limit?: number
  search?: string
  type?: 'PRODUCT' | 'MENU_ITEM' | ''
  isFeatured?: 'true' | 'false' | ''
}): Promise<{ items: CatalogItem[]; pagination: CatalogPagination }> {
  try {
    const q = new URLSearchParams()
    q.set('page', String(params?.page ?? 1))
    q.set('limit', String(params?.limit ?? 20))
    if (params?.search) q.set('search', params.search)
    if (params?.type) q.set('type', params.type)
    if (params?.isFeatured) q.set('isFeatured', params.isFeatured)
    const raw = await apiFetch<RawResponse>(`/api/v1/catalog/admin/products?${q}`, {
      token: await token(),
    })
    return {
      items: raw?.items ?? [],
      pagination: {
        page: raw?.page ?? 1,
        limit: raw?.limit ?? 20,
        total: raw?.total ?? 0,
        totalPages: raw?.totalPages ?? 0,
      },
    }
  } catch {
    return { items: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
  }
}

export async function toggleCatalogFeatured(
  productId: string
): Promise<{ data?: { id: string; isFeatured: boolean }; error?: string }> {
  try {
    const data = await apiFetch<{ id: string; isFeatured: boolean }>(
      `/api/v1/catalog/admin/products/${productId}/toggle-featured`,
      { method: 'PATCH', token: await token() }
    )
    return { data }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to update featured status.' }
  }
}
