"""Round-robin scheduling helper (F11 / §5.3).

Pure functions, no database or HTTP — easy to test. The admin endpoint uses these to
create one match per team pair that doesn't have one yet, without ever duplicating.
"""

from __future__ import annotations

from collections.abc import Iterable
from itertools import combinations


def pair_key(a_id: int, b_id: int) -> tuple[int, int]:
    """Order-independent key for a team pair, so {a,b} == {b,a}."""
    return (a_id, b_id) if a_id <= b_id else (b_id, a_id)


def missing_pairings(
    team_ids: Iterable[int],
    existing_matches: Iterable[tuple[int, int]],
) -> list[tuple[int, int]]:
    """Return every team pair (as an ordered tuple) that has no match yet.

    ``existing_matches`` is any iterable of ``(team_a_id, team_b_id)`` pairs. The
    result is sorted for stable, predictable output and contains no duplicates.
    With fewer than two teams there are no pairs, so the result is empty.
    """
    existing = {pair_key(a, b) for a, b in existing_matches}
    ids = sorted(set(team_ids))
    return [pair for pair in combinations(ids, 2) if pair not in existing]
