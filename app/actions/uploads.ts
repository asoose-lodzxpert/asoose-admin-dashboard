'use server'

import { cookies } from 'next/headers'

export async function uploadImage(
  formData: FormData,
  category: 'product' | 'general' = 'product'
): Promise<{ url?: string; error?: string }> {
  const store = await cookies()
  const token = store.get('access_token')?.value ?? ''

  const file = formData.get('file') as File | null
  if (!file) return { error: 'No file provided.' }

  const fd = new FormData()
  fd.append('file', file)

  let res: Response
  try {
    res = await fetch(
      `${process.env.API_BASE_URL}/api/v1/uploads?category=${category}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
        cache: 'no-store',
      }
    )
  } catch {
    return { error: 'Unable to reach the server.' }
  }

  const body = await res.json()
  if (!body.success) return { error: body.message ?? 'Upload failed.' }
  return { url: (body.data as { url: string }).url }
}
