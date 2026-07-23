import { notFound } from 'next/navigation'
import { getRideDetail } from '@/app/actions/rides'
import { getTimeline } from '@/app/actions/timeline'
import { RideDetailClient } from './ride-detail-client'

export default async function RideDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [ride, timeline] = await Promise.all([
    getRideDetail(id),
    getTimeline('rides', id),
  ])
  if (!ride) notFound()
  return <RideDetailClient ride={ride} timeline={timeline} />
}
