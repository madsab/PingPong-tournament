import { useState } from 'react'
import { initials } from '../../lib/initials'
import styles from './TeamLogo.module.css'

interface TeamLogoProps {
  logoUrl: string | null
  // The team name — drives the initials fallback and is the real, visible label
  // sitting next to this logo, so the logo itself is decorative (aria-hidden).
  name: string
}

// A small round team logo shown immediately before a team name in the public
// tables (FR-004). Falls back to the team's initials when there is no logo or the
// image fails to load, so a missing/broken URL never shows a broken-image icon
// (FR-005, §9.7). The hero uses its own larger TeamCrest.
export function TeamLogo({ logoUrl, name }: TeamLogoProps) {
  const [failed, setFailed] = useState(false)
  const showImage = Boolean(logoUrl) && !failed

  return (
    <span className={styles.logo} aria-hidden="true">
      {showImage ? (
        <img
          src={logoUrl!}
          alt=""
          className={styles.image}
          onError={() => setFailed(true)}
        />
      ) : (
        <span className={styles.placeholder}>{initials(name)}</span>
      )}
    </span>
  )
}
