import type { Metadata } from 'next'
import { getDisputeCategories, getDisputes } from '@/app/actions/disputes'
import { DisputesClient } from './disputes-client'

export const metadata: Metadata = { title: 'Disputes' }

export default async function DisputesPage() {
  const [{ disputes, pagination }, categories] = await Promise.all([
    getDisputes(),
    getDisputeCategories(),
  ])
  return (
    <DisputesClient
      initialDisputes={disputes}
      initialPagination={pagination}
      categories={categories}
    />
  )
}
