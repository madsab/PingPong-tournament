# PingPong — Specifications

A ping pong **tournament site** for a group of summer students. It should look cool and lean into fun and competition. This document describes **what the app must do** (its features and rules). The overall **visual design** is defined in §9.

## 1. Overview

- **Format**: Round-robin — every team plays every other team once.
- **Public site** (`/`): shows the overall ranking, the full match schedule (played + to-play), and match-by-match detail. Read-only, no login.
- **Admin site** (`/admin`): password-protected. Full control (create/read/update/delete) over teams, members, matches, and scores.

```
┌─────────────────────────────┐        ┌─────────────────────────────┐
│   Public page  (  /  )      │        │   Admin page  ( /admin )    │
│                             │        │                             │
│  1. Team ranking            │        │  Login / Logout             │
│  2. Individual leaderboard  │  reads │  CRUD: teams, members,      │
│  3. Match schedule          │◄───────│        matches, scores      │
│  4. Match-by-match detail   │  data  │  Generate round-robin       │
└─────────────────────────────┘        └─────────────────────────────┘
             ▲                                       │
             └───────────────  Postgres  ◄───────────┘
```

## 2. Feature list

The application must have the following features. Each links to the section that defines it in detail.

### Public site
- **F1 — Team ranking / standings**: Hero section of all teams with points and tiebreaks (§3.5, shown in §4).
- **F2 — Individual leaderboard**: per-member ranking across all games played (§3.6, shown in §4).
- **F3 — Match schedule**: one view of every match, clearly split into **played** and **to-play** (§4).
- **F4 — Match detail**: per match, the two teams, the result, and every individual game (who played whom + score) (§4).
- **F5 — Read-only, no login**: the public page shows whatever the admin has entered; nothing is hidden (§4).

### Admin site (`/admin`)
- **F6 — Password login**: single shared password unlocks the admin area (§5.1).
- **F7 — Admin logout**: a way to end the admin session, for shared/office machines (§5.1).
- **F8 — Manage teams**: create, rename, delete teams (§5.2).
- **F9 — Manage members**: create, edit, delete team members (§5.2).
- **F10 — Manage matches**: create, edit, delete matches (usually auto-created) (§5.2).
- **F11 — Generate round-robin**: one action creates every missing team-vs-team pairing without duplicating (§5.3).
- **F12 — Record a result**: set the member pairings for a match and enter each game's score (§5.4).
- **F13 — Score validation**: reject impossible scores — no negatives, and a single game must have a winner (no tie) (§3.3).

### Cross-cutting
- **F14 — Automatic recompute**: standings and leaderboards always reflect the latest data, computed on read (§3.5, §3.6, §7).

## 3. Core concepts & scoring rules

### 3.1 Teams and members

- A **team** has a name and a fixed roster of **members** (players).
- Teams may have **different numbers of members**.
- Rosters are editable by the admin at any time. Editing a roster does **not** change games already recorded for completed matches.

### 3.2 What a match is

A **match** is between two teams and is made up of several individual **games**.

- Each member plays **once** against a member of the opposing team.
- If one team has more members than the other, the **smaller team chooses** which of its members play again to cover the remaining opponents.
- So: **number of games in a match = the size of the larger team.** A member of the smaller team may appear in more than one game.

```
Team A (3 members)      Team B (2 members)
  Alice  ───────────────  Bob      → Game 1
  Carol  ───────────────  Dan      → Game 2
  Erin   ───────────────  Bob*     → Game 3   (*Team B repeats Bob to cover Erin)
```

### 3.3 Winning a game (and score validation)

- Each game stores two scores (e.g. `11–7`). The higher score wins that game.
- **Score validation (F13)**: both scores must be whole numbers ≥ 0, and the two scores **cannot be equal** — a single game must always have a winner. Scores failing these rules are rejected when the admin saves.

### 3.4 Winning a match

Decided in this order:

1. Team that **won the most games** wins the match.
2. If games won are **tied** → team with the higher **total point-difference** across all games in that match wins (points scored minus points conceded).
3. If still tied → the match is a **draw**.

### 3.5 Team ranking (the standings)

Points per match: **Win = 3, Draw = 1, Loss = 0.**

Teams are ranked by, in order:

1. Total points
2. Total point-difference across all their games (scored − conceded)
3. Head-to-head result between the tied teams
4. Team name (alphabetical) — final tiebreak so ordering is always stable

Only **completed** matches count toward the ranking.

### 3.6 Individual leaderboard

Per **member**, across all games they played:

- Games won, games lost, win % (games won ÷ games played)
- Point-difference (scored − conceded)

Ranked by: games won → win % → point-difference → name.

