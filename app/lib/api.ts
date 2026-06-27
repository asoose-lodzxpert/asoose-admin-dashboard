export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export async function apiFetch<T>(
  path: string,
  options?: RequestInit & { token?: string }
): Promise<T> {
  const { token, headers: extraHeaders, ...rest } = options ?? {}

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extraHeaders,
  }

  let res: Response
  try {
    res = await fetch(`${process.env.API_BASE_URL}${path}`, {
      cache: 'no-store',
      ...rest,
      headers,
    })
  } catch {
    throw new ApiError(0, 'Unable to reach the server. Please try again.')
  }

  const body = await res.json()

  if (!body.success) {
    throw new ApiError(res.status, body.message ?? 'Request failed.')
  }

  return body.data as T
}
