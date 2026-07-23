import styles from './Navbar.module.css'

interface NavLink {
  href: string
  label: string
}

const LINKS: NavLink[] = [
  { href: '/', label: 'Tournament' },
  { href: '/fantasy', label: 'Fantasy' },
]

// A tiny top navbar so people can move between the public tournament page and the
// fantasy page. No router library — links are plain anchors and we mark the active
// one from the current path (a full page load is fine for two simple pages).
export function Navbar() {
  const path = window.location.pathname
  const isActive = (href: string) =>
    href === '/' ? path === '/' : path.startsWith(href)

  return (
    <nav className={styles.nav} aria-label="Primary">
      <span className={styles.brand}>🏓 PingPong</span>
      <ul className={styles.links}>
        {LINKS.map((link) => {
          const active = isActive(link.href)
          return (
            <li key={link.href}>
              <a
                href={link.href}
                className={active ? styles.linkActive : styles.link}
                aria-current={active ? 'page' : undefined}
              >
                {link.label}
              </a>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
