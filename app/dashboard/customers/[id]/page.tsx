import { notFound } from 'next/navigation'
import { getCustomerDetail } from '@/app/actions/customers'
import { CustomerDetailClient } from './customer-detail-client'

interface Props { params: Promise<{ id: string }> }

export default async function CustomerDetailPage({ params }: Props) {
  const { id } = await params
  const customer = await getCustomerDetail(id)
  if (!customer) notFound()
  return <CustomerDetailClient customer={customer} />
}