## 4. Public page (`/`)

A single scrolling page with these sections, top to bottom:

1. **Team ranking** — the standings table from §3.5. Top teams should stand out (e.g. a podium for the top 3 — visual detail decided later).
2. **Individual leaderboard** — the member ranking from §3.6.
3. **Match schedule** — every match, showing which are **played** and which are **to-play**, in one table/grid.
4. **Match detail** — each match listed with the two teams, the result, and every individual game (who played whom and the game score).

The page is read-only and reflects whatever the admin has entered. No numbers are hidden.

## 5. Admin page (`/admin`)

### 5.1 Login and logout

- **Single shared password** unlocks the admin area (no user accounts).
- The password is stored **only as a hash** in backend configuration (environment variable) — never in the frontend or in the database as plain text.
- On correct password, the backend issues a session token (cookie); admin API calls require it. Wrong password is rejected.
- **Logout (F7)**: the admin can end the session, which clears the token so `/admin` requires the password again — important on shared machines.

### 5.2 What the admin can do (CRUD)

| Thing | Create | Read | Update | Delete |
|---|---|---|---|---|
| Teams | ✅ | ✅ | ✅ (rename) | ✅ |
| Members | ✅ | ✅ | ✅ | ✅ |
| Matches | ✅ (usually auto) | ✅ | ✅ | ✅ |
| Games / scores | ✅ | ✅ | ✅ | ✅ |

### 5.3 Generating the schedule

- The admin triggers **"generate round-robin"**: the system creates one `scheduled` match for **every pair of teams that doesn't already have one**.
- Running it again after adding a new team fills in only the **missing** pairings — it never duplicates existing matches.

### 5.4 Recording a result

For a scheduled match, the admin:

1. Sets the **pairings** — which member faces which for each game (and picks who the smaller team repeats, per §3.2).
2. Enters each **game's score** (validated per §3.3).
3. Saves → the match becomes `completed`. Standings and leaderboards update automatically (they are computed from the data, not stored — see §7).

The admin can edit or delete a completed match's games later; rankings recompute accordingly.

## 6. Non-goals (out of scope for now)

To keep the first version simple (YAGNI):

- No public accounts, comments, or predictions.
- No brackets, playoffs, or group stages — round-robin only.
- No live/real-time score updates — the page reflects data on load/refresh.
- No audit log of who changed what (single shared admin password).
- No "fun stats / records" section yet (biggest blowout, streaks, etc.) — may be added later.
- The visual/branding design is **not** specified here — handled later.

## 7. Technical notes

