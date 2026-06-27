import { cookies } from 'next/headers'
import type { User } from './types'

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies()
  const raw = cookieStore.get('user')?.value
  if (!raw) return null
  try {
    return JSON.parse(raw) as User
  } catch {
    return null
  }
}

export async function getAccessToken(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('access_token')?.value ?? null
}
