import { CoinIcon } from "../../../assets/CoinIcon"
import styles from "./CompuBucks.module.css"

// Groups the amount like money (e.g. 1 240). Norwegian locale to match the rules.
const fmt = new Intl.NumberFormat("nb-NO")

// Shows a CompuBucks amount like money, with a small gold coin icon. The coin uses
// its own inline gold so it stays distinct from the champion-only --color-gold token.
export function CompuBucks({ amount }: { amount: number }) {
  return (
    <span className={styles.wrap}>
      <CoinIcon />
      <span className={styles.amount} data-testid="cb-amount">
        {fmt.format(amount)}
      </span>
      <span className={styles.unit}>CompuBucks</span>
    </span>
  )
}
