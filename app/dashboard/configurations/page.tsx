import type { Metadata } from 'next'
import {
  getVehicleTypes,
  getVehicleBrands,
  getStoreTypes,
  getCuisines,
  getCategories,
} from '@/app/actions/configurations'
import { ConfigurationsClient } from './configurations-client'

export const metadata: Metadata = { title: 'Configurations' }

export default async function ConfigurationsPage() {
  const [vehicleTypes, vehicleBrands, storeTypes, cuisines, categories] = await Promise.all([
    getVehicleTypes(),
    getVehicleBrands(),
    getStoreTypes(),
    getCuisines(),
    getCategories(),
  ])

  return (
    <ConfigurationsClient
      initialVehicleTypes={vehicleTypes}
      initialVehicleBrands={vehicleBrands}
      initialStoreTypes={storeTypes}
      initialCuisines={cuisines}
      initialCategories={categories}
    />
  )
}
