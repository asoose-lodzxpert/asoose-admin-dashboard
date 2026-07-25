import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getDriverDetail } from '@/app/actions/drivers'
import { getVehicleTypes, getVehicleBrands } from '@/app/actions/configurations'
import { DriverDetailClient } from './driver-detail-client'

export const metadata: Metadata = { title: 'Driver Detail' }

export default async function DriverDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [driver, vehicleTypes, vehicleBrands] = await Promise.all([
    getDriverDetail(id),
    getVehicleTypes(),
    getVehicleBrands(),
  ])
  if (!driver) notFound()
  return (
    <DriverDetailClient
      driver={driver}
      vehicleTypes={vehicleTypes}
      vehicleBrands={vehicleBrands}
    />
  )
}
