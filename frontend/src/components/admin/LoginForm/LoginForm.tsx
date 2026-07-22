import { useState, type FormEvent } from 'react'
import { ApiError, login, logout } from '../../../api/admin'
import styles from './LoginForm.module.css'

// The password gate (F6). Calls back once the session is established.
export function LoginForm({ onLoggedIn }: { onLoggedIn: () => void }) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      await login(password)
      onLoggedIn()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not log in')
    } finally {
      setBusy(false)
    }
  }

  return (
    <form onSubmit={submit} className={styles.form}>
      <p className={styles.eyebrow}>Admin</p>
      <label htmlFor="admin-password" className={styles.label}>
        Password
      </label>
      <input
        id="admin-password"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className={styles.input}
        autoFocus
      />
      <button type="submit" className={styles.button} disabled={busy}>
        {busy ? 'Checking…' : 'Log in'}
      </button>
      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </form>
  )
}

// Ends the session (F7) — important on shared machines.
export function LogoutButton({ onLoggedOut }: { onLoggedOut: () => void }) {
  async function click() {
    await logout()
    onLoggedOut()
  }
  return (
    <button onClick={click} className={styles.logout}>
      Log out
    </button>
  )
}
