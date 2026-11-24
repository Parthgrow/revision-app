'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

// No polling: when the tab regains focus the page re-fetches its server data
// and moves its clock, so "active" / "stalled" stay current. Returns that clock.
export function useRefreshOnFocus(): number {
  const router = useRouter()
  const [now, setNow] = useState(Date.now)
  useEffect(() => {
    const refresh = () => {
      setNow(Date.now())
      router.refresh()
    }
    window.addEventListener('focus', refresh)
    return () => window.removeEventListener('focus', refresh)
  }, [router])
  return now
}
