import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getRiderDetail } from '@/app/actions/riders'
import { getVehicleTypes, getVehicleBrands } from '@/app/actions/configurations'
import { getActiveCities } from '@/app/actions/cities'
import { RiderDetailClient } from './rider-detail-client'

export const metadata: Metadata = { title: 'Rider Detail' }

export default async function RiderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
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
      vehicleTypes={vehicleTypes}
      vehicleBrands={vehicleBrands}
      cities={cities}
    />
  )
}
