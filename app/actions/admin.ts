'use server'

import { cookies } from 'next/headers'
import { apiFetch } from '@/app/lib/api'

async function token() {
  const store = await cookies()
  return store.get('access_token')?.value ?? ''
}

export interface ChartPoint {
  date: string
  count: number
}

export interface RevenuePoint {
  date: string
  amount: number
  count: number
}

export interface DashboardStats {
  users: { total: number; active: number; newToday: number; customers: number; vendors: number; riders: number; drivers: number }
  orders: { total: number; today: number; pending: number; completed: number; cancelled: number }
  rides: { total: number; today: number; active: number; completed: number; cancelled: number }
  deliveries: { total: number; active: number; completedToday: number }
  vendors: { total: number; pendingApproval: number }
  riders: { total: number; online: number; pendingApproval: number }
  drivers: { total: number; online: number; pendingApproval: number }
  finance: { totalRevenue: number; todayRevenue: number; pendingPayouts: number; completedPayouts: number; openDisputes: number }
  charts: {
    dailyOrders: ChartPoint[]
    dailyRides: ChartPoint[]
    dailyRevenue: RevenuePoint[]
    dailySignups: ChartPoint[]
  }
}

export interface RecentOrder {
  id: string
  orderNumber: string
  status: string
  total: number
  restaurantName: string | null
  createdAt: string
  customer: { id: string; firstName: string; lastName: string; email: string } | null
}

const ZERO_STATS: DashboardStats = {
  users: { total: 0, active: 0, newToday: 0, customers: 0, vendors: 0, riders: 0, drivers: 0 },
  orders: { total: 0, today: 0, pending: 0, completed: 0, cancelled: 0 },
  rides: { total: 0, today: 0, active: 0, completed: 0, cancelled: 0 },
  deliveries: { total: 0, active: 0, completedToday: 0 },
  vendors: { total: 0, pendingApproval: 0 },
  riders: { total: 0, online: 0, pendingApproval: 0 },
  drivers: { total: 0, online: 0, pendingApproval: 0 },
  finance: { totalRevenue: 0, todayRevenue: 0, pendingPayouts: 0, completedPayouts: 0, openDisputes: 0 },
  charts: { dailyOrders: [], dailyRides: [], dailyRevenue: [], dailySignups: [] },
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    return await apiFetch<DashboardStats>('/api/v1/admin/dashboard', { token: await token() })
  } catch {
    return ZERO_STATS
  }
}

export async function getRecentOrders(limit = 8): Promise<RecentOrder[]> {
  try {
    const result = await apiFetch<{ orders: Record<string, unknown>[] }>(
      `/api/v1/orders/admin?page=1&limit=${limit}`,
      { token: await token() }
    )
    return (result.orders ?? []).map((o) => ({
      id: String(o.id ?? ''),
      orderNumber: String(o.orderNumber ?? ''),
      status: String(o.status ?? ''),
      total: Number(
        (o.pricing as { total?: number })?.total ?? o.total ?? 0
      ),
      restaurantName: (o.restaurantName ?? (o.vendor as { name?: string })?.name ?? null) as string | null,
      createdAt: String(o.createdAt ?? ''),
      customer: o.customer as RecentOrder['customer'],
    }))
  } catch {
    return []
  }
}
