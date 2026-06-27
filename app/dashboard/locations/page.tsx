import type { Metadata } from 'next'
import { getCities } from '@/app/actions/cities'
import { LocationsClient } from './locations-client'

export const metadata: Metadata = { title: 'Locations' }

export default async function LocationsPage() {
  const cities = await getCities()
  return <LocationsClient initialCities={cities} />
}
