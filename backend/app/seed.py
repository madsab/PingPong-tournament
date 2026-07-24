"""Insert sample tournament data for local dev and demos.

Real data entry is the admin feature (F6-F13), which doesn't exist yet. Until then
this script gives the public page something to show. Run it once:

    python -m app.seed

The schema is owned by Alembic migrations, so make sure they've run first
(`alembic upgrade head` — the backend container does this on startup). This script
then fills an empty database; if teams already exist it does nothing, so it's safe
to run twice.
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import select

from app.db import SessionLocal
from app.events import record_purchase
from app.models import (
    FantasySlot,
    FantasyUser,
    Game,
    Match,
    MatchStatus,
    Member,
    Team,
)
from app.settlement import settle_match

# A tiny self-contained SVG logo (a coloured disc with initials) so the demo shows
# real logos without needing any network/hosted image. Admins normally paste a URL.
def _demo_logo(initials: str, colour: str) -> str:
    svg = (
        "<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>"
        f"<circle cx='32' cy='32' r='30' fill='{colour}'/>"
        "<text x='32' y='41' font-family='sans-serif' font-size='24' "
        f"font-weight='700' text-anchor='middle' fill='white'>{initials}</text></svg>"
    )
    return "data:image/svg+xml;utf8," + svg


# (name, logo_url, [(member name, CompuBucks price)]) — good players cost more
# (feature 008). A couple of teams carry a demo logo.
TEAMS = [
    ("Spin Doctors", _demo_logo("SD", "crimson"),
     [("Ada", 30_000_000), ("Ben", 18_000_000), ("Cara", 12_000_000)]),
    ("Paddle Battle", _demo_logo("PB", "orangered"),
     [("Dan", 25_000_000), ("Eve", 15_000_000)]),
    ("Net Ninjas", None,
     [("Finn", 20_000_000), ("Gina", 16_000_000), ("Hugo", 10_000_000)]),
    ("Table Titans", None,
     [("Ivy", 22_000_000), ("Jack", 14_000_000)]),
]

# (team_a name, team_b name, [(a_score, b_score), ...]) — all completed.
MATCHES = [
    ("Spin Doctors", "Paddle Battle", [(11, 4), (11, 6), (9, 11)]),  # A wins 2-1
    ("Spin Doctors", "Net Ninjas", [(11, 8), (11, 9), (11, 7)]),  # A wins 3-0
    ("Spin Doctors", "Table Titans", [(11, 5), (8, 11), (11, 9)]),  # A wins 2-1
    ("Paddle Battle", "Net Ninjas", [(11, 7), (11, 5)]),  # A wins 2-0
    ("Paddle Battle", "Table Titans", [(11, 9), (7, 11), (11, 8)]),  # A wins 2-1
    ("Net Ninjas", "Table Titans", [(11, 6), (5, 11), (11, 13)]),  # B wins 2-1
]

# (team_a name, team_b name) — still to-play, so the F3 schedule has a "to-play" group.
SCHEDULED_MATCHES = [
    ("Net Ninjas", "Spin Doctors"),
    ("Table Titans", "Paddle Battle"),
]


def seed() -> None:
    # Tables are created by migrations (`alembic upgrade head`), not here.
    db = SessionLocal()
    try:
        if db.query(Team).count() > 0:
            print("Database already has teams — skipping seed.")
            return

        teams: dict[str, Team] = {}
        for name, logo_url, members in TEAMS:
            team = Team(name=name, logo_url=logo_url)
            team.members = [Member(name=n, price=p) for n, p in members]
            db.add(team)
            teams[name] = team
        db.flush()  # assign ids

        for a_name, b_name, scores in MATCHES:
            team_a, team_b = teams[a_name], teams[b_name]
            match = Match(
                team_a_id=team_a.id,
                team_b_id=team_b.id,
                status=MatchStatus.completed,
                # Fixed demo date. The demo fantasy manager's picks are dated a day
                # earlier (see below) so these games count toward their CompuBucks.
                completed_at=datetime(2026, 7, 20),
            )
            # Pair members up game-by-game, repeating the smaller team's roster to
            # cover the extra opponents (§3.2), so seeded games carry valid pairings.
            match.games = [
                Game(
                    team_a_score=a,
                    team_b_score=b,
                    member_a_id=team_a.members[i % len(team_a.members)].id,
                    member_b_id=team_b.members[i % len(team_b.members)].id,
                )
                for i, (a, b) in enumerate(scores)
            ]
            db.add(match)

        for a_name, b_name in SCHEDULED_MATCHES:
            db.add(
                Match(
                    team_a_id=teams[a_name].id,
                    team_b_id=teams[b_name].id,
                    status=MatchStatus.scheduled,
                )
            )

        db.flush()

        # A demo fantasy manager (feature 008) who has BOUGHT a couple of players, so
        # /fantasy shows a populated, paid-for team with a balance and earnings.
        picks = [
            teams["Spin Doctors"].members[0],  # Ada — plenty of real wins
            teams["Paddle Battle"].members[0],  # Dan
        ]
        spent = sum(m.price for m in picks)
        demo = FantasyUser(
            name="Demo Manager",
            name_key="demo manager",
            fun_fact="Once served an ace with my eyes closed.",
            balance=100_000_000 - spent,  # what's left after buying the squad
        )
        # Bought a day before the seeded games (2026-07-20) so those wins/losses count.
        demo.slots = [
            FantasySlot(
                slot_index=i + 1,
                member_id=m.id,
                price_paid=m.price,
                added_at=datetime(2026, 7, 19),
            )
            for i, m in enumerate(picks)
        ]
        db.add(demo)
        db.commit()

        # Log the demo manager's purchases so the event log (feature 009) isn't empty.
        # (The seed builds the slots directly, so we record the buys explicitly here;
        # the win/loss events come for free from settle_match below.)
        for m in picks:
            record_purchase(db, demo.id, m.name, m.price)
        db.commit()

        # Realize the seeded matches' CompuBucks into the demo manager's balance, the
        # same way the admin "record result" endpoint does in the running app.
        completed = db.scalars(
            select(Match).where(Match.status == MatchStatus.completed)
        ).all()
        for match in completed:
            settle_match(db, match)

        print(
            f"Seeded {len(TEAMS)} teams, {len(MATCHES)} completed "
            f"and {len(SCHEDULED_MATCHES)} scheduled matches, "
            "plus a demo fantasy manager with a bought squad."
        )
    finally:
        db.close()


if __name__ == "__main__":
    seed()
