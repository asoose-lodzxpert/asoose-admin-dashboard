'use server'

import { revalidatePath } from 'next/cache'
import { apiFetch, ApiError } from '@/app/lib/api'
import { getAccessToken } from '@/app/lib/auth'
import { validateJob, type CareerJob, type CareerResult, type JobInput, type JobList } from '@/app/lib/careers'

const endpoint = '/api/v1/admin/careers/jobs'
async function token() {
  const value = await getAccessToken()
  if (!value) throw new ApiError(401, 'Please sign in to manage careers.')
  // The API verifies the bearer token and enforces the allowed admin roles.
  return value
}
function failure(error: unknown) {
  return { error: error instanceof ApiError ? (error.status === 409 ? 'This job changed while you were editing. Reopen it to load the latest version, then try again.' : error.message) : 'Unable to complete the request. Please try again.' }
}
export async function getCareerJobs(query: { page?: number; search?: string; status?: string; expired?: string } = {}): Promise<CareerResult<JobList>> {
  try {
    const params = new URLSearchParams({ page: String(query.page ?? 1), limit: '12' })
    for (const key of ['search', 'status', 'expired'] as const) if (query[key]) params.set(key, query[key])
    return { data: await apiFetch<JobList>(`${endpoint}?${params}`, { token: await token() }) }
  } catch (error) { return failure(error) }
}
export async function getCareerJob(id: string): Promise<CareerResult<CareerJob>> {
  try {
    return { data: await apiFetch<CareerJob>(`${endpoint}/${encodeURIComponent(id)}`, { token: await token() }) }
  } catch (error) { return failure(error) }
}
export async function saveCareerJob(input: Partial<JobInput>, id?: string): Promise<CareerResult<CareerJob>> {
  if (!input || typeof input !== 'object') return { error: 'Invalid job details.' }
  const error = validateJob(input, !id)
  if (error) return { error }
  const payload = Object.fromEntries(['title', 'description', 'headerImageUrl', 'formUrl', 'department', 'location', 'employmentType', 'workplaceType', 'status', 'endDate'].filter(key => key in input).map(key => [key, input[key as keyof JobInput]]))
  try {
    const data = await apiFetch<CareerJob>(id ? `${endpoint}/${encodeURIComponent(id)}` : endpoint, {
      token: await token(), method: id ? 'PATCH' : 'POST', body: JSON.stringify(payload),
    })
    revalidatePath('/dashboard/careers')
    return { data }
  } catch (error) { return failure(error) }
}
