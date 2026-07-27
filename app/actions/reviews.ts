'use server'

import { cookies } from 'next/headers'
import { apiFetch } from '@/app/lib/api'
import type { Review, ReviewSubjectType, ReviewStatus, Pagination } from '@/app/lib/types'

async function token() {
  const store = await cookies()
  return store.get('access_token')?.value ?? ''
}

interface ListResponse {
  reviews: Review[]
  pagination: Pagination
}

export async function getReviews(params?: {
  page?: number
  limit?: number
  subjectId?: string
  subjectType?: ReviewSubjectType | ''
  status?: ReviewStatus | ''
  rating?: number | ''
  userId?: string
}): Promise<ListResponse> {
  try {
    const q = new URLSearchParams()
    q.set('page', String(params?.page ?? 1))
    q.set('limit', String(params?.limit ?? 20))
    if (params?.subjectId) q.set('subjectId', params.subjectId)
    if (params?.subjectType) q.set('subjectType', params.subjectType)
    if (params?.status) q.set('status', params.status)
    if (params?.rating) q.set('rating', String(params.rating))
    if (params?.userId) q.set('userId', params.userId)
    return await apiFetch<ListResponse>(`/api/v1/reviews/admin?${q}`, { token: await token() })
  } catch {
    return { reviews: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } }
  }
}
