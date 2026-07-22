"""Team standings math (SPECIFICATIONS §3.4-§3.5).

Pure functions: they take plain objects (ORM rows or test stand-ins) that expose a
few attributes, and return ranked results. Nothing here touches the database, so the
rules are easy to test in isolation. Standings are computed on read (§7) — never stored.

Expected shapes (duck-typed):
- team:  .id, .name, .logo_url
- match: .team_a_id, .team_b_id, .status, .games
- game:  .team_a_score, .team_b_score
"""

from __future__ import annotations

from dataclasses import dataclass, field

WIN_POINTS = 3
DRAW_POINTS = 1
LOSS_POINTS = 0


@dataclass
class StandingsEntry:
    """One team's place in the standings (see data-model.md)."""

    team_id: int
    team_name: str
    logo_url: str | None
    points: int = 0
    point_difference: int = 0
    played: int = 0
    wins: int = 0
    draws: int = 0
    losses: int = 0
    rank: int = 0


def decide_match(match) -> str:
    """Return the winner of a completed match: "a", "b", or "draw" (§3.4)."""
    a_games = b_games = 0
    a_diff = 0
    for g in match.games:
        a_diff += g.team_a_score - g.team_b_score
        if g.team_a_score > g.team_b_score:
            a_games += 1
        elif g.team_b_score > g.team_a_score:
            b_games += 1

    # 1. Most games won.
    if a_games != b_games:
        return "a" if a_games > b_games else "b"
    # 2. Tie on games -> higher total point-difference in the match.
    if a_diff != 0:
        return "a" if a_diff > 0 else "b"
    # 3. Still tied -> draw.
    return "draw"


@dataclass
class _Tally:
    """Running totals while we add up a team's completed matches."""

    entry: StandingsEntry
    # head-to-head points keyed by opponent team id, for the §3.5.3 tiebreak.
    h2h_points: dict[int, int] = field(default_factory=dict)


def _completed(matches):
    return [m for m in matches if str(getattr(m.status, "value", m.status)) == "completed"]


def compute_standings(teams, matches) -> list[StandingsEntry]:
    """Rank every team per §3.5. Only completed matches count."""
    tallies: dict[int, _Tally] = {
        t.id: _Tally(
            StandingsEntry(team_id=t.id, team_name=t.name, logo_url=t.logo_url)
        )
        for t in teams
    }

    for m in _completed(matches):
        a, b = tallies.get(m.team_a_id), tallies.get(m.team_b_id)
        if a is None or b is None:
            continue  # match references a team we don't know about; skip defensively

        # Point difference across every game (§3.5.2 / §3.6 point-diff).
        match_diff = sum(g.team_a_score - g.team_b_score for g in m.games)
        a.entry.point_difference += match_diff
        b.entry.point_difference -= match_diff

        a.entry.played += 1
        b.entry.played += 1

        result = decide_match(m)
        if result == "a":
            _award(a, b, m.team_b_id, m.team_a_id)
        elif result == "b":
            _award(b, a, m.team_a_id, m.team_b_id)
        else:
            _draw(a, b, m.team_a_id, m.team_b_id)

    ranked = _sort_with_tiebreaks(tallies)
    for position, entry in enumerate(ranked, start=1):
        entry.rank = position
    return ranked


def _award(winner: _Tally, loser: _Tally, loser_id: int, winner_id: int) -> None:
    winner.entry.wins += 1
    winner.entry.points += WIN_POINTS
    winner.h2h_points[loser_id] = winner.h2h_points.get(loser_id, 0) + WIN_POINTS
    loser.entry.losses += 1
    loser.entry.points += LOSS_POINTS
    loser.h2h_points[winner_id] = loser.h2h_points.get(winner_id, 0) + LOSS_POINTS


def _draw(a: _Tally, b: _Tally, a_id: int, b_id: int) -> None:
    for one, other, other_id in ((a, b, b_id), (b, a, a_id)):
        one.entry.draws += 1
        one.entry.points += DRAW_POINTS
        one.h2h_points[other_id] = one.h2h_points.get(other_id, 0) + DRAW_POINTS


def _sort_with_tiebreaks(tallies: dict[int, _Tally]) -> list[StandingsEntry]:
    """Order by points -> point-difference -> head-to-head -> name (§3.5)."""
    items = list(tallies.values())

    # First pass: the tiebreaks that don't depend on the group of tied teams.
    items.sort(key=lambda t: t.entry.team_name)
    items.sort(key=lambda t: (-t.entry.points, -t.entry.point_difference))

    # Second pass: within a run of teams tied on points AND point-difference,
    # reorder by head-to-head points (only counting games among the tied group),
    # then name as the final, always-stable tiebreak.
    result: list[StandingsEntry] = []
    i = 0
    while i < len(items):
        j = i + 1
        key = (items[i].entry.points, items[i].entry.point_difference)
        while j < len(items) and (
            items[j].entry.points,
            items[j].entry.point_difference,
        ) == key:
            j += 1
        group = items[i:j]
        if len(group) > 1:
            group = _break_by_head_to_head(group)
        result.extend(t.entry for t in group)
        i = j
    return result


def _break_by_head_to_head(group: list[_Tally]) -> list[_Tally]:
    ids = {t.entry.team_id for t in group}

    def h2h_within(t: _Tally) -> int:
        return sum(pts for opp, pts in t.h2h_points.items() if opp in ids)

    # Higher head-to-head points first, then alphabetical name.
    return sorted(group, key=lambda t: (-h2h_within(t), t.entry.team_name))
