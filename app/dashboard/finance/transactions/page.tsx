import type { Metadata } from 'next'
import { getFinanceTransactions } from '@/app/actions/finance'
import { TransactionsClient } from './transactions-client'

export const metadata: Metadata = { title: 'Wallet Transactions' }

export default async function TransactionsPage() {
  const result = await getFinanceTransactions({ page: 1, limit: 20 })
  return <TransactionsClient initial={result} />
}
