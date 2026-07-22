import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { RulesBanner } from './RulesBanner'

// The rules are static content, so this just checks the banner is labelled as
// the rules and that all six rules are actually on screen.
describe('RulesBanner', () => {
  it('is labelled as the game rules', () => {
    render(<RulesBanner />)
    expect(screen.getByRole('note', { name: /spilleregler/i })).toBeInTheDocument()
  })

  it('shows all six rules', () => {
    render(<RulesBanner />)
    expect(screen.getByText(/først til 11 poeng vinner matchen/i)).toBeInTheDocument()
    expect(screen.getByText(/vinner flest delkamper, vinner hele kampen/i)).toBeInTheDocument()
    expect(screen.getByText(/første ballen spilles for å avgjøre hvem som får serven/i)).toBeInTheDocument()
    expect(screen.getByText(/bak bakkanten av bordet/i)).toBeInTheDocument()
    expect(screen.getByText(/world cup-racketen \(fairplay\)/i)).toBeInTheDocument()
    expect(
      screen.getByText(/like mange delkamper som det største laget har spillere/i),
    ).toBeInTheDocument()
  })

  it('emphasizes the "Ingen" prohibition', () => {
    render(<RulesBanner />)
    // The Fairplay ban is the important one — the key phrase is emphasized.
    expect(screen.getByText('Ingen')).toBeInTheDocument()
  })
})
