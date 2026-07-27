import type { Metadata } from 'next'
import { getReviews } from '@/app/actions/reviews'
import { ReviewsClient } from './reviews-client'

export const metadata: Metadata = { title: 'Reviews' }

export default async function ReviewsPage() {
  const { reviews, pagination } = await getReviews({ page: 1, limit: 20 })
  return <ReviewsClient initialReviews={reviews} initialPagination={pagination} />
}
