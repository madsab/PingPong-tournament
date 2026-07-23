import { useState, type FormEvent } from 'react'
import { ApiError, login, register, type FantasyUser } from '../../../api/fantasy'
import styles from './FantasyLogin.module.css'

// The fantasy gate (US1). You type your name; if it's known you're logged straight
// in, otherwise we reveal a fun-fact field and register you. No password — the name
// is the identity. The backend is the real validator; the checks here are just for
// a friendly message.
export function FantasyLogin({ onLoggedIn }: { onLoggedIn: (user: FantasyUser) => void }) {
  const [name, setName] = useState('')
  const [funFact, setFunFact] = useState('')
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Please enter your name.')
      return
    }

    if (mode === 'login') {
      setBusy(true)
      try {
        const user = await login(name)
        onLoggedIn(user)
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          // No account yet — become a registration form.
          setMode('register')
        } else {
          setError(err instanceof ApiError ? err.message : 'Could not log in')
        }
      } finally {
        setBusy(false)
      }
      return
    }

    // Registration: the fun-fact is required.
    if (!funFact.trim()) {
      setError('A fun-fact is required to join.')
      return
    }
    setBusy(true)
    try {
      const user = await register(name, funFact)
      onLoggedIn(user)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not register')
    } finally {
      setBusy(false)
    }
  }

  const registering = mode === 'register'

  return (
    <form onSubmit={submit} className={styles.form}>
      <p className={styles.eyebrow}>Fantasy League</p>
      <h1 className={styles.title}>Join the Fantasy Ping Pong league</h1>
      <p className={styles.lede}>
        Just your name — no password. We&rsquo;ll remember you on this device.
      </p>

      <label htmlFor="fantasy-name" className={styles.label}>
        Your name
      </label>
      <input
        id="fantasy-name"
        className={styles.input}
        value={name}
        onChange={(e) => setName(e.target.value)}
        autoFocus
      />

      {registering && (
        <>
          <label htmlFor="fantasy-funfact" className={styles.label}>
            A fun-fact about you <span className={styles.req}>(required)</span>
          </label>
          <textarea
            id="fantasy-funfact"
            className={styles.textarea}
            value={funFact}
            onChange={(e) => setFunFact(e.target.value)}
            rows={2}
            maxLength={280}
          />
        </>
      )}

      <button type="submit" className={styles.button} disabled={busy}>
        {busy ? 'Please wait…' : registering ? 'Join the league' : 'Continue'}
      </button>

      {error && (
        <p role="alert" className={styles.error}>
          {error}
        </p>
      )}
    </form>
  )
}
