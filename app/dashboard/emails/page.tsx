import type { Metadata } from 'next'
import { EmailBroadcastClient } from './emails-client'

export const metadata: Metadata = { title: 'Email Broadcast' }

export default function EmailBroadcastPage() {
  return <EmailBroadcastClient />
}
