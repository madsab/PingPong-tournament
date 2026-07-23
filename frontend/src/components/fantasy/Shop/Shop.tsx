import styles from './Shop.module.css'

interface ShopProps {
  boosterPrice: number
  boostersAvailable: number
  balance: number
  onBuy: () => void
}

const money = new Intl.NumberFormat('nb-NO')

// The Booster shop: buy one one-time Booster, then place it on a player. Selling is
// on the player cards; this panel only sells the Booster itself.
export function Shop({ boosterPrice, boostersAvailable, balance, onBuy }: ShopProps) {
  const alreadyHolding = boostersAvailable > 0
  const tooDear = balance < boosterPrice
  const disabled = alreadyHolding || tooDear

  const hint = alreadyHolding
    ? 'Place your Booster on a player, then use it.'
    : tooDear
      ? 'Not enough CompuBucks yet.'
      : "Your player's next win pays 50% more. One match only."

  return (
    <section className={styles.shop} aria-label="Booster shop">
      <span className={styles.icon} aria-hidden="true">
        ⚡
      </span>
      <div className={styles.text}>
        <h3 className={styles.title}>Booster</h3>
        <p className={styles.hint}>{hint}</p>
      </div>
      <button
        type="button"
        className={styles.buy}
        onClick={onBuy}
        disabled={disabled}
      >
        {alreadyHolding ? 'Owned' : `Buy · ${money.format(boosterPrice)} CB`}
      </button>
    </section>
  )
}
