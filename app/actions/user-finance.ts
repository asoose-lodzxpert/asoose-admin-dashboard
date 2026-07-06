'use server'

import { cookies } from 'next/headers'
import { apiFetch, ApiError } from '@/app/lib/api'
import type { UserBankAccount, UserWallet, PayoutSummary, Pagination } from '@/app/lib/types'

async function token() {
  return (await cookies()).get('access_token')?.value ?? ''
}

export async function getUserWallet(
  userId: string
): Promise<{ data?: UserWallet; error?: string }> {
  try {
    const data = await apiFetch<UserWallet>(
      `/api/v1/admin/finance/users/${userId}/wallet`,
      { token: await token() }
    )
    return { data }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to fetch wallet.' }
  }
}

export async function adjustUserWallet(
  userId: string,
  payload: { direction: 'CREDIT' | 'DEBIT'; amount: number; reason: string }
): Promise<{ data?: UserWallet; error?: string }> {
  try {
    const data = await apiFetch<UserWallet>(`/api/v1/admin/finance/users/${userId}/wallet`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
      token: await token(),
    })
    return { data }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to adjust wallet.' }
  }
}

export async function getUserBankAccounts(
  userId: string
): Promise<{ data?: UserBankAccount[]; error?: string }> {
  try {
    const data = await apiFetch<UserBankAccount[]>(
      `/api/v1/admin/finance/users/${userId}/bank-accounts`,
      { token: await token() }
    )
    return { data: data ?? [] }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to fetch bank accounts.' }
  }
}

export async function resolveUserBankAccount(
  accountNumber: string,
  bankCode: string
): Promise<{ data?: { accountNumber: string; accountName: string; bankCode: string }; error?: string }> {
  try {
    const data = await apiFetch<{ accountNumber: string; accountName: string; bankCode: string }>(
      `/api/v1/admin/finance/bank-accounts/resolve?accountNumber=${encodeURIComponent(accountNumber)}&bankCode=${encodeURIComponent(bankCode)}`,
      { token: await token() }
    )
    return { data }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to resolve account.' }
  }
}

export async function addUserBankAccount(
  userId: string,
  body: { accountNumber: string; accountName: string; bankCode: string; bankName: string }
): Promise<{ data?: UserBankAccount; error?: string }> {
  try {
    const data = await apiFetch<UserBankAccount>(
      `/api/v1/admin/finance/users/${userId}/bank-accounts`,
      { method: 'POST', body: JSON.stringify(body), token: await token() }
    )
    return { data }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to add bank account.' }
  }
}

interface PayoutsResponse {
  payouts: PayoutSummary[]
  pagination: Pagination
}

export async function getUserPayouts(
  userId: string,
  params?: { page?: number; limit?: number }
): Promise<PayoutsResponse> {
  try {
    const q = new URLSearchParams()
    q.set('page', String(params?.page ?? 1))
    q.set('limit', String(params?.limit ?? 20))
    const res = await apiFetch<PayoutsResponse>(
      `/api/v1/admin/finance/users/${userId}/payouts?${q}`,
      { token: await token() }
    )
    return {
      payouts: res?.payouts ?? [],
      pagination: res?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
    }
  } catch {
    return { payouts: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
  }
}

export async function requestUserPayout(
  userId: string,
  amount: number
): Promise<{ error?: string }> {
  try {
    await apiFetch<unknown>(
      `/api/v1/admin/finance/users/${userId}/payouts/request`,
      { method: 'POST', body: JSON.stringify({ amount }), token: await token() }
    )
    return {}
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to request payout.' }
  }
}
