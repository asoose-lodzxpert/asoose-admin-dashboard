import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getDisputeDetail } from '@/app/actions/disputes'
import { getAdmins } from '@/app/actions/admin-users'
import { DisputeDetailClient } from './dispute-detail-client'

export const metadata: Metadata = { title: 'Dispute Detail' }

export default async function DisputeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [dispute, { admins }] = await Promise.all([
    getDisputeDetail(id),
    getAdmins({ status: 'ACTIVE', page: 1, limit: 100 }),
  ])
  if (!dispute) notFound()
  return <DisputeDetailClient initialDispute={dispute} admins={admins} />
}
