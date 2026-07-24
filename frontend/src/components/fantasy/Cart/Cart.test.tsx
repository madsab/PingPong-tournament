import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { Cart, type CartLine } from './Cart'

const line = (over: Partial<CartLine> = {}): CartLine => ({
  slotIndex: 2,
  playerName: 'Finn',
  netCost: 10_000_000,
  isSwap: false,
  ...over,
})

const base = {
  total: 10_000_000,
  remaining: 36_000_000,
  overBudget: false,
  canSave: true,
  saving: false,
  onRemoveLine: () => {},
  onSave: () => {},
}

describe('Cart', () => {
  it('renders nothing when there are no lines', () => {
    const { container } = render(<Cart {...base} lines={[]} total={0} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('shows one line per pending pick with its player and cost', () => {
    render(<Cart {...base} lines={[line(), line({ slotIndex: 3, playerName: 'Guro' })]} />)
    expect(screen.getByText('Finn')).toBeInTheDocument()
    expect(screen.getByText('Guro')).toBeInTheDocument()
    // buy of 10M shows as a spend
    expect(screen.getAllByText(/-10M/i).length).toBeGreaterThan(0)
  })

  it('shows a swap that refunds more than it costs as a gain (+)', () => {
    render(<Cart {...base} lines={[line({ isSwap: true, netCost: -7_000_000 })]} />)
    expect(screen.getByText(/\+7M/i)).toBeInTheDocument()
  })

  it('shows the total and remaining', () => {
    render(<Cart {...base} lines={[line()]} />)
    expect(screen.getByText(/36M left/i)).toBeInTheDocument()
  })

  it('disables Save and shows the shortfall when over budget', () => {
    render(
      <Cart {...base} lines={[line()]} overBudget canSave={false} remaining={-4_000_000} />,
    )
    expect(screen.getByText(/over budget by 4M/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /save team/i })).toBeDisabled()
  })

  it('fires onRemoveLine and onSave', () => {
    const onRemoveLine = vi.fn()
    const onSave = vi.fn()
    render(<Cart {...base} lines={[line()]} onRemoveLine={onRemoveLine} onSave={onSave} />)
    fireEvent.click(screen.getByRole('button', { name: /remove finn/i }))
    expect(onRemoveLine).toHaveBeenCalledWith(2)
    fireEvent.click(screen.getByRole('button', { name: /save team/i }))
    expect(onSave).toHaveBeenCalled()
  })
})
