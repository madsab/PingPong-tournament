import { useEffect, useState } from 'react'
import { getSession, getToken } from '../../../api/admin'
import { LoginForm, LogoutButton } from '../LoginForm/LoginForm'
import { TeamsManager } from '../TeamsManager/TeamsManager'
import { MatchesManager } from '../MatchesManager/MatchesManager'
import styles from './AdminPage.module.css'

type Tab = 'teams' | 'matches'

// The /admin area: a password gate, then a dashboard for managing the tournament.
export function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null)
  const [tab, setTab] = useState<Tab>('teams')

  function refresh() {
    // No token stored → definitely logged out; skip the guaranteed-401 round-trip.
    if (!getToken()) {
      setAuthed(false)
      return
    }
    getSession()
      .then((s) => setAuthed(s.authenticated))
      .catch(() => setAuthed(false))
  }

  useEffect(refresh, [])

  if (authed === null) return <p className={styles.notice}>Loading…</p>
  if (!authed) return <LoginForm onLoggedIn={() => setAuthed(true)} />

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1 className={styles.title}>Admin</h1>
        <LogoutButton onLoggedOut={() => setAuthed(false)} />
      </header>

      <nav className={styles.tabs}>
        <button
          className={tab === 'teams' ? styles.tabActive : styles.tab}
          onClick={() => setTab('teams')}
        >
          Teams &amp; members
        </button>
        <button
          className={tab === 'matches' ? styles.tabActive : styles.tab}
          onClick={() => setTab('matches')}
        >
          Matches
        </button>
      </nav>

      {tab === 'teams' ? (
        <TeamsManager onAuthLost={() => setAuthed(false)} />
      ) : (
        <MatchesManager onAuthLost={() => setAuthed(false)} />
      )}
    </div>
  )
}
