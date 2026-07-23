# Phase 1 Data Model: Fantasy Ping Pong Teams

Two new tables. No existing table is changed, so `Base.metadata.create_all` adds them on
startup with **no database reset needed**. Reuses the existing `Member`/`Team`/`Match`/`Game`
tables read-only.

## Entity: FantasyUser (`fantasy_users`)

A person playing the fantasy game. The name is the identity (no password).

| Field | Type | Rules |
|-------|------|-------|
| `id` | int, PK | auto |
| `name` | str(100), not null | as typed, trimmed; shown back to the user |
| `name_key` | str(100), not null, **unique** | `name.strip().lower()`; all lookups use this (case-insensitive identity) |
| `fun_fact` | str(280), not null | required, non-empty after trim |
| `created_at` | datetime, not null | when they joined (server default) |

**Relationships**: `slots` → list[FantasySlot], `cascade="all, delete-orphan"`.

**Validation** (backend, before insert):
- `name` non-empty after `.strip()`, length ≤ 100 → else 422.
- `fun_fact` non-empty after `.strip()`, length ≤ 280 → else 422.
- `name_key` already exists → register returns 409 (name taken); login looks up by it.

## Entity: FantasySlot (`fantasy_slots`)

One row per *filled* slot. An empty slot is simply the absence of a row.

| Field | Type | Rules |
|-------|------|-------|
| `id` | int, PK | auto |
| `user_id` | int, FK → `fantasy_users.id` `ON DELETE CASCADE`, not null | owner |
| `slot_index` | int, not null | 1–4 (`CheckConstraint`) |
| `member_id` | int, FK → `members.id` `ON DELETE CASCADE`, not null | the real player |

**Table constraints**:
- `UNIQUE (user_id, slot_index)` — at most one player per box.
- `UNIQUE (user_id, member_id)` — no duplicate player on one team (FR-008).
- `CheckConstraint("slot_index BETWEEN 1 AND 4")` — four slots only (FR-006).

**Behaviour on Member deletion**: `ON DELETE CASCADE` removes the slot row, so the box goes
empty and stops earning CompuBucks — matches the spec edge case. (Unlike `Game`, which keeps
history via SET NULL, a slot is a *current* pick with no history to preserve.)

**Validation** (backend, on assign):
- `slot_index` in 1–4 → else 422.
- `member_id` exists in `members` → else 404.
- Member not already in another of this user's slots → else 409 (mapped from the unique
  constraint / checked in code first for a clean message).

## Computed (not stored): CompuBucks total

Derived on read by `app/fantasy.py`:

```
BUCKS_PER_WIN  = 10
BUCKS_PER_LOSS = 3   # participation

total = 0
member_ids = {slot.member_id for slot in user.slots}
for each match, for each game in match where match is completed:
    if game.member_a_id in member_ids:
        total += BUCKS_PER_WIN if game.team_a_score > game.team_b_score else BUCKS_PER_LOSS
    if game.member_b_id in member_ids:
        total += BUCKS_PER_WIN if game.team_b_score > game.team_a_score else BUCKS_PER_LOSS
```

Only games in completed matches count. A member appears at most once per user, so no
double-counting. Empty roster → 0.

## Reused entities (read-only)

- **Member** — `id`, `name`, `team_id`; source of the pick-list and CompuBucks performance.
- **Team** — `id`, `name`, `logo_url`; shown next to each picked player.
- **Match** / **Game** — `status`, per-game `team_a_score`/`team_b_score`, `member_a_id`/
  `member_b_id`; the raw performance CompuBucks reads.
