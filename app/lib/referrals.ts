import type { Pagination } from './types'

export type ReferralStatus = 'PENDING' | 'CREDITED'

export interface ReferralPerson {
  id: string
  firstName: string
  lastName: string
  email: string | null
}

export interface Referral {
  id: string
  status: ReferralStatus
  bonusAmount: number | null
  creditedAt: string | null
  createdAt: string
  referrer: ReferralPerson
  referee: ReferralPerson
}

export interface ReferralList {
  referrals: Referral[]
  pagination: Pagination
}

export interface ReferralSettings {
  bonusAmount: number
  isActive: boolean
  updatedAt: string
}

export type ReferralResult<T> = { data: T; error?: never } | { error: string; data?: never }
