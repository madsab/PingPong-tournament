# Quickstart: Fantasy CompuBucks Economy

How to run the app with this feature and validate it end-to-end. Assumes the repo is set
up per the root `CLAUDE.md`.

## Prerequisites

- Docker (for Postgres) or a local Python venv + Node.
- Feature branch `008-fantasy-economy` checked out.

## Run it

```bash
# Everything together (recommended)
docker compose up --build
# Frontend  http://localhost:5173   Backend http://localhost:8000   Postgres :5432
```

The backend container runs `alembic upgrade head` on startup, so migration `0003`
(prices, balance, power-ups, settings, settlements) applies automatically. On an existing
database this also **resets fantasy users to 100,000,000 and clears their old picks**
(documented rollout behaviour).

Backend only:

```bash
cd backend && source .venv/bin/activate
alembic upgrade head          # apply schema
python -m app.seed            # demo teams/members WITH prices + a demo manager with a bought squad
uvicorn app.main:app --reload
```

## Validate (maps to Success Criteria)

Do these as an admin, then as a fantasy user.

### 1. Admin sets prices (SC-… FR-001/002/003)
1. Log in to `/admin`, open Teams.
2. Give a few members a price; leave one member unpriced.
3. Set the booster price (or leave the 1,000,000 default).
   - ✅ Priced members show a price; the unpriced one is not buyable in the fantasy picker.

### 2. Buy & sell within a budget (SC-001/002/003)
1. Go to `/fantasy`, log in (or register).
   - ✅ New user starts at **100,000,000**.
2. Buy a 20,000,000 player → ✅ balance becomes **80,000,000**.
3. Try to buy a player you can't afford → ✅ rejected, nothing changes.
4. Sell that player → ✅ you get back **17,000,000** (85%), slot empties.

### 3. Earn & lose, with the floor (SC-004/005/006)
1. Buy a player, then as admin record a match that player **won** → ✅ balance +5,000,000.
2. Record a match that player **lost** → ✅ balance −2,000,000.
3. Drive the balance down with losses → ✅ it stops at **0**, never negative.
4. Record a game that finished **before** you bought the player → ✅ it does not count.

### 4. Golden Racket (SC-007)
1. Assign the racket to one player → ✅ golden racket icon shows on that card only.
2. That player wins a game → ✅ +10,000,000; loses → ✅ −4,000,000.
3. Move the racket to another player → ✅ it leaves the first (only one at a time).

### 5. Booster shop (SC-008)
1. Buy a Booster in the shop → ✅ balance drops by the booster price; you hold one.
2. Place it on a player → ✅ booster icon on that card.
3. That player wins their next game → ✅ +7,500,000 (50% more), booster gone.
4. Put a booster on the racket-holder and they win → ✅ +10,000,000 only (no stacking).

### 6. Rules (SC-010)
- Open `/fantasy` → ✅ the (Norwegian) rules briefly explain start balance, buy/sell 85%,
  +5M / −2M, the Racket (double), and the Booster (+50%, one-time). Short and scannable.

## Tests

```bash
# Backend — economy math + endpoints + migration parity
cd backend && pytest tests/test_fantasy_scoring.py tests/test_fantasy_api.py \
                     tests/test_admin_pricing.py tests/test_migrations.py

# Frontend — slot card (price/racket/booster), shop, rules
cd frontend && npm test
```

Details of shapes and rules live in [`contracts/economy-api.md`](./contracts/economy-api.md),
[`contracts/admin-pricing.md`](./contracts/admin-pricing.md), and
[`data-model.md`](./data-model.md). Frontend visuals follow the `/frontend-design` skill
during implementation.
