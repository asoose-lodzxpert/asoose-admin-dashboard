import type { Metadata } from 'next'
import { CreateParcelClient } from './create-parcel-client'

export const metadata: Metadata = { title: 'Create delivery' }

export default function CreateParcelPage() {
  return (
    <CreateParcelClient
      googleMapsApiKey={process.env.GOOGLE_MAPS_API_KEY?.trim() ?? ''}
    />
  )
}
