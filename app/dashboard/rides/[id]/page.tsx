import { notFound } from 'next/navigation'
import { getRideDetail } from '@/app/actions/rides'
import { RideDetailClient } from './ride-detail-client'

export default async function RideDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const ride = await getRideDetail(id)
  if (!ride) notFound()
  return <RideDetailClient ride={ride} />
}
