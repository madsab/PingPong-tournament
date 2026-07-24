import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { FantasyRules } from './FantasyRules'

describe('FantasyRules', () => {
  it('is labelled as the fantasy rules', () => {
    render(<FantasyRules />)
    expect(screen.getByRole('note', { name: /fantasy-regler/i })).toBeInTheDocument()
  })

  it('explains the economy: start balance, buy/sell, win/loss, racket and booster', () => {
    render(<FantasyRules />)
    expect(screen.getByText(/100 000 000 CompuBucks/)).toBeInTheDocument()
    expect(screen.getByText(/85 %/)).toBeInTheDocument()
    expect(screen.getByText(/\+5 000 000/)).toBeInTheDocument()
    expect(screen.getByText(/golden racket/i)).toBeInTheDocument()
    expect(screen.getByText(/booster/i)).toBeInTheDocument()
  })
})
