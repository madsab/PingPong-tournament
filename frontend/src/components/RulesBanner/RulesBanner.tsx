import styles from './RulesBanner.module.css'

// A compact, quiet "alert" of the tournament rules. It sits at the top of the
// schedule block as reference material — static text, no props, no data.
export function RulesBanner() {
  return (
    <aside className={styles.banner} role="note" aria-label="Spilleregler">
      <p className={styles.label}>Regler</p>
      <ol className={styles.list}>
        <li>
          Det spilles like mange delkamper som det største laget har spillere. Har det andre
          laget færre spillere, må de selv bestemme hvem som spiller flere ganger.
        </li>
        <li>Laget som vinner flest delkamper, vinner hele kampen.</li>
        <li>I delkamper er det førstemann til 11 poeng.</li>
        <li>For å bestemme hvem som server, spilles første ballen om serve.</li>
        <li>Proffer server bak bakkanten av bordet.</li>
        <li>
          <strong>Ingen</strong> får bruke world cup-racketen (Fairplay).
        </li>
      </ol>
    </aside>
  )
}
