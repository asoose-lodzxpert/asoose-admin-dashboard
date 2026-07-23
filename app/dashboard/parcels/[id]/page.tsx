import { notFound } from 'next/navigation'
import { getParcelDetail } from '@/app/actions/parcels'
import { getTimeline } from '@/app/actions/timeline'
import { ParcelDetailClient } from './parcel-detail-client'

export default async function ParcelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [parcel, timeline] = await Promise.all([
    getParcelDetail(id),
    getTimeline('parcels', id),
  ])
  if (!parcel) notFound()
  return <ParcelDetailClient parcel={parcel} timeline={timeline} />
}
