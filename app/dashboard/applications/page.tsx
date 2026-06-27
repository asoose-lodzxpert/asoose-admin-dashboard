import type { Metadata } from 'next'
import { getApplications } from '@/app/actions/applications'
import { ApplicationsClient } from './applications-client'

export const metadata: Metadata = { title: 'Applications' }

export default async function ApplicationsPage() {
  const { applications, pagination } = await getApplications({
    status: 'PENDING_REVIEW',
    page: 1,
    limit: 20,
  })

  return <ApplicationsClient initialApplications={applications} initialPagination={pagination} />
}
