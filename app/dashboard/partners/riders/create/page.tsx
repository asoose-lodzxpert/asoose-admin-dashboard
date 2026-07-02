import { getVehicleTypes, getVehicleBrands } from '@/app/actions/configurations'
import { RiderCreateClient } from './rider-create-client'

export default async function CreateRiderPage() {
  const [vehicleTypes, vehicleBrands] = await Promise.all([getVehicleTypes(), getVehicleBrands()])
  return <RiderCreateClient vehicleTypes={vehicleTypes} vehicleBrands={vehicleBrands} />
}
