import { notFound } from 'next/navigation'
import { getOrderDetail } from '@/app/actions/orders'
import { OrderDetailClient } from './order-detail-client'

interface Props {
  params: Promise<{ id: string }>
}

export default async function OrderDetailPage({ params }: Props) {
  const { id } = await params
  const order = await getOrderDetail(id)
  if (!order) notFound()
  return <OrderDetailClient order={order} />
}
