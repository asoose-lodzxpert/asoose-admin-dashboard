import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getDriverDetail } from '@/app/actions/drivers'
import { getVehicleTypes, getVehicleBrands } from '@/app/actions/configurations'
import { DriverDetailClient } from './driver-detail-client'

export const metadata: Metadata = { title: 'Driver Detail' }

export default async function DriverDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ name?: string; email?: string; phone?: string }>
}) {
  const { id } = await params
  const { name, email, phone } = await searchParams
  const [driver, vehicleTypes, vehicleBrands] = await Promise.all([
    getDriverDetail(id),
    getVehicleTypes(),
    getVehicleBrands(),
  ])
  if (!driver) notFound()
  return (
    <DriverDetailClient
      driver={driver}
      displayName={name ?? 'Driver'}
      displayEmail={email}
      displayPhone={phone}
      vehicleTypes={vehicleTypes}
      vehicleBrands={vehicleBrands}
    />
  )
}
