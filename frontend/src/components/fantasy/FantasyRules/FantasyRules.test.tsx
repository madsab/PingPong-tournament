import { render, screen } from '@testing-library/react'
import { describe, it, expect } from 'vitest'
import { FantasyRules } from './FantasyRules'

describe('FantasyRules', () => {
  it('is labelled as the fantasy rules', () => {
    render(<FantasyRules />)
    expect(screen.getByRole('note', { name: /fantasy-regler/i })).toBeInTheDocument()
  })

  it('explains registration, the reward, and the after-you-add rule', () => {
    render(<FantasyRules />)
    expect(screen.getByText(/registrer deg med navnet ditt/i)).toBeInTheDocument()
    expect(screen.getByText(/10 CompuBucks/)).toBeInTheDocument()
    expect(screen.getByText(/kun/i)).toBeInTheDocument()
    expect(screen.getByText(/starter klokka på nytt/i)).toBeInTheDocument()
  })
})
