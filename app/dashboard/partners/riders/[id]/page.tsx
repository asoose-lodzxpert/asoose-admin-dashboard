import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getRiderDetail } from '@/app/actions/riders'
import { getVehicleTypes, getVehicleBrands } from '@/app/actions/configurations'
import { getActiveCities } from '@/app/actions/cities'
import { RiderDetailClient } from './rider-detail-client'

export const metadata: Metadata = { title: 'Rider Detail' }

export default async function RiderDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ name?: string; email?: string; phone?: string }>
}) {
  const { id } = await params
  const { name, email, phone } = await searchParams
  const [rider, vehicleTypes, vehicleBrands, cities] = await Promise.all([
    getRiderDetail(id),
    getVehicleTypes(),
    getVehicleBrands(),
    getActiveCities(),
  ])
  if (!rider) notFound()
  return (
    <RiderDetailClient
      rider={rider}
      displayName={name ?? 'Rider'}
      displayEmail={email}
      displayPhone={phone}
      vehicleTypes={vehicleTypes}
      vehicleBrands={vehicleBrands}
      cities={cities}
    />
  )
}
