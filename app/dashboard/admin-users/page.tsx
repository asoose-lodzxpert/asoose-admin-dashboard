import type { Metadata } from 'next'
import { getAdmins } from '@/app/actions/admin-users'
import { AdminUsersClient } from './admin-users-client'

export const metadata: Metadata = { title: 'Admin Users' }

export default async function AdminUsersPage() {
  const { admins, pagination } = await getAdmins({ page: 1, limit: 20 })
  return <AdminUsersClient initialAdmins={admins} total={pagination.total} />
}
