import { notFound } from 'next/navigation'
import { getParcelDetail } from '@/app/actions/parcels'
import { ParcelDetailClient } from './parcel-detail-client'

export default async function ParcelDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const parcel = await getParcelDetail(id)
  if (!parcel) notFound()
  return <ParcelDetailClient parcel={parcel} />
}
