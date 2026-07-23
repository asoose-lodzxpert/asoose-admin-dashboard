import { notFound } from 'next/navigation'
import { getOrderDetail } from '@/app/actions/orders'
import { getTimeline } from '@/app/actions/timeline'
import { OrderDetailClient } from './order-detail-client'

interface Props {
  params: Promise<{ id: string }>
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const [order, timeline] = await Promise.all([
    getOrderDetail(id),
    getTimeline('orders', id),
  ])
  if (!order) notFound()
  return <OrderDetailClient order={order} timeline={timeline} />
}
