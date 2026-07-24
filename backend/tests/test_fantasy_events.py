"""Fantasy event log (feature 009).

Covers the pure per-game math (`slot_game_events`), the purchase/sale events written
by the buy/sell endpoints, the win/loss events written during settlement (including
idempotent re-record), and the `GET /api/fantasy/events` read endpoint.
"""

from datetime import datetime
from types import SimpleNamespace

from sqlalchemy import select

from app.fantasy import (
    BOOSTER_BONUS_AMOUNT,
    LOSS_PENALTY,
    RACKET_MULTIPLIER,
    WIN_REWARD,
    slot_game_events,
    slot_match_delta,
)
from app.models import FantasyEvent, Game, Match, MatchStatus, Member, Team
from app.settlement import settle_match

AFTER = datetime(2999, 1, 1)  # match completed after any real "now" purchase time
DEFAULT_PRICE = 20_000_000
REFUND = 17_000_000  # 85% of DEFAULT_PRICE


# --- helpers (mirror test_fantasy_api.py) ----------------------------------------

def _slot(member_id, has_racket=False, booster_active=False):
    return SimpleNamespace(
        member_id=member_id, has_racket=has_racket, booster_active=booster_active
    )


def _game(a, b, member_a=None, member_b=None):
    return SimpleNamespace(
        team_a_score=a, team_b_score=b, member_a_id=member_a, member_b_id=member_b
    )


def _seed_team(db, name="Paddlers", members=(("Ada", DEFAULT_PRICE), ("Bea", DEFAULT_PRICE))):
    team = Team(name=name)
    team.members = [Member(name=n, price=p) for n, p in members]
    db.add(team)
    db.commit()
    db.refresh(team)
    return team


def _register(client, name="Ivy", fun="hi"):
    resp = client.post("/api/fantasy/register", json={"name": name, "fun_fact": fun})
    assert resp.status_code == 201
    client.headers.update({"Authorization": f"Bearer {resp.json()['token']}"})


def _events(client):
    resp = client.get("/api/fantasy/events")
    assert resp.status_code == 200
    return resp.json()["events"]


def _completed_match(db, home, away, games, completed_at=AFTER):
    m = Match(
        team_a_id=home.id,
        team_b_id=away.id,
        status=MatchStatus.completed,
        completed_at=completed_at,
    )
    m.games = [
        Game(team_a_score=a, team_b_score=b, member_a_id=ma, member_b_id=mb)
        for a, b, ma, mb in games
    ]
    db.add(m)
    db.commit()
    db.refresh(m)
    return m


# --- T004: pure per-game math ----------------------------------------------------

def test_one_event_per_played_game():
    events, consumed = slot_game_events(
        _slot(1),
        [_game(11, 5, member_a=1, member_b=2), _game(5, 11, member_a=1, member_b=2)],
    )
    assert events == [
        {"won": True, "amount": WIN_REWARD},
        {"won": False, "amount": -LOSS_PENALTY},
    ]
    assert consumed is False


def test_racket_doubles_each_game():
    events, _ = slot_game_events(
        _slot(1, has_racket=True), [_game(11, 5, member_a=1, member_b=2)]
    )
    assert events == [{"won": True, "amount": WIN_REWARD * RACKET_MULTIPLIER}]


def test_booster_adds_to_first_win_only_and_is_consumed():
    events, consumed = slot_game_events(
        _slot(1, booster_active=True),
        [_game(11, 5, member_a=1, member_b=2), _game(11, 7, member_a=1, member_b=2)],
    )
    assert events[0]["amount"] == WIN_REWARD + BOOSTER_BONUS_AMOUNT
    assert events[1]["amount"] == WIN_REWARD
    assert consumed is True


def test_booster_does_not_stack_with_racket():
    events, consumed = slot_game_events(
        _slot(1, has_racket=True, booster_active=True),
        [_game(11, 5, member_a=1, member_b=2)],
    )
    assert events[0]["amount"] == WIN_REWARD * RACKET_MULTIPLIER  # no booster bonus
    assert consumed is True


def test_match_delta_is_sum_of_game_events():
    games = [_game(11, 5, member_a=1, member_b=2), _game(9, 11, member_a=1, member_b=2)]
    s = _slot(1, has_racket=True)
    events, consumed = slot_game_events(s, games)
    delta, delta_consumed = slot_match_delta(s, games)
    assert delta == sum(e["amount"] for e in events)
    assert delta_consumed == consumed


