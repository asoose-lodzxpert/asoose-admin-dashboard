'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Tracks which row was just clicked so the UI can show pending feedback
 * immediately, before the destination route's data has loaded.
 */
export function useRowNav() {
  const router = useRouter()
  const [navigatingId, setNavigatingId] = useState<string | null>(null)

  function navigate(id: string, href: string) {
    setNavigatingId(id)
    router.push(href)
  }

  return { navigatingId, navigate }
}
