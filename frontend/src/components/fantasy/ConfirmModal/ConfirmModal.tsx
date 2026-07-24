import styles from './ConfirmModal.module.css'

interface ConfirmModalProps {
  // The question to show (e.g. "Er du sikker på at du vil selge Ada?").
  message: string
  // Labels for the two buttons — kept as props so this modal stays generic.
  confirmLabel: string
  cancelLabel: string
  onConfirm: () => void
  onCancel: () => void
}

// A tiny yes/no modal. Reusable and copy-agnostic: the caller passes the message
// and the button labels. Used for the "sell a player" confirmation.
export function ConfirmModal({
  message,
  confirmLabel,
  cancelLabel,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label={message}>
      <div className={styles.panel}>
        <p className={styles.message}>{message}</p>
        <div className={styles.actions}>
          <button type="button" className={styles.cancel} onClick={onCancel}>
            {cancelLabel}
          </button>
          <button type="button" className={styles.confirm} onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
