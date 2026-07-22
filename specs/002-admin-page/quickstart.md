# Quickstart: Admin Page (F6–F13)

How to run and validate the admin area end-to-end. Details live in
[data-model.md](./data-model.md) and [contracts/admin.md](./contracts/admin.md).

## Prerequisites

- Docker + Docker Compose (frontend, backend, Postgres).
- Two new backend env vars (add to `docker-compose.yml` / your env):
  - `ADMIN_PASSWORD_HASH` — hash of the shared password (see below).
  - `SESSION_SECRET` — any long random string used to sign the session cookie.

### Generate the password hash

```bash
cd backend
python -m app.auth hash "your-shared-password"   # prints salt$iterations$hexhash
```

Copy the printed value into `ADMIN_PASSWORD_HASH`. The plain password is never stored.

## Run everything

```bash
docker compose up --build
```

- Public site: http://localhost:5173/
- Admin site:  http://localhost:5173/admin
- Backend:     http://localhost:8000

## Validate the backend

```bash
cd backend
pytest                              # all tests
pytest tests/test_auth.py          # login/logout + guard
pytest tests/test_schedule.py      # round-robin (missing pairings only, no dupes)
pytest tests/test_record_result.py # uneven pairing, game count, score validation
```

Quick manual API check (cookie jar keeps the session):

```bash
curl -sc cookies.txt -X POST http://localhost:8000/api/admin/login \
  -H 'Content-Type: application/json' -d '{"password":"your-shared-password"}'
curl -sb cookies.txt http://localhost:8000/api/admin/teams | jq
curl -sb cookies.txt -X POST http://localhost:8000/api/admin/schedule/generate | jq
```

## Validate the frontend

```bash
cd frontend
npm test        # Vitest: login gate, teams/members/matches managers, result form
npm run build   # tsc + production build
```

## Manual acceptance walk-through

Open http://localhost:5173/admin and confirm, against the spec's acceptance scenarios:

| Check | Ref |
|---|---|
| `/admin` is locked; wrong password rejected, correct password unlocks it | US1 / FR-001..003 |
| Logout re-locks `/admin`; direct admin actions refused without a session | US1 / FR-004, FR-005 |
| Create teams, add members (different roster sizes), rename, delete | US2 / FR-006..007 |
| Deleting a team removes its members and matches (nothing orphaned) | US2 / FR-010 |
| Editing a member's name leaves already-recorded completed games unchanged | US2 / FR-008, §3.1 |
| "Generate round-robin" creates all missing pairings; re-running adds none | US3 / FR-011 |
| Add a team, regenerate → only the new pairings appear | US3 / FR-011 |
| Record a result: set pairings, enter scores, save → match shows completed | US4 / FR-012, FR-015 |
| Uneven rosters → game count = larger team size, a smaller-team member repeats | US4 / FR-013, §3.2 |
| Negative or tied score is rejected with a clear message; match not completed | US4 / FR-014, F13 |
| After saving a result, public standings/leaderboard reflect it on next load | US4 / FR-016, SC-004 |
| Manually create/edit/delete a match | US5 / FR-009 |
| Every admin screen works at 375 / 768 / 1440 px with no horizontal page scroll | FR-017 / SC-007 |

## Definition of done for the admin page

- Auth tests (login, logout, guard rejects without session) pass.
- CRUD tests (teams/members/matches incl. cascade + member-NULL-on-delete) pass.
- Round-robin generation tests (only missing pairings, no duplicates) pass.
- Result-recording tests (uneven pairing, game count, score validation, recompute) pass.
- Admin UI component tests pass; screens are responsive.
- `npm run build` and `pytest` both green (constitution: never ship on red).
