'use server'

import { cookies } from 'next/headers'
import { apiFetch } from '@/app/lib/api'

async function token() {
  return (await cookies()).get('access_token')?.value ?? ''
}

export type ReportType = 'orders' | 'revenue' | 'rides' | 'users'

export interface OrdersReport {
  period: { from: string; to: string }
  totalOrders: number
  completedOrders: number
  cancelledOrders: number
  totalRevenue: number
  averageOrderValue: number
  byStatus: Record<string, number>
}

export interface RevenueReport {
  period: { from: string; to: string }
  totalPayments: number
  totalAmount: number
  byMethod: Record<string, { count: number; amount: number }>
  byPurpose: Record<string, { count: number; amount: number }>
}

export interface RidesReport {
  period: { from: string; to: string }
  totalRides: number
  completedRides: number
  cancelledRides: number
  totalFare: number
  averageFare: number
  byStatus: Record<string, number>
}

export interface UsersReport {
  period: { from: string; to: string }
  newUsers: number
  byRole: Record<string, number>
  dailySignups: { date: string; count: number }[]
}

export type ReportData =
  | { type: 'orders'; data: OrdersReport }
  | { type: 'revenue'; data: RevenueReport }
  | { type: 'rides'; data: RidesReport }
  | { type: 'users'; data: UsersReport }

export async function fetchReport(
  type: ReportType,
  from: string,
  to: string
): Promise<{ report?: ReportData; error?: string }> {
  try {
    const q = new URLSearchParams({ type, from, to })
    const data = await apiFetch<Record<string, unknown>>(
      `/api/v1/admin/reports?${q}`,
      { token: await token() }
    )
    return { report: { type, data } as unknown as ReportData }
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Failed to fetch report.' }
  }
}
