import { useEffect } from 'react'
import { pingHealth } from '../api/public'

// 14 min — just under the free-tier host's ~15-min idle spin-down window.
const KEEP_ALIVE_MS = 14 * 60 * 1000

// Pings the backend health endpoint on a fixed interval so the server stays awake
// while someone has the page open. No initial ping: the page load itself is already
// a request that keeps the server warm. Clears the interval on unmount — required so
// StrictMode's double-mount in dev doesn't leave a duplicate interval running.
export function useKeepAlive(): void {
  useEffect(() => {
    const id = setInterval(pingHealth, KEEP_ALIVE_MS)
    return () => clearInterval(id)
  }, [])
}
