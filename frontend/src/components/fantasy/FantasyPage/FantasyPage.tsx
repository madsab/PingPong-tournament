import { useEffect, useState } from 'react'
import { ApiError, getMe, logout, type FantasyUser } from '../../../api/fantasy'
import { FantasyLogin } from '../FantasyLogin/FantasyLogin'
import { FantasyTeam } from '../FantasyTeam/FantasyTeam'
import { FantasyRules } from '../FantasyRules/FantasyRules'
import styles from './FantasyPage.module.css'

// The /fantasy area (US1 gate). On load we ask the backend who we are: if the
// session cookie is valid we go straight to the team, otherwise we show the login.
export function FantasyPage() {
  const [user, setUser] = useState<FantasyUser | null | undefined>(undefined)

  useEffect(() => {
    let active = true
    getMe()
      .then((u) => active && setUser(u))
      .catch((err: unknown) => {
        if (!active) return
        // 401 just means "not logged in yet" — anything else we also treat as
        // logged-out so the user can still try to log in.
        if (!(err instanceof ApiError)) return setUser(null)
        setUser(null)
      })
    return () => {
      active = false
    }
  }, [])

  if (user === undefined) return <p className={styles.notice}>Loading…</p>
  if (user === null) return <FantasyLogin onLoggedIn={setUser} />

  async function signOut() {
    await logout()
    setUser(null)
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Fantasy League</p>
          <h1 className={styles.title}>Welcome, {user.name}</h1>
          <p className={styles.funFact}>&ldquo;{user.fun_fact}&rdquo;</p>
        </div>
        <button className={styles.logout} onClick={signOut}>
          Log out
        </button>
      </header>

      <FantasyRules />
      <FantasyTeam />
    </div>
  )
}
