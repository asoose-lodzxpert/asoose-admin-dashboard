import type { Metadata } from 'next'
import { getPayouts } from '@/app/actions/payouts'
import { PayoutsTable } from './payouts-table'

export const metadata: Metadata = { title: 'Payouts' }

export default async function PayoutsPage() {
  const { payouts, pagination } = await getPayouts({ page: 1, limit: 20 })
  return <PayoutsTable initialPayouts={payouts} initialPagination={pagination} />
}
