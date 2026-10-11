import type { Metadata } from 'next'
import { getAdmins } from '@/app/actions/admin-users'
import { getActiveCities } from '@/app/actions/cities'
import { AdminUsersClient } from './admin-users-client'

export const metadata: Metadata = { title: 'Admin Users' }

export default async function AdminUsersPage() {
  const [{ admins, pagination }, cities] = await Promise.all([
    getAdmins({ page: 1, limit: 20 }),
    getActiveCities(),
  ])
  return <AdminUsersClient initialAdmins={admins} total={pagination.total} cities={cities} />
}
