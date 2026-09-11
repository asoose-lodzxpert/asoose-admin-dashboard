import type { Metadata } from 'next'
import { getReferrals, getReferralSettings } from '@/app/actions/referrals'
import { ReferralsClient } from './referrals-client'

export const metadata: Metadata = { title: 'Referral Bonuses' }

export default async function ReferralsPage() {
  const [referrals, settings] = await Promise.all([getReferrals(), getReferralSettings()])
  return <ReferralsClient initialReferrals={referrals} initialSettings={settings} />
}
