'use server'

import { cookies } from 'next/headers'
import { apiFetch } from '@/app/lib/api'
import type { PaystackTransaction, PaystackStatus } from '@/app/lib/types'

async function token() {
  return (await cookies()).get('access_token')?.value ?? ''
}

interface PaystackPagination {
  total: number
  page: number
  pageCount: number
  perPage: number
}

interface PaystackListResponse {
  transactions: PaystackTransaction[]
  pagination: PaystackPagination
}

export async function getPaystackTransactions(params?: {
  status?: PaystackStatus | ''
  page?: number
  perPage?: number
  from?: string
  to?: string
}): Promise<PaystackListResponse> {
  try {
    const q = new URLSearchParams()
    q.set('page', String(params?.page ?? 1))
    q.set('perPage', String(params?.perPage ?? 20))
    if (params?.status) q.set('status', params.status)
    if (params?.from) q.set('from', params.from)
    if (params?.to) q.set('to', params.to)
    const res = await apiFetch<PaystackListResponse>(
      `/api/v1/admin/finance/paystack?${q}`,
      { token: await token() }
    )
    return {
      transactions: res?.transactions ?? [],
      pagination: res?.pagination ?? { total: 0, page: 1, pageCount: 0, perPage: 20 },
    }
  } catch {
    return { transactions: [], pagination: { total: 0, page: 1, pageCount: 0, perPage: 20 } }
  }
}
