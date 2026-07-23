import { render, screen, cleanup } from '@testing-library/react'
import { describe, it, expect, afterEach } from 'vitest'
import { Navbar } from './Navbar'

function setPath(path: string) {
  window.history.pushState({}, '', path)
}

afterEach(() => {
  cleanup()
  setPath('/')
})

describe('Navbar', () => {
  it('links to both pages', () => {
    render(<Navbar />)
    expect(screen.getByRole('link', { name: 'Tournament' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: 'Fantasy' })).toHaveAttribute('href', '/fantasy')
  })

  it('marks Tournament active on the home path', () => {
    setPath('/')
    render(<Navbar />)
    expect(screen.getByRole('link', { name: 'Tournament' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Fantasy' })).not.toHaveAttribute('aria-current')
  })

  it('marks Fantasy active on the fantasy path', () => {
    setPath('/fantasy')
    render(<Navbar />)
    expect(screen.getByRole('link', { name: 'Fantasy' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Tournament' })).not.toHaveAttribute('aria-current')
  })
})
