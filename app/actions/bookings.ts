'use server'

import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { apiFetch, ApiError } from '@/app/lib/api'
import type { BookingSummary, BookingDetail, BookingStatus, Pagination } from '@/app/lib/types'

async function token() {
  return (await cookies()).get('access_token')?.value ?? ''
}

interface ListResponse {
  bookings: BookingSummary[]
  pagination: Pagination
}

export async function getBookings(params?: {
  status?: BookingStatus | ''
  page?: number
  limit?: number
}): Promise<ListResponse> {
  try {
    const q = new URLSearchParams()
    q.set('page', String(params?.page ?? 1))
    q.set('limit', String(params?.limit ?? 20))
    if (params?.status) q.set('status', params.status)
    const res = await apiFetch<{ bookings: BookingSummary[]; pagination: Pagination }>(
      `/api/v1/bookings/admin?${q}`,
      { token: await token() }
    )
    return {
      bookings: res?.bookings ?? [],
      pagination: res?.pagination ?? { page: 1, limit: 20, total: 0, totalPages: 0 },
    }
  } catch {
    return { bookings: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
  }
}

export async function getBookingDetail(bookingId: string): Promise<BookingDetail | null> {
  try {
    const result = await apiFetch<unknown>(`/api/v1/bookings/admin/${bookingId}`, { token: await token() })
    if (!result || typeof result !== 'object') return null
    return result as BookingDetail
  } catch {
    return null
  }
}

// The check-in/check-out endpoints only echo back the changed fields, not the full booking.
type BookingStatusPatch = { id: string; status: BookingStatus; checkedInAt?: string | null; checkedOutAt?: string | null }

export async function checkInBooking(bookingId: string): Promise<{ data?: BookingStatusPatch; error?: string }> {
  try {
    const data = await apiFetch<BookingStatusPatch>(`/api/v1/bookings/admin/${bookingId}/check-in`, {
      method: 'PATCH', token: await token(),
    })
    revalidatePath('/dashboard/bookings')
    revalidatePath(`/dashboard/bookings/${bookingId}`)
    return { data }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to check in booking.' }
  }
}

export async function checkOutBooking(bookingId: string): Promise<{ data?: BookingStatusPatch; error?: string }> {
  try {
    const data = await apiFetch<BookingStatusPatch>(`/api/v1/bookings/admin/${bookingId}/check-out`, {
      method: 'PATCH', token: await token(),
    })
    revalidatePath('/dashboard/bookings')
    revalidatePath(`/dashboard/bookings/${bookingId}`)
    return { data }
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to check out booking.' }
  }
}
