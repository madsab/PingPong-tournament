"""Individual player leaderboard math (SPECIFICATIONS §3.6).

A sibling of `standings.py`: pure functions over plain objects (ORM rows or test
stand-ins), no database access, computed on read (§7) — never stored.

Expected shapes (duck-typed):
- member: .id, .name, .team (with .name)
- match:  .status, .games
- game:   .member_a_id, .member_b_id, .team_a_score, .team_b_score
          (member ids may be None if a roster link was cleared after completion, §3.1)
"""

from __future__ import annotations

from dataclasses import dataclass


@dataclass
class LeaderboardEntry:
    """One player's place in the leaderboard (see data-model.md)."""

    member_id: int
    member_name: str
    team_name: str | None
    team_logo_url: str | None = None
    played: int = 0
    won: int = 0
    lost: int = 0
    win_pct: float = 0.0
    point_difference: int = 0
    rank: int = 0


def _team_name(member) -> str | None:
    team = getattr(member, "team", None)
    if team is not None:
        return team.name
    return getattr(member, "team_name", None)


def _team_logo(member) -> str | None:
    """The player's team logo URL (for display beside the name). None if unset."""
    team = getattr(member, "team", None)
    if team is not None:
        return getattr(team, "logo_url", None)
    return None


def _completed(matches):
    return [m for m in matches if str(getattr(m.status, "value", m.status)) == "completed"]


def _record(entry: LeaderboardEntry, own_score: int, opp_score: int) -> None:
    entry.played += 1
    entry.point_difference += own_score - opp_score
    # A game never ties (§3.3), so it's a win or a loss.
    if own_score > opp_score:
        entry.won += 1
    else:
        entry.lost += 1


def compute_leaderboard(members, matches) -> list[LeaderboardEntry]:
    """Rank every player per §3.6. Only games in completed matches count."""
    entries: dict[int, LeaderboardEntry] = {
        m.id: LeaderboardEntry(
            member_id=m.id,
            member_name=m.name,
            team_name=_team_name(m),
            team_logo_url=_team_logo(m),
        )
        for m in members
    }

    for match in _completed(matches):
        for g in match.games:
            # Attribute each side to its player; skip a side whose link is NULL (§3.1).
            a = entries.get(g.member_a_id)
            if a is not None:
                _record(a, g.team_a_score, g.team_b_score)
            b = entries.get(g.member_b_id)
            if b is not None:
                _record(b, g.team_b_score, g.team_a_score)

    for e in entries.values():
        # Guard played == 0 so a member with no games never divides by zero.
        e.win_pct = e.won / e.played if e.played else 0.0

    ranked = sorted(
        entries.values(),
        key=lambda e: (-e.won, -e.win_pct, -e.point_difference, e.member_name),
    )
    for position, entry in enumerate(ranked, start=1):
        entry.rank = position
    return ranked
