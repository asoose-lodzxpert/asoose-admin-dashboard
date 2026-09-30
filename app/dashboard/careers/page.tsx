import type { Metadata } from 'next'
import { getCareerJobs } from '@/app/actions/careers'
import { CareersClient } from './careers-client'

export const metadata: Metadata = { title: 'Careers' }
export default async function CareersPage() {
  return <CareersClient initialResult={await getCareerJobs()} />
}
