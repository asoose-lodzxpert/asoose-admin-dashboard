'use server'

import { cookies } from 'next/headers'
import { apiFetch, ApiError } from '@/app/lib/api'
import type { FinanceTransactionFilters, FinanceTransactionsResult, FinanceTransactionsData } from '@/app/lib/finance-transactions'
import type { PaystackTransaction, PaystackStatus } from '@/app/lib/types'

async function token() {
  return (await cookies()).get('access_token')?.value ?? ''
}

export async function getFinanceTransactions(params: FinanceTransactionFilters = {}): Promise<FinanceTransactionsResult> {
  try {
    const q = new URLSearchParams()
    const keys = ['userId', 'direction', 'type', 'status', 'channel', 'referenceType', 'referenceId', 'minAmount', 'maxAmount', 'from', 'to', 'search', 'page', 'limit'] as const
    for (const key of keys) {
      const value = params[key]
      if (value !== undefined && value !== '') q.set(key, String(value))
    }
    const data = await apiFetch<FinanceTransactionsData>(`/api/v1/admin/finance/transactions?${q}`, { token: await token() })
    return { data }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Unable to load transactions. Please try again.' }
  }
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
