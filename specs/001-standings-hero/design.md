# Phase 1 Design: Team Ranking Hero (F1)

How **SPECIFICATIONS §9** (the single source of truth for the visual identity) maps
onto the F1 components. This file does **not** redefine colors or type — it references
§9 and says how each piece is built. Values live once in `src/theme/tokens.css`.

## Design tokens (`src/theme/tokens.css`)

Encode §9.2 (color) and §9.3 (type) as CSS custom properties. Components read these
variables; no component hard-codes a hex.

| Token | Source (§9) | Example var |
|---|---|---|
| Page background (Ink) | §9.2 | `--color-ink: #0A0A0B` |
| Surface (Char) | §9.2 | `--color-char: #151517` |
| Ember red (left/#1 heat) | §9.2 | `--color-ember: #E01F26` |
| Flame orange (right/#2 heat) | §9.2 | `--color-flame: #FF6A00` |
| Champion Gold (rank 1 only) | §9.2 | `--color-gold: #FFC24B` |
| Text white | §9.2 | `--color-text: #FFFFFF` |
| Ash (muted) | §9.2 | `--color-ash: rgba(255,255,255,.60)` |
| Hairline | §9.2 | `--color-hairline: rgba(255,255,255,.08)` |
| Heat gradient | §9.2 | `--grad-heat: linear-gradient(90deg, var(--color-ember), var(--color-flame))` |
| Font family | §9.3 | `--font: Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif` |
| Display weights | §9.3 | `--fw-score:800; --fw-name:700; --fw-label:600; --fw-body:400` |

`index.css` sets the global defaults: Ink background, `--font`, white text.

## Component → §9 mapping

### StandingsSection
- Wrapper for the whole F1 section. Owns the empty / single-team fallback states
  (FR-010) — an empty state on Ink with an Ash message, not a broken hero.

### StandingsHero (§9.4)
- Two `TeamCrest`s (rank 1 left, rank 2 right) with the `Rift` between them.
- Layout: CSS grid `[crest] [rift] [crest]` on desktop; on mobile it becomes a single
  column `[crest] / [rift] / [crest]` with a **horizontal** Rift (§9.6).
- Orchestrates the load animation: on mount, toggles a class that (a) slides both
  crests inward and (b) triggers the Rift flare. Guarded by `prefers-reduced-motion`.

### Rift (§9.4 signature)
- The center seam: background `--grad-heat`, a glow via `box-shadow` + blurred
  pseudo-element, and the **score** (`--fw-score`, `tabular-nums`) sitting inside it
  with a small "VS".
- **Flare** = a keyframe that briefly raises glow opacity/blur when the crests arrive.
- **Ambient embers** = a few absolutely-positioned dots drifting up behind the seam
  (§9.5), purely decorative (`aria-hidden`).

### TeamCrest
- One leader: logo image or placeholder (team initials on a Char tile, FR-011), team
  name (`--fw-name`, uppercase), and a **side glow** — Ember for the left/#1 crest,
  Flame for the right/#2 crest (§9.2 two-sided rule).
- **Rank-1 only**: Champion Gold crown mark + gold rank badge (§9.2, §9.4). No other
  element uses gold.
- Slide-in transform origin is its own side (left crest from left, right from right).

### StandingsTable (§9.4 lower block)
- Teams ranked 3+ in a table on Char rows with Hairline dividers.
- Columns: Rank, Team, Played, W-D-L, Pts, Diff (matches the §9.4 wireframe and the
  contract fields in [contracts/standings.md](./contracts/standings.md)).
- Hover: row lifts with a hairline Ember underline (§9.5). No slide-in here (FR-008).

## Motion spec (§9.5) — reduced-motion is the baseline

| Effect | Full motion | `prefers-reduced-motion: reduce` |
|---|---|---|
| Crest slide-in | Translate from each side to center, ≤1.5s total (SC-004) | Rendered at final center position, no transition |
| Rift flare | Glow brightens as crests arrive | Static glow, no flare |
| Ambient embers | Slow upward drift | Hidden |
| Table row hover | Lift + Ember underline | Underline only (no transform) |

The static (reduced-motion) page must look finished on its own — animation is polish,
never required to read the standings (US3, SC-006).

## Accessibility (§9.7)

- White/Ash text keeps readable contrast on Ink and Char (verify during build).
- Visible keyboard focus ring in Ember/Flame on any interactive element.
- Color is never the only signal: the champion shows a crown **and** the "#1" label,
  and the two sides differ by position + label, not just hue.
- Decorative layers (embers, glow) are `aria-hidden`; the score/names are real text.

## Testing the design (co-located component tests)

Behavioural, not pixel-perfect:
- Rank 1 crest renders on the left with the gold champion marker; rank 2 on the right
  with no gold.
- A team with no `logo_url` renders the initials placeholder.
- With `prefers-reduced-motion` mocked, no slide-in transition class / embers are applied.
- Table lists only rank ≥ 3, in order; no slide-in animation classes on table rows.
- Empty `teams` → empty state; single team → single leader + placeholder opponent.
