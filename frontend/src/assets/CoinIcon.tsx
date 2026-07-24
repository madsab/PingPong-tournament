import styles from "./Coin.module.css"

export const CoinIcon = () => {
  return (
    <svg
      className={styles.coin}
      viewBox="0 0 24 24"
      aria-hidden="true"
      focusable="false"
    >
      <circle
        cx="12"
        cy="12"
        r="11"
        fill="#f4b942"
        stroke="#c98a1a"
        strokeWidth="2"
      />
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
  )
}
