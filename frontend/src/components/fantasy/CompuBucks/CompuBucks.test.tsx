import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { CompuBucks } from './CompuBucks'

describe('CompuBucks', () => {
  it('shows the amount grouped like money', () => {
    const expected = new Intl.NumberFormat('nb-NO').format(1240) // "1 240" (nbsp)
    render(<CompuBucks amount={1240} />)
    // Compare raw textContent: the grouping separator is a non-breaking space,
    // which getByText's normalizer would collapse on only one side.
    expect(screen.getByTestId('cb-amount').textContent).toBe(expected)
    expect(screen.getByText(/compubucks/i)).toBeInTheDocument()
  })

  it('renders a coin icon (decorative)', () => {
    const { container } = render(<CompuBucks amount={0} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(svg).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('0')).toBeInTheDocument()
  })
})