Uses the stack already in the repo (per the project constitution — no new frameworks unless the existing ones genuinely can't do the job):

- **Frontend**: Vite + React + TypeScript + CSS Modules; Shadcn and Magic UI for components/animation. ReactFlow for diagrams and figures.
- **Backend**: FastAPI (Python 3.14), talking to Postgres via SQLAlchemy + `psycopg` (v3).
- **Infra**: Docker Compose runs frontend, backend, and Postgres together.

Key decisions:

- **Standings and leaderboards are computed on read**, from completed matches — nothing derived is stored. At this scale (a handful of teams, dozens of matches) this is fast enough and avoids any "cache out of sync" bugs. The ranking math lives in plain, well-tested Python functions.
- The backend exposes **public read-only endpoints** (standings, matches with games, leaderboard) and **admin endpoints** (login, logout, CRUD, generate schedule) that require the session token.

## 8. Testing

Per the constitution, **tests come before code**. The ranking rules in §3 are the most important thing to test-drive:

- Match-winner logic including the games-tie → point-difference → draw path.
- Team standings ordering including every tiebreak level.
- Individual leaderboard ordering.
- The uneven-team-size pairing rule (larger team's size sets the game count; a member can repeat).
- "Generate round-robin" creates exactly the missing pairings and never duplicates.
- Score validation rejects negatives and tied single-game scores.

## 9. Visual design

The look is **dark, hot, and competitive** — a black arena lit by red and orange
heat, with clean white text. The whole page should feel like two teams squaring up
for a fight, not a spreadsheet. This section is the single source of truth for
colors, type, and the signature look; individual features reference it.

### 9.1 Design direction

- **Mood**: powerful, high-contrast, a little theatrical. Fun and combative, not corporate.
- **Base**: near-black background so the red/orange heat and white text pop.
- **The idea in one line**: *the top two teams collide in the middle of the screen and
  the point of impact glows.*

### 9.2 Color palette

All colors are dark-theme. White is the primary text color. Gold is used **only** for
the rank-1 champion — its rarity is what makes it feel like a trophy.

| Token | Hex | Where it's used |
|---|---|---|
| **Ink** | `#0A0A0B` | Page background (near-black). |
| **Char** | `#151517` | Cards, table rows, raised surfaces. |
| **Ember** | `#E01F26` | Red heat — the **team A / left** side of the fight, primary actions. |
| **Flame** | `#FF6A00` | Orange heat — the **team B / right** side, gradient partner to Ember. |
| **Champion Gold** | `#FFC24B` | **Rank-1 team only** — crown/laurel mark and rank badge. Never used elsewhere. |
| **White** | `#FFFFFF` | Primary text. |
| **Ash** | `rgba(255,255,255,.60)` | Secondary text, eyebrows, labels, muted stats. |
| **Hairline** | `rgba(255,255,255,.08)` | Borders and dividers. |

- **Heat gradient**: `Ember → Flame` (`#E01F26 → #FF6A00`), left-to-right. This is the
  signature gradient — used on the central collision seam and on primary highlights.
- **Two-sided rule**: the two leaders are lit by **different** colors — the left/#1
  side glows red (Ember), the right/#2 side glows orange (Flame) — so the hero reads as
  two opponents, not one theme.
- **Contrast**: white on Ink and Char must stay comfortably readable; muted text uses
  Ash, never a dimmer gray, so it still passes contrast on the dark base.

### 9.3 Typography

**One clean, standard family — [Inter](https://fonts.google.com/specimen/Inter)** — used
across every role. Personality comes from **scale and weight**, not an exotic face.

| Role | Treatment |
|---|---|
| **Scores** (the VS number) | Inter, weight 800, very large, `tabular-nums` so digits don't shift. |
| **Team names** | Inter, weight 700, UPPERCASE, tight letter-spacing. |
| **Eyebrows / labels** | Inter, weight 600, UPPERCASE, wide letter-spacing, in Ash. |
| **Table & body** | Inter, weight 400–500, normal case. |

Fallback stack: `Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`.

### 9.4 Signature element — "The Rift"

The one thing the page is remembered by. Down the **center of the hero** runs a glowing
vertical seam in the `Ember → Flame` gradient — the line where the two teams collide.
The **score sits inside the Rift**.

```
        [ STANDINGS · MATCHDAY 3 ]        ← eyebrow, Ash, wide tracking

  ┌──────────────────┐  ║        ║  ┌──────────────────┐
  │  #1  TEAM A       │  ║   9    ║  │       TEAM B  #2  │
  │  (red glow)       │  ║  ─VS─  ║  │      (orange glow)│
  │  logo  ►►►        │  ║   6    ║  │        ◄◄◄  logo  │
  │  ✦ gold crown     │  ║ (Rift) ║  │                   │
  └──────────────────┘  ╚════════╝  └──────────────────┘
   ▲ Ember side          ▲ glowing     ▲ Flame side
                           seam
  ────────────────────────────────────────────────────────
   RANK  TEAM            PLAYED  W-D-L   PTS   DIFF     ← table (rank 3+)
    3    Team C            3      2-0-1    6    +8
    4    Team D            3      1-0-2    3    -4
```

- On page load (per F1 / §001 spec), the two leaders' logos **slide in from their own
  sides toward the Rift**; as they arrive, the seam **flares brighter** — that flare is
  the "fighting" illusion. Only the top two animate this way.
- The **rank-1 team** carries Champion Gold (a small crown/laurel mark + its rank badge);
  everyone else is red/orange/white only.
- Everything around the Rift stays quiet and disciplined so the seam is the focal point.

### 9.5 Motion

- **Leaders' slide-in + Rift flare** on load (the signature moment).
- **Ambient embers**: faint particles drifting upward behind the Rift, very subtle — sells
  "heat" without clutter.
- Hover: table rows lift slightly with a hairline Ember underline.
- **Reduced motion**: with `prefers-reduced-motion: reduce`, all of the above are disabled
  — logos render in their final positions, embers off, no flare. The static page must look
  complete on its own.

### 9.6 Layout & responsiveness

- **Desktop**: two teams left/right, Rift and score between them (§9.4).
- **Mobile**: the two teams **stack top/bottom** with the Rift as a **horizontal** seam
  between them — the score stays in the middle.
- Use relative units and flex/grid; **no fixed pixel width/height** unless strictly
  required (per constitution §V — responsive design).
- Base surfaces: Ink for the page, Char for cards and table rows, Hairline for dividers.

### 9.7 Accessibility floor

- White/Ash text keeps readable contrast on Ink and Char.
- Visible keyboard focus (an Ember/Flame focus ring) on every interactive element.
- Color is never the *only* signal — rank position and labels also carry the meaning
  (e.g. the champion has a crown *and* the "#1" label, not just gold).
