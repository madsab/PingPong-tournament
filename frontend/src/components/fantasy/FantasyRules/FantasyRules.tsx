import styles from "./FantasyRules.module.css"

// How the fantasy economy works, in Norwegian. Short and scannable — mirrors the
// public RulesBanner: a static, data-less note shown on the fantasy page.
export function FantasyRules() {
  return (
    <aside className={styles.banner} role="note" aria-label="Fantasy-regler">
      <p className={styles.label}>Slik funker Fantasy</p>
      <ol className={styles.list}>
        <li>
          Du starter med <strong>100 000 000 CompuBucks</strong>.
        </li>
        <li>
          Spillere koster penger — kjøp opptil fire til laget ditt (du kan
          lagre laget med så mange eller få spillere du vil; bedre spillere
          koster mer).
        </li>
        <li>
          Vil du bytte? Selg spilleren for <strong>85 %</strong> av det du
          betalte.
        </li>
        <li>
          Vinner en spiller en delkamp får du <strong>+5 000 000</strong>; taper
          de <strong>−2 000 000</strong>. Du går aldri under 0.
        </li>
        <li>          
          <strong>Golden racket</strong> kan gis til én spiller, denne spilleren
          for da dobbel gevinst og tap (+10 mill / −4 mill).
        </li>
        <li>
          <strong>Booster</strong> fra butikken: en engangsboost som gir 50 %
          mer hvis spilleren vinner neste delkamp. Stables ikke med racketen.
        </li>
      </ol>
    </aside>
  )
}
