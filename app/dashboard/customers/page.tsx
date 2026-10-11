import type { Metadata } from 'next'
import { getCustomers } from '@/app/actions/customers'
import { getCities } from '@/app/actions/cities'
import type { UserRole, UserStatus } from '@/app/lib/types'
import { CustomersTable } from './customers-table'

export const metadata: Metadata = { title: 'Customers' }

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; cityId?: string; search?: string; status?: string; page?: string }>
}) {
  const sp = await searchParams
  const role = (['CUSTOMER', 'RIDER', 'DRIVER'] as const).includes(
    sp.role as Extract<UserRole, 'CUSTOMER' | 'RIDER' | 'DRIVER'>
  )
    ? sp.role as Extract<UserRole, 'CUSTOMER' | 'RIDER' | 'DRIVER'>
    : 'CUSTOMER'
  const [{ customers, pagination }, cities] = await Promise.all([
    getCustomers({
      role,
      cityId: sp.cityId || undefined,
      page: Number(sp.page) || 1,
      limit: 50,
      search: sp.search || undefined,
      status: (sp.status as UserStatus) || undefined,
    }),
    getCities(),
  ])
  return (
    <CustomersTable
      initialCustomers={customers}
      initialPagination={pagination}
      initialParams={sp}
      cities={cities}
    />
  )
}
