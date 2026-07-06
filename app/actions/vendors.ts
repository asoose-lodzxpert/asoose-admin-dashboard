'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { apiFetch, ApiError } from '@/app/lib/api'
import type { VendorSummary, VendorDetail, VendorStoreDetail, Product, Pagination, UserWallet } from '@/app/lib/types'

type StoreUpdateData = Partial<{
  name: string
  description: string | null
  address: string
  status: VendorStoreDetail['status']
  isOpen: boolean
  preparationTime: number | null
  minOrder: number | null
  deliveryFee: number | null
}>

type ProductMutationData = Record<string, unknown>

async function token() {
  const store = await cookies()
  return store.get('access_token')?.value ?? ''
}

interface ListResponse {
  vendors: VendorSummary[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}

export async function getVendors(params?: {
  search?: string
  verificationStatus?: string
  page?: number
  limit?: number
}): Promise<ListResponse> {
  try {
    const q = new URLSearchParams()
    q.set('page', String(params?.page ?? 1))
    q.set('limit', String(params?.limit ?? 20))
    if (params?.search) q.set('search', params.search)
    if (params?.verificationStatus) q.set('verificationStatus', params.verificationStatus)
    return await apiFetch<ListResponse>(`/api/v1/vendors/admin?${q}`, { token: await token() })
  } catch {
    return { vendors: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
  }
}

export async function getVendorDetail(vendorId: string): Promise<VendorDetail | null> {
  try {
    const result = await apiFetch<unknown>(`/api/v1/vendors/admin/${vendorId}`, { token: await token() })
    if (!result || typeof result !== 'object') return null
    const obj = result as Record<string, unknown>
    if ('id' in obj) return obj as unknown as VendorDetail
    return (obj.vendor ?? obj.data) as VendorDetail ?? null
  } catch { return null }
}

export async function getVendorProducts(
  vendorId: string,
  params?: { page?: number; limit?: number; search?: string; categoryId?: string; isAvailable?: boolean }
): Promise<{ products: Product[]; pagination: Pagination }> {
  try {
    const q = new URLSearchParams()
    q.set('page', String(params?.page ?? 1))
    q.set('limit', String(params?.limit ?? 20))
    if (params?.search) q.set('search', params.search)
    if (params?.categoryId) q.set('categoryId', params.categoryId)
    if (params?.isAvailable != null) q.set('isAvailable', String(params.isAvailable))
    const result = await apiFetch<{ products: Product[]; pagination: Pagination }>(
      `/api/v1/vendors/admin/${vendorId}/products?${q}`,
      { token: await token() }
    )
    return result ?? { products: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
  } catch {
    return { products: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
  }
}

export async function approveVendor(vendorId: string): Promise<{ error?: string }> {
  try {
    await apiFetch<null>(`/api/v1/vendors/admin/${vendorId}/approve`, {
      method: 'PATCH', token: await token(),
    })
    revalidatePath('/dashboard/ecommerce')
    return {}
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to approve vendor.' }
  }
}

export async function rejectVendor(
  vendorId: string, reason?: string
): Promise<{ error?: string }> {
  try {
    await apiFetch<null>(`/api/v1/vendors/admin/${vendorId}/reject`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
      token: await token(),
    })
    revalidatePath('/dashboard/ecommerce')
    return {}
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to reject vendor.' }
  }
}

export async function suspendVendor(
  vendorId: string, reason?: string
): Promise<{ error?: string }> {
  try {
    await apiFetch<null>(`/api/v1/vendors/admin/${vendorId}/suspend`, {
      method: 'PATCH',
      body: JSON.stringify({ reason }),
      token: await token(),
    })
    revalidatePath('/dashboard/ecommerce')
    return {}
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to suspend vendor.' }
  }
}

export async function updateVendorStore(
  vendorId: string,
  data: StoreUpdateData
): Promise<{ store?: VendorStoreDetail; error?: string }> {
  try {
    const store = await apiFetch<VendorStoreDetail>(
      `/api/v1/vendors/admin/${vendorId}/store`,
      { method: 'PATCH', body: JSON.stringify(data), token: await token() }
    )
    revalidatePath(`/dashboard/partners/vendors/${vendorId}`)
    return { store }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to update store.' }
  }
}

export async function createProduct(
  vendorId: string,
  data: ProductMutationData
): Promise<{ product?: Product; error?: string }> {
  try {
    const product = await apiFetch<Product>(
      `/api/v1/vendors/admin/${vendorId}/products`,
      { method: 'POST', body: JSON.stringify(data), token: await token() }
    )
    return { product }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to create product.' }
  }
}

export async function updateProduct(
  vendorId: string,
  productId: string,
  data: ProductMutationData
): Promise<{ product?: Product; error?: string }> {
  try {
    const product = await apiFetch<Product>(
      `/api/v1/vendors/admin/${vendorId}/products/${productId}`,
      { method: 'PATCH', body: JSON.stringify(data), token: await token() }
    )
    return { product }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to update product.' }
  }
}

export async function deleteProduct(
  vendorId: string,
  productId: string
): Promise<{ error?: string }> {
  try {
    await apiFetch<unknown>(
      `/api/v1/vendors/admin/${vendorId}/products/${productId}`,
      { method: 'DELETE', token: await token() }
    )
    return {}
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to delete product.' }
  }
}

export async function assignVendorCity(
  vendorId: string,
  cityId: string
): Promise<{ error?: string }> {
  try {
    await apiFetch<unknown>(`/api/v1/vendors/admin/${vendorId}/assign-city`, {
      method: 'PATCH',
      body: JSON.stringify({ cityId }),
      token: await token(),
    })
    revalidatePath(`/dashboard/partners/vendors/${vendorId}`)
    return {}
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to assign city.' }
  }
}

export async function adjustVendorWallet(
  vendorId: string,
  payload: { direction: 'CREDIT' | 'DEBIT'; amount: number; reason: string }
): Promise<{ data?: UserWallet; error?: string }> {
  try {
    const data = await apiFetch<UserWallet>(`/api/v1/vendors/admin/${vendorId}/wallet`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      token: await token(),
    })
    return { data }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to adjust wallet.' }
  }
}

export async function updateVendorDocuments(
  vendorId: string,
  data: Partial<Record<'businessLicenseFile' | 'foodPermitFile' | 'taxDocumentFile' | 'idDocumentFile', string | null>>
): Promise<{ data?: VendorDetail['documents']; error?: string }> {
  try {
    const res = await apiFetch<VendorDetail['documents']>(
      `/api/v1/vendors/admin/${vendorId}/documents`,
      { method: 'PATCH', body: JSON.stringify(data), token: await token() }
    )
    return { data: res }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to update documents.' }
  }
}
