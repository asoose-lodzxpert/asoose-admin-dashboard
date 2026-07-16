import { getVehicleTypes, getVehicleBrands } from '@/app/actions/configurations'
import { getActiveCities } from '@/app/actions/cities'
import { RiderCreateClient } from './rider-create-client'

export default async function CreateRiderPage() {
  const [vehicleTypes, vehicleBrands, cities] = await Promise.all([
    getVehicleTypes(),
    getVehicleBrands(),
    getActiveCities(),
  ])
  return <RiderCreateClient vehicleTypes={vehicleTypes} vehicleBrands={vehicleBrands} cities={cities} />
}
