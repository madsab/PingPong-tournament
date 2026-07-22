import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { TeamLogo } from './TeamLogo'

describe('TeamLogo', () => {
  it('renders the image when a logo URL is given', () => {
    const { container } = render(
      <TeamLogo logoUrl="/logos/spin.png" name="Spin Doctors" />,
    )
    const img = container.querySelector('img')
    expect(img).not.toBeNull()
    expect(img).toHaveAttribute('src', '/logos/spin.png')
  })

  it('shows the initials fallback when there is no logo', () => {
    const { container } = render(<TeamLogo logoUrl={null} name="Spin Doctors" />)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('SD')).toBeInTheDocument() // Spin Doctors -> SD
  })

  it('falls back to initials (no broken image) when the image fails to load', () => {
    const { container } = render(
      <TeamLogo logoUrl="/logos/broken.png" name="Net Ninjas" />,
    )
    fireEvent.error(container.querySelector('img')!)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('NN')).toBeInTheDocument()
  })
})
