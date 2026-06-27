import type { Metadata } from 'next'
import { getPaystackTransactions } from '@/app/actions/finance'
import { PaystackTable } from './paystack-table'

export const metadata: Metadata = { title: 'Paystack Transactions' }

export default async function PaystackPage() {
  const { transactions, pagination } = await getPaystackTransactions({ page: 1, perPage: 20 })
  return <PaystackTable initialTransactions={transactions} pagination={pagination} />
}
