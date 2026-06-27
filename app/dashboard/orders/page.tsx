import type { Metadata } from 'next'
import { getOrders } from '@/app/actions/orders'
import { OrdersTable } from './orders-table'

export const metadata: Metadata = { title: 'Orders' }

export default async function OrdersPage() {
  const { orders, pagination } = await getOrders({ page: 1, limit: 20 })
  return <OrdersTable initialOrders={orders} total={pagination.total} />
}