# --- T007: purchase / sale events on buy, swap, sell -----------------------------

def test_buying_writes_a_purchase_event(client):
    _seed_team_via(client)
    _register(client)
    ada = _member(client, "Ada")
    client.put("/api/fantasy/team/slots/1", json={"member_id": ada})
    events = _events(client)
    assert len(events) == 1
    assert events[0]["kind"] == "purchase"
    assert events[0]["member_name"] == "Ada"
    assert events[0]["amount"] == -DEFAULT_PRICE


def test_swapping_writes_a_sale_then_a_purchase(client):
    _seed_team_via(client)
    _register(client)
    ada, bea = _member(client, "Ada"), _member(client, "Bea")
    client.put("/api/fantasy/team/slots/1", json={"member_id": ada})
    client.put("/api/fantasy/team/slots/1", json={"member_id": bea})
    events = _events(client)  # newest first
    assert [e["kind"] for e in events] == ["purchase", "sale", "purchase"]
    assert events[0] == {**events[0], "kind": "purchase", "member_name": "Bea", "amount": -DEFAULT_PRICE}
    assert events[1]["kind"] == "sale" and events[1]["member_name"] == "Ada"
    assert events[1]["amount"] == REFUND


def test_selling_writes_a_sale_event(client):
    _seed_team_via(client)
    _register(client)
    ada = _member(client, "Ada")
    client.put("/api/fantasy/team/slots/1", json={"member_id": ada})
    client.delete("/api/fantasy/team/slots/1")
    events = _events(client)
    assert events[0]["kind"] == "sale"
    assert events[0]["member_name"] == "Ada"
    assert events[0]["amount"] == REFUND


# --- T008: win/loss events on settlement + idempotent re-record ------------------

def test_settlement_writes_one_event_per_game(client, db_session):
    home = _seed_team_via(client)
    away = _seed_team(db_session, name="Rivals", members=(("Rob", DEFAULT_PRICE),))
    _register(client)
    ada = _member(client, "Ada")
    client.put("/api/fantasy/team/slots/1", json={"member_id": ada})
    rob = next(m.id for m in away.members)
    match = _completed_match(
        db_session, home, away,
        [(11, 5, ada, rob), (7, 11, ada, rob)],  # Ada wins then loses
    )
    settle_match(db_session, match)

    events = _events(client)
    wins = [e for e in events if e["kind"] == "win"]
    losses = [e for e in events if e["kind"] == "loss"]
    assert len(wins) == 1 and wins[0]["amount"] == WIN_REWARD
    assert len(losses) == 1 and losses[0]["amount"] == -LOSS_PENALTY
    assert wins[0]["member_name"] == "Ada"


def test_re_recording_does_not_duplicate_events(client, db_session):
    home = _seed_team_via(client)
    away = _seed_team(db_session, name="Rivals", members=(("Rob", DEFAULT_PRICE),))
    _register(client)
    ada = _member(client, "Ada")
    client.put("/api/fantasy/team/slots/1", json={"member_id": ada})
    rob = next(m.id for m in away.members)
    match = _completed_match(db_session, home, away, [(11, 5, ada, rob)])

    settle_match(db_session, match)
    settle_match(db_session, match)  # re-record the same match

    game_events = [e for e in _events(client) if e["kind"] in ("win", "loss")]
    assert len(game_events) == 1  # exactly one set, no duplicate


# --- T009: the read endpoint -----------------------------------------------------

def test_events_requires_a_token(client):
    assert client.get("/api/fantasy/events").status_code == 401


def test_new_account_has_no_events(client):
    _register(client)
    assert _events(client) == []


def test_events_are_newest_first(client):
    _seed_team_via(client)
    _register(client)
    ada, bea = _member(client, "Ada"), _member(client, "Bea")
    client.put("/api/fantasy/team/slots/1", json={"member_id": ada})
    client.put("/api/fantasy/team/slots/2", json={"member_id": bea})
    events = _events(client)
    assert events[0]["member_name"] == "Bea"  # the later purchase comes first


# --- small fixtures over the API -------------------------------------------------

def _seed_team_via(client):
    """Seed a team directly in the shared DB via the overridden session."""
    from app.db import get_db

    db = client.app.dependency_overrides[get_db]()
    return _seed_team(db)


def _member(client, name):
    resp = client.get("/api/members")
    return next(m["id"] for m in resp.json()["members"] if m["name"] == name)
