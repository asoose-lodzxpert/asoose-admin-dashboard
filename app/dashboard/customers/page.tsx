import type { Metadata } from 'next'
import { getCustomers } from '@/app/actions/customers'
import { CustomersTable } from './customers-table'

export const metadata: Metadata = { title: 'Customers' }

export default async function CustomersPage() {
  const { customers, pagination } = await getCustomers({ page: 1, limit: 50 })
  return <CustomersTable initialCustomers={customers} initialPagination={pagination} />
}
