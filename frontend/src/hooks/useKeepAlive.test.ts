import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useKeepAlive } from './useKeepAlive'

vi.mock('../api/public', () => ({ pingHealth: vi.fn() }))
import { pingHealth } from '../api/public'

const KEEP_ALIVE_MS = 14 * 60 * 1000

describe('useKeepAlive', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('does not ping immediately on mount', () => {
    renderHook(() => useKeepAlive())
    expect(pingHealth).not.toHaveBeenCalled()
  })

  it('pings every 14 minutes', () => {
    renderHook(() => useKeepAlive())

    vi.advanceTimersByTime(KEEP_ALIVE_MS)
    expect(pingHealth).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(KEEP_ALIVE_MS)
    expect(pingHealth).toHaveBeenCalledTimes(2)
  })

  it('clears the interval on unmount', () => {
    const { unmount } = renderHook(() => useKeepAlive())

    vi.advanceTimersByTime(KEEP_ALIVE_MS)
    expect(pingHealth).toHaveBeenCalledTimes(1)

    unmount()
    vi.advanceTimersByTime(KEEP_ALIVE_MS * 3)
    expect(pingHealth).toHaveBeenCalledTimes(1)
  })
})
