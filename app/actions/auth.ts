'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { apiFetch, ApiError } from '@/app/lib/api'
import type { LoginData } from '@/app/lib/types'

async function accessToken() {
  const store = await cookies()
  return store.get('access_token')?.value ?? ''
}

export type LoginState = { error: string } | null

const IS_PROD = process.env.NODE_ENV === 'production'

const COOKIE_BASE = {
  secure: IS_PROD,
  sameSite: 'lax' as const,
  path: '/',
}

export async function loginAction(
  _prevState: LoginState,
  formData: FormData
): Promise<LoginState> {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required.' }
  }

  let data: LoginData
  try {
    data = await apiFetch<LoginData>('/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Something went wrong.' }
  }

  const cookieStore = await cookies()

  cookieStore.set('access_token', data.accessToken, {
    ...COOKIE_BASE,
    httpOnly: true,
    maxAge: 60 * 60 * 24,
  })
  cookieStore.set('refresh_token', data.refreshToken, {
    ...COOKIE_BASE,
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 7,
  })
  cookieStore.set('user', JSON.stringify(data.user), {
    ...COOKIE_BASE,
    httpOnly: false,
    maxAge: 60 * 60 * 24,
  })

  redirect('/dashboard')
}

export async function changePassword(
  currentPassword: string,
  newPassword: string
): Promise<{ error?: string }> {
  try {
    await apiFetch('/api/v1/users/me/change-password', {
      method: 'POST',
      body: JSON.stringify({ currentPassword, newPassword }),
      token: await accessToken(),
    })
    return {}
  } catch (err) {
    return { error: err instanceof ApiError ? err.message : 'Failed to change password.' }
  }
}

export async function logoutAction(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete('access_token')
  cookieStore.delete('refresh_token')
  cookieStore.delete('user')
  redirect('/login')
}
