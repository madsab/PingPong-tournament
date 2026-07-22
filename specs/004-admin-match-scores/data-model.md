# Data Model: Admin Match-Card Scores & Pre-Filled Edit Form

**No schema changes.** This feature only reads data already present on the admin API's match payload. Listed here for reference.

## Entities read (existing, unchanged)

### Match (from `frontend/src/api/admin.ts`)

| Field | Type | Used for |
|-------|------|----------|
| `id` | number | identify the match |
| `team_a` / `team_b` | `{ id, name }` | matchup label (already shown) |
| `status` | string (`"scheduled"` \| `"completed"`) | status label (already shown) |
| `games` | `Game[]` | **new use**: compute card score + pre-fill form |

### Game (from `frontend/src/api/admin.ts`)

| Field | Type | Used for |
|-------|------|----------|
| `team_a_score` | number | games-won count; pre-fill score input |
| `team_b_score` | number | games-won count; pre-fill score input |
| `member_a_id` | number \| null | pre-fill the team-A player of the row |
| `member_b_id` | number \| null | pre-fill the team-B player of the row |

## Derived values (computed on the frontend, not stored)

### Games-won score

For a match's `games`, count per game which side scored higher (scores are never equal — backend `game_has_a_winner` constraint):

```
aWon = games.filter(g => g.team_a_score > g.team_b_score).length
bWon = games.length - aWon
```

- Displayed as `"{aWon} – {bWon}"` on the card.
- Shown **only** when `games.length > 0` (FR-002). A match with no games shows no score.

### Pre-filled form rows

When `match.games.length > 0`, each saved `Game` maps to one existing `Row`:

```
Row {
  aId:    game.member_a_id ?? 0      // 0 = "pick a member" fallback (FR-009)
  bId:    game.member_b_id ?? 0
  aScore: String(game.team_a_score)  // string state for <input type=number>
  bScore: String(game.team_b_score)
}
```

When `match.games.length === 0`, the current blank generation is unchanged (one row per larger-team member, empty scores).

## Validation

Unchanged — the existing `recordResult` save path enforces §3.3 (whole numbers ≥ 0, no ties) on every save, including saves from a pre-filled form (FR-007).
