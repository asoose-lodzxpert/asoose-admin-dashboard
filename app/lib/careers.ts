export const employmentTypes = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'TEMPORARY'] as const
export const workplaceTypes = ['ON_SITE', 'HYBRID', 'REMOTE'] as const
export const jobStatuses = ['DRAFT', 'PUBLISHED', 'INACTIVE'] as const
export type JobStatus = typeof jobStatuses[number]
export interface JobInput {
  title: string
  description: string
  headerImageUrl: string
  formUrl: string
  department: string | null
  location: string | null
  employmentType: typeof employmentTypes[number]
  workplaceType: typeof workplaceTypes[number]
  status: JobStatus
  endDate: string
}
export interface CareerJob extends JobInput {
  id: string
  slug: string
  publishedAt: string | null
  createdAt: string
  updatedAt: string
  isExpired: boolean
  isOpen: boolean
}
export interface JobList {
  jobs: CareerJob[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}
export type CareerResult<T> = { data: T; error?: never } | { data?: never; error: string }
export function label(value: string) {
  return value.toLowerCase().replaceAll('_', ' ').replace(/^./, c => c.toUpperCase())
}
export function validWebUrl(value: string) {
  try {
    const url = new URL(value)
    return value.length <= 2048 && ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
  } catch { return false }
}
export function validateJob(input: Partial<JobInput>, creating: boolean): string | undefined {
  if (creating && ['title', 'description', 'headerImageUrl', 'formUrl', 'endDate'].some(key => !(key in input))) return 'Complete all required fields.'
  if (input.title !== undefined && (typeof input.title !== 'string' || input.title.trim().length < 2 || input.title.length > 200)) return 'Enter a title between 2 and 200 characters.'
  if (input.description !== undefined && (typeof input.description !== 'string' || !input.description.trim() || input.description.length > 100000)) return 'Enter a description of up to 100,000 characters.'
  for (const key of ['headerImageUrl', 'formUrl'] as const) {
    if (input[key] !== undefined && (typeof input[key] !== 'string' || !validWebUrl(input[key]))) return `Enter a valid HTTP or HTTPS ${key === 'formUrl' ? 'application' : 'header image'} URL without credentials.`
  }
  for (const [key, max] of [['department', 120], ['location', 200]] as const) {
    if (input[key] != null && (typeof input[key] !== 'string' || input[key].length > max)) return `${label(key)} must be at most ${max} characters.`
  }
  if (input.status !== undefined && !jobStatuses.includes(input.status)) return 'Select a valid status.'
  if (input.employmentType !== undefined && !employmentTypes.includes(input.employmentType)) return 'Select a valid employment type.'
  if (input.workplaceType !== undefined && !workplaceTypes.includes(input.workplaceType)) return 'Select a valid workplace type.'
  if (input.endDate !== undefined && (typeof input.endDate !== 'string' || !/(Z|[+-]\d{2}:\d{2})$/.test(input.endDate) || !Number.isFinite(Date.parse(input.endDate)) || Date.parse(input.endDate) <= Date.now())) return 'Choose a future application deadline.'
}
