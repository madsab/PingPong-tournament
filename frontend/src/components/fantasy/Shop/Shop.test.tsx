import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Shop } from './Shop'

describe('Shop', () => {
  it('buys a Booster when affordable and none is held', () => {
    const onBuy = vi.fn()
    render(<Shop boosterPrice={1_000_000} boostersAvailable={0} balance={5_000_000} onBuy={onBuy} />)
    const buy = screen.getByRole('button', { name: /buy/i })
    fireEvent.click(buy)
    expect(onBuy).toHaveBeenCalled()
  })

  it('disables buying when the user already holds a Booster', () => {
    render(<Shop boosterPrice={1_000_000} boostersAvailable={1} balance={5_000_000} onBuy={vi.fn()} />)
    expect(screen.getByRole('button', { name: /owned/i })).toBeDisabled()
  })

  it('disables buying when the user cannot afford it', () => {
    render(<Shop boosterPrice={5_000_000} boostersAvailable={0} balance={1_000_000} onBuy={vi.fn()} />)
    expect(screen.getByRole('button', { name: /buy/i })).toBeDisabled()
  })
})
