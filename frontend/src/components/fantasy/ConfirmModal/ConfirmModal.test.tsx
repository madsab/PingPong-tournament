import { render, screen, fireEvent } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { ConfirmModal } from './ConfirmModal'

describe('ConfirmModal', () => {
  it('shows the message and calls the right handler for each button', () => {
    const onConfirm = vi.fn()
    const onCancel = vi.fn()
    render(
      <ConfirmModal
        message="Er du sikker på at du vil selge Ada?"
        confirmLabel="Selg"
        cancelLabel="Avbryt"
        onConfirm={onConfirm}
        onCancel={onCancel}
      />,
    )
    expect(screen.getByText(/er du sikker på at du vil selge ada\?/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /avbryt/i }))
    expect(onCancel).toHaveBeenCalledTimes(1)
    expect(onConfirm).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: /selg/i }))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })
})
