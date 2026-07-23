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

from app.db import SessionLocal
from app.models import (
    FantasySlot,
    FantasyUser,
    Game,
    Match,
    MatchStatus,
    Member,
    Team,
)

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


# (name, logo_url, [member names]) — a couple of teams carry a demo logo.
TEAMS = [
    ("Spin Doctors", _demo_logo("SD", "crimson"), ["Ada", "Ben", "Cara"]),
    ("Paddle Battle", _demo_logo("PB", "orangered"), ["Dan", "Eve"]),
    ("Net Ninjas", None, ["Finn", "Gina", "Hugo"]),
    ("Table Titans", None, ["Ivy", "Jack"]),
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
            team.members = [Member(name=m) for m in members]
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

        # A demo fantasy player (feature 007) with a couple of picks so /fantasy
        # shows a populated team and some CompuBucks straight after seeding.
        picks = [
            teams["Spin Doctors"].members[0],  # Ada — plenty of real wins
            teams["Paddle Battle"].members[0],  # Dan
        ]
        demo = FantasyUser(name="Demo Manager", name_key="demo manager", fun_fact="Once served an ace with my eyes closed.")
        # Picked a day before the seeded games (2026-07-20) so those wins count.
        demo.slots = [
            FantasySlot(slot_index=i + 1, member_id=m.id, added_at=datetime(2026, 7, 19))
            for i, m in enumerate(picks)
        ]
        db.add(demo)

        db.commit()
        print(
            f"Seeded {len(TEAMS)} teams, {len(MATCHES)} completed "
            f"and {len(SCHEDULED_MATCHES)} scheduled matches, "
            "plus a demo fantasy manager."
        )
    finally:
        db.close()


if __name__ == "__main__":
    seed()
