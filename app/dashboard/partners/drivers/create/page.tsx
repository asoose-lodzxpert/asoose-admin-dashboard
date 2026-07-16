import { getVehicleTypes, getVehicleBrands } from '@/app/actions/configurations'
import { getActiveCities } from '@/app/actions/cities'
import { DriverCreateClient } from './driver-create-client'

export default async function CreateDriverPage() {
  const [vehicleTypes, vehicleBrands, cities] = await Promise.all([
    getVehicleTypes(),
    getVehicleBrands(),
    getActiveCities(),
  ])
  return <DriverCreateClient vehicleTypes={vehicleTypes} vehicleBrands={vehicleBrands} cities={cities} />
}
