import styles from './FantasyRules.module.css'

// How the fantasy game works, in Norwegian. Mirrors the public RulesBanner: a
// static, data-less note shown on the fantasy page.
export function FantasyRules() {
  return (
    <aside className={styles.banner} role="note" aria-label="Fantasy-regler">
      <p className={styles.label}>Slik funker Fantasy</p>
      <ol className={styles.list}>
        <li>Registrer deg med navnet ditt og et morsomt faktum om deg selv (påkrevd).</li>
        <li>Ingen passord — navnet ditt er innloggingen, og vi husker deg på denne enheten.</li>
        <li>Velg fire ekte spillere fra de virkelige lagene til fantasy-laget ditt.</li>
        <li>Du tjener <strong>10 CompuBucks</strong> hver gang en av spillerne dine vinner en delkamp.</li>
        <li>Du får <strong>kun</strong> CompuBucks for delkamper som spilles <strong>etter</strong> at du la spilleren til laget ditt.</li>
        <li>Bytter du ut en spiller, starter klokka på nytt for den nye spilleren.</li>
      </ol>
    </aside>
  )
}
