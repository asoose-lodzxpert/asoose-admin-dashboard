import type { Metadata } from 'next'
import { getAccessToken } from '@/app/lib/auth'
import { TrackingClient } from './tracking-client'

export const metadata: Metadata = { title: 'Live tracking' }

export default async function TrackingPage() {
  const accessToken = await getAccessToken()

  return (
    <TrackingClient
      accessToken={accessToken ?? ''}
      socketUrl={process.env.API_BASE_URL?.trim() ?? ''}
      googleMapsApiKey={process.env.GOOGLE_MAPS_API_KEY?.trim() ?? ''}
    />
  )
}
