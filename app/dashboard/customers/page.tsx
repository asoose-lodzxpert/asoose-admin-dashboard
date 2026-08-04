import type { Metadata } from 'next'
import { getCustomers } from '@/app/actions/customers'
import type { UserRole, UserStatus } from '@/app/lib/types'
import { CustomersTable } from './customers-table'

export const metadata: Metadata = { title: 'Customers' }

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; search?: string; status?: string; page?: string }>
}) {
  const sp = await searchParams
  const role = (['CUSTOMER', 'RIDER', 'DRIVER'] as const).includes(
    sp.role as Extract<UserRole, 'CUSTOMER' | 'RIDER' | 'DRIVER'>
  )
    ? sp.role as Extract<UserRole, 'CUSTOMER' | 'RIDER' | 'DRIVER'>
    : 'CUSTOMER'
  const { customers, pagination } = await getCustomers({
    role,
    page: Number(sp.page) || 1,
    limit: 50,
    search: sp.search || undefined,
    status: (sp.status as UserStatus) || undefined,
  })
  return (
    <CustomersTable
      initialCustomers={customers}
      initialPagination={pagination}
      initialParams={sp}
    />
  )
}
