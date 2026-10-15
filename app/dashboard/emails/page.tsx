import type { Metadata } from 'next'
import { getCities } from '@/app/actions/cities'
import { EmailBroadcastClient } from './emails-client'

export const metadata: Metadata = { title: 'Email Broadcast' }

export default async function EmailBroadcastPage() {
  const cities = await getCities()

  return <EmailBroadcastClient cities={cities} />
}
