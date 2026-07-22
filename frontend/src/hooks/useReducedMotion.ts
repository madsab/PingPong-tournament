import { useEffect, useState } from 'react'

// True when the visitor asked the OS to reduce motion. Components use this to skip
// the slide-in / flare / ember animations (FR-009, SPECIFICATIONS §9.5).
export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setReduced(mq.matches)
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  return reduced
}
