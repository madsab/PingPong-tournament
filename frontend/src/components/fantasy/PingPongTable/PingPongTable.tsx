import styles from './PingPongTable.module.css'

// A little ping-pong table drawn as SVG, shown in the middle of the fantasy squad
// (2 players on each side). Purely decorative, so it's hidden from screen readers
// and scales to its container.
export function PingPongTable() {
  return (
    <svg
      className={styles.table}
      viewBox="0 0 200 120"
      role="img"
      aria-label="Ping-pong table"
      preserveAspectRatio="xMidYMid meet"
    >
      {/* table surface */}
      <rect x="10" y="20" width="180" height="80" rx="6" fill="#0b6b3a" stroke="#053d21" strokeWidth="3" />
      {/* outer white lines */}
      <rect x="10" y="20" width="180" height="80" rx="6" fill="none" stroke="#ffffff" strokeWidth="2" />
      {/* center line */}
      <line x1="10" y1="60" x2="190" y2="60" stroke="#ffffff" strokeWidth="1.5" strokeDasharray="4 4" />
      {/* net */}
      <line x1="100" y1="12" x2="100" y2="108" stroke="#e9eef2" strokeWidth="3" />
      <line x1="100" y1="16" x2="100" y2="104" stroke="#9fb0bd" strokeWidth="1" strokeDasharray="2 3" />
      {/* net posts */}
      <circle cx="100" cy="14" r="3" fill="#cfd8df" />
      <circle cx="100" cy="106" r="3" fill="#cfd8df" />
    </svg>
  )
}
