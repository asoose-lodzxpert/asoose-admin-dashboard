import { VendorCreateClient } from './vendor-create-client'
import { getActiveCities } from '@/app/actions/cities'

export default async function CreateVendorPage() {
  const cities = await getActiveCities()

  return (
    <VendorCreateClient
      cities={cities}
      googleMapsApiKey={process.env.GOOGLE_MAPS_API_KEY?.trim() ?? ''}
    />
  )
}
