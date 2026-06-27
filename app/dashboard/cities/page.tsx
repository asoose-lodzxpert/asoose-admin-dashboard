import type { Metadata } from 'next'
import { getCities } from '@/app/actions/cities'
import { CitiesClient } from './cities-client'

export const metadata: Metadata = { title: 'Cities' }

export default async function CitiesPage() {
  const cities = await getCities()
  return <CitiesClient initialCities={cities} />
}
