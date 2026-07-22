# Free web deployment — design

**Date:** 2026-07-22
**Goal:** Deploy PingPong (frontend + backend + database) to the public web, entirely on free tiers, with no rewrite of the app.

## Chosen stack

| Layer | Service | Free tier | Notes |
|---|---|---|---|
| Frontend (Vite/React static) | **Vercel** | Free forever, no sleep | User already has an account |
| Backend (FastAPI in Docker) | **Render** | Free web service; sleeps after ~15 min idle (~30s cold start) | Builds from existing Dockerfile |
| Database (Postgres 17) | **Neon** | Free forever, 0.5 GB | Serverless Postgres; keeps `psycopg` v3 code unchanged |

Vercel has no database or long-running server of its own, so "all three on Vercel" is not possible. Render runs the FastAPI server as-is; Neon provides Postgres.

## Data flow

```
   Browser
      │
      ▼
┌──────────────┐   VITE_API_BASE     ┌──────────────┐   DATABASE_URL   ┌────────────┐
│    VERCEL    │ ──── fetch() ─────► │    RENDER    │ ──── psycopg ──► │    NEON    │
│  Vite build  │   (with cookie)     │ FastAPI/uvic │                  │  Postgres  │
│  static site │ ◄─── JSON ───────── │  Docker      │ ◄─────────────── │  free tier │
└──────────────┘                     └──────────────┘                  └────────────┘
```

The frontend and backend live on **different domains** (`*.vercel.app` and `*.onrender.com`). That cross-origin split drives the two most important code changes below (CORS and the session cookie).

## Code changes

### 1. `backend/app/main.py` — environment-driven CORS
- Read allowed origins from a new `FRONTEND_ORIGIN` env var (comma-separated to allow more than one). Fall back to `http://localhost:5173` when unset so local dev is unchanged.
- Keep `allow_credentials=True`. Because credentials are on, origins **cannot** be `"*"` — they must be the explicit Vercel URL(s).

### 2. `backend/app/main.py` — cross-site session cookie
- `SessionMiddleware` must send the admin cookie with `same_site="none"` and `https_only=True` in production, or the browser silently drops it on cross-site requests and admin login "succeeds" but every guarded call returns 401.
- Make both configurable via env so local dev keeps working:
  - `SESSION_COOKIE_SAMESITE` — default `"lax"` (local); set `"none"` in prod.
  - `SESSION_COOKIE_HTTPS_ONLY` — default `false` (local http); set `true` in prod.
- Read these in `app/config.py` alongside the existing secrets (same lazy-read pattern), so they are testable with `monkeypatch`.

### 3. `backend/Dockerfile` — production start command
- Change `CMD` to a production command: no `--reload`, and bind to Render's injected port using shell form so the variable expands:
  `CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}`
- Render sets `$PORT`; locally it defaults to 8000.

### 4. `docker-compose.yml` — keep local hot-reload
- After change #3 the image's default command no longer reloads. Add a `command:` override on the `backend` service for local dev:
  `command: uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`
- Local dev keeps hot-reload; Render uses the Dockerfile's production `CMD`.

### 5. `backend/app/seed.py` — real launch roster
Replace the demo `TEAMS`, `MATCHES`, and `SCHEDULED_MATCHES` with the real data:

| Team | Members |
|---|---|
| Azets | Fredrik, Klein, Thone, Live |
| UDI | David, Isak |
| Gausdal | Julie, Shervin, Anna |
| Hafslund | Sofie, Sebastian, Mads |

- `MATCHES = []` and `SCHEDULED_MATCHES = []` (no matches at launch).
- Keep the existing two self-contained SVG demo logos? **No** — real teams get no logo at launch (`logo_url=None`); logos are added later via the admin page (Team logos feature). Keeps the seed honest.
- The seed still guards on "skip if teams already exist", so it stays safe to re-run.
- Trade-off accepted by user: this also changes local dev data — the local schedule/standings sections will be empty until matches are added via `/admin`.

## New config files

### `render.yaml` (repo root) — Render blueprint
Defines the backend as a Docker web service on the free plan, with the env vars declared (secret values entered in the dashboard, not committed):
- `env: docker`, `dockerfilePath: ./backend/Dockerfile`, `dockerContext: ./backend`, `plan: free`.
- Env vars: `DATABASE_URL`, `SESSION_SECRET`, `ADMIN_PASSWORD_HASH`, `FRONTEND_ORIGIN`, `SESSION_COOKIE_SAMESITE=none`, `SESSION_COOKIE_HTTPS_ONLY=true`. Secrets marked `sync: false` so they are set in the dashboard.

### `frontend/vercel.json` — SPA fallback
`App.tsx` splits the path itself (no router library), so a direct load of `/admin` must still return `index.html`:
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```
Vercel auto-detects the Vite preset; the project root is set to `frontend/` in the dashboard.

## Environment variables (set in dashboards, never committed)

| Where | Var | Value |
|---|---|---|
| Render | `DATABASE_URL` | Neon pooled connection string |
| Render | `SESSION_SECRET` | random 32+ byte string (`python -c "import secrets; print(secrets.token_hex(32))"`) |
| Render | `ADMIN_PASSWORD_HASH` | output of `python -m app.auth hash "<password>"` |
| Render | `FRONTEND_ORIGIN` | the `https://<project>.vercel.app` URL |
| Render | `SESSION_COOKIE_SAMESITE` | `none` |
| Render | `SESSION_COOKIE_HTTPS_ONLY` | `true` |
| Vercel | `VITE_API_BASE` | the `https://<service>.onrender.com` URL |

Note: `VITE_API_BASE` is baked into the frontend at build time, and `FRONTEND_ORIGIN` needs the final Vercel URL. This creates a small ordering dependency handled in the deploy guide (deploy backend first with a placeholder, then set the real values and redeploy).

## Deliverable

- The five code changes and two config files above.
- **`DEPLOY.md`** at repo root: click-by-click steps in order — Neon (create DB, copy URL) → Render (deploy backend, set env vars) → Vercel (deploy frontend, set `VITE_API_BASE`) → set `FRONTEND_ORIGIN` back on Render → run the seed once via Render's shell (`python -m app.seed`).
- Update `CLAUDE.md` with a short "Deployment" section pointing at `DEPLOY.md`.

## Testing

- Backend: a small test asserting `main.py` reads `FRONTEND_ORIGIN` and the cookie settings from env (defaults preserved when unset). No live-cloud test.
- Manual verification checklist in `DEPLOY.md`: public page loads from Vercel; admin login works across domains (proves the SameSite=None cookie); a result recorded in admin appears on the public page.

## Out of scope

- Custom domains, CI/CD auto-deploy pipelines, database migrations tooling, keeping the backend warm (paid). The free cold-start is accepted.
