import styles from './CompuBucks.module.css'

// Groups the amount like money (e.g. 1 240). Norwegian locale to match the rules.
const fmt = new Intl.NumberFormat('nb-NO')

// Shows a CompuBucks amount like money, with a small gold coin icon. The coin uses
// its own inline gold so it stays distinct from the champion-only --color-gold token.
export function CompuBucks({ amount }: { amount: number }) {
  return (
    <span className={styles.wrap}>
      <svg
        className={styles.coin}
        viewBox="0 0 24 24"
        aria-hidden="true"
        focusable="false"
      >
        <circle cx="12" cy="12" r="11" fill="#f4b942" stroke="#c98a1a" strokeWidth="2" />
        <text
          x="12"
          y="16"
          textAnchor="middle"
          fontSize="12"
          fontWeight="800"
          fill="#7a4d06"
        >
          C
        </text>
      </svg>
      <span className={styles.amount} data-testid="cb-amount">
        {fmt.format(amount)}
      </span>
      <span className={styles.unit}>CompuBucks</span>
    </span>
  )
}
