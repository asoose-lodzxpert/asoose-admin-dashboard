import type { Pagination } from './types'

export const TRANSACTION_TYPES = ['CREDIT', 'DEBIT', 'TRANSFER_IN', 'TRANSFER_OUT', 'REFUND', 'PAYOUT', 'REVERSAL', 'FEE', 'BONUS', 'CASHBACK'] as const
export const TRANSACTION_STATUSES = ['PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED', 'PAID'] as const
export const TRANSACTION_CHANNELS = ['WALLET', 'CARD', 'BANK_TRANSFER', 'USSD', 'CASH', 'PAYSTACK', 'FLUTTERWAVE', 'STRIPE'] as const

export interface FinanceTransaction {
  id: string
  walletId: string
  userId: string
  type: string
  channel: string
  status: string
  direction: 'CREDIT' | 'DEBIT'
  amount: number
  feeAmount: number
  netAmount: number
  balanceBefore: number
  balanceAfter: number
  description: string | null
  referenceType: string | null
  referenceId: string | null
  externalReference: string | null
  settledAt: string | null
  createdAt: string
  user: { id: string; firstName: string | null; lastName: string | null; email: string; role: string } | null
}

export interface FinanceTransactionFilters {
  userId?: string
  direction?: string
  type?: string
  status?: string
  channel?: string
  referenceType?: string
  referenceId?: string
  minAmount?: string
  maxAmount?: string
  from?: string
  to?: string
  search?: string
  page?: number
  limit?: number
}

export interface FinanceTransactionsData {
  transactions: FinanceTransaction[]
  summary: { totalCredit: number; totalDebit: number; net: number; creditCount: number; debitCount: number }
  pagination: Pagination
}

export type FinanceTransactionsResult = { data: FinanceTransactionsData; error?: never } | { error: string; data?: never }
