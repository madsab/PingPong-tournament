"""Fantasy Ping Pong API: auth + the CompuBucks economy (feature 008).

Auth/session tests are unchanged from 007. The team tests now exercise the paid
economy: starting balance, buy/sell within a budget, earning/losing from real
submatches (via settle_match), the Golden Racket, and the Booster shop.
"""

from datetime import datetime

from sqlalchemy import select

from app.fantasy import STARTING_BALANCE
from app.models import FantasySlot, FantasyUser, Game, Match, MatchStatus, Member, Team
from app.settlement import settle_match

AFTER = datetime(2999, 1, 1)  # a match completed after any real "now" purchase time
BEFORE = datetime(2000, 1, 1)  # a match completed before the player was bought

DEFAULT_PRICE = 20_000_000


def _seed_team(db, name="Paddlers", members=(("Ada", DEFAULT_PRICE), ("Bea", DEFAULT_PRICE))):
    team = Team(name=name)
    team.members = [Member(name=n, price=p) for n, p in members]
    db.add(team)
    db.commit()
    db.refresh(team)
    return team


def _register(client, name="Ivy", fun="hi"):
    assert client.post(
        "/api/fantasy/register", json={"name": name, "fun_fact": fun}
    ).status_code == 201


def _team(client):
    return client.get("/api/fantasy/team").json()


def _slot(body, index):
    return next(s for s in body["slots"] if s["slot_index"] == index)


def _fantasy_user(db):
    return db.scalar(select(FantasyUser))


def _completed_match(db, home, away, games, completed_at=AFTER):
    """games: list of (a_score, b_score, member_a_id, member_b_id)."""
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


# --- US1: register, login, remembered session (unchanged from 007) ---------------

def test_register_creates_account_and_logs_in(client):
    resp = client.post(
        "/api/fantasy/register", json={"name": "Alice", "fun_fact": "I juggle"}
    )
    assert resp.status_code == 201
    assert resp.json()["name"] == "Alice"
    me = client.get("/api/fantasy/me")
    assert me.status_code == 200
    assert me.json()["name"] == "Alice"


def test_register_rejects_empty_name(client):
    assert client.post(
        "/api/fantasy/register", json={"name": "   ", "fun_fact": "hi"}
    ).status_code == 422


def test_register_rejects_empty_fun_fact(client):
    assert client.post(
        "/api/fantasy/register", json={"name": "Bob", "fun_fact": "   "}
    ).status_code == 422


def test_duplicate_name_is_case_and_space_insensitive(client):
    assert client.post(
        "/api/fantasy/register", json={"name": "Alice", "fun_fact": "a"}
    ).status_code == 201
    assert client.post(
        "/api/fantasy/register", json={"name": "  alice ", "fun_fact": "b"}
    ).status_code == 409


def test_login_existing_and_unknown(client):
    client.post("/api/fantasy/register", json={"name": "Cara", "fun_fact": "c"})
    client.post("/api/fantasy/logout")
    ok = client.post("/api/fantasy/login", json={"name": " cara "})
    assert ok.status_code == 200 and ok.json()["name"] == "Cara"
    assert client.post("/api/fantasy/login", json={"name": "Nobody"}).status_code == 404


def test_me_requires_session(client):
    assert client.get("/api/fantasy/me").status_code == 401


def test_logout_clears_session(client):
    client.post("/api/fantasy/register", json={"name": "Dan", "fun_fact": "d"})
    assert client.get("/api/fantasy/me").status_code == 200
    assert client.post("/api/fantasy/logout").status_code == 200
    assert client.get("/api/fantasy/me").status_code == 401


# --- US2: buy & sell within a budget ---------------------------------------------

def test_team_requires_login(client):
    assert client.get("/api/fantasy/team").status_code == 401


def test_team_starts_with_full_balance_and_empty_slots(client):
    _register(client)
    body = _team(client)
    assert body["balance"] == STARTING_BALANCE
    assert [s["slot_index"] for s in body["slots"]] == [1, 2, 3, 4]
    assert all(s["member_id"] is None and s["price_paid"] == 0 for s in body["slots"])


def test_buy_deducts_price(client, db_session):
    team = _seed_team(db_session)
    ada = team.members[0]
    _register(client)
    body = client.put("/api/fantasy/team/slots/1", json={"member_id": ada.id}).json()
    assert body["balance"] == STARTING_BALANCE - DEFAULT_PRICE
    slot1 = _slot(body, 1)
    assert slot1["member_name"] == "Ada" and slot1["price_paid"] == DEFAULT_PRICE


def test_cannot_buy_unaffordable(client, db_session):
    team = _seed_team(db_session, members=(("Rich", 200_000_000),))
    rich = team.members[0]
    _register(client)
    resp = client.put("/api/fantasy/team/slots/1", json={"member_id": rich.id})
    assert resp.status_code == 409
    assert _team(client)["balance"] == STARTING_BALANCE  # unchanged
    assert _slot(_team(client), 1)["member_id"] is None


def test_cannot_buy_unpriced_player(client, db_session):
    team = _seed_team(db_session, members=(("NoPrice", None),))
    _register(client)
    resp = client.put(
        "/api/fantasy/team/slots/1", json={"member_id": team.members[0].id}
    )
    assert resp.status_code == 422


def test_sell_refunds_85_percent(client, db_session):
    team = _seed_team(db_session)
    ada = team.members[0]
    _register(client)
    client.put("/api/fantasy/team/slots/1", json={"member_id": ada.id})
    body = client.delete("/api/fantasy/team/slots/1").json()
    # 100M - 20M (buy) + 17M (85% sell) = 97M
    assert body["balance"] == STARTING_BALANCE - DEFAULT_PRICE + 17_000_000
    assert _slot(body, 1)["member_id"] is None


def test_swap_refunds_old_then_charges_new(client, db_session):
    team = _seed_team(db_session)
    ada, bea = team.members
    _register(client)
    client.put("/api/fantasy/team/slots/1", json={"member_id": ada.id})  # -20M → 80M
    body = client.put(
        "/api/fantasy/team/slots/1", json={"member_id": bea.id}
    ).json()  # +17M refund → 97M, -20M buy → 77M
    assert body["balance"] == 77_000_000
    assert _slot(body, 1)["member_name"] == "Bea"


def test_same_member_in_two_slots_rejected(client, db_session):
    team = _seed_team(db_session)
    ada = team.members[0]
    _register(client)
    assert client.put(
        "/api/fantasy/team/slots/1", json={"member_id": ada.id}
    ).status_code == 200
    assert client.put(
        "/api/fantasy/team/slots/2", json={"member_id": ada.id}
    ).status_code == 409


def test_slot_index_and_unknown_member(client, db_session):
    team = _seed_team(db_session)
    _register(client)
    assert client.put(
        "/api/fantasy/team/slots/5", json={"member_id": team.members[0].id}
    ).status_code == 422
    assert client.put(
        "/api/fantasy/team/slots/1", json={"member_id": 9999}
    ).status_code == 404


def test_clear_slot_is_idempotent(client, db_session):
    team = _seed_team(db_session)
    _register(client)
    client.put("/api/fantasy/team/slots/1", json={"member_id": team.members[0].id})
    assert client.delete("/api/fantasy/team/slots/1").status_code == 200
    assert client.delete("/api/fantasy/team/slots/1").status_code == 200  # no-op
    assert client.delete("/api/fantasy/team/slots/9").status_code == 422


# --- US3: earn / lose from real submatches (settlement) --------------------------

def _setup_bought_player(client, db_session):
    """Register a user, buy Ada, return (home team, away team with Rob, ada, rob)."""
    home = _seed_team(db_session)  # Ada, Bea (priced)
    away = _seed_team(db_session, name="Rivals", members=(("Rob", DEFAULT_PRICE),))
    ada, rob = home.members[0], away.members[0]
    _register(client)
    client.put("/api/fantasy/team/slots/1", json={"member_id": ada.id})
    return home, away, ada, rob


def test_win_credits_balance(client, db_session):
    home, away, ada, rob = _setup_bought_player(client, db_session)
    match = _completed_match(db_session, home, away, [(11, 5, ada.id, rob.id)])
    settle_match(db_session, match)
    assert _team(client)["balance"] == STARTING_BALANCE - DEFAULT_PRICE + 5_000_000


def test_loss_debits_balance(client, db_session):
    home, away, ada, rob = _setup_bought_player(client, db_session)
    match = _completed_match(db_session, home, away, [(5, 11, ada.id, rob.id)])
    settle_match(db_session, match)
    assert _team(client)["balance"] == STARTING_BALANCE - DEFAULT_PRICE - 2_000_000


def test_balance_never_goes_below_zero(client, db_session):
    home, away, ada, rob = _setup_bought_player(client, db_session)
    # Force the balance low, then a loss must clamp at 0 (not negative).
    user = _fantasy_user(db_session)
    user.balance = 1_000_000
    db_session.commit()
    match = _completed_match(db_session, home, away, [(5, 11, ada.id, rob.id)])
    settle_match(db_session, match)
    assert _team(client)["balance"] == 0


def test_games_before_purchase_are_ignored(client, db_session):
    home, away, ada, rob = _setup_bought_player(client, db_session)
    match = _completed_match(
        db_session, home, away, [(11, 5, ada.id, rob.id)], completed_at=BEFORE
    )
    settle_match(db_session, match)
    assert _team(client)["balance"] == STARTING_BALANCE - DEFAULT_PRICE  # no change


def test_resettle_is_idempotent(client, db_session):
    home, away, ada, rob = _setup_bought_player(client, db_session)
    match = _completed_match(db_session, home, away, [(11, 5, ada.id, rob.id)])
    settle_match(db_session, match)
    settle_match(db_session, match)  # re-record → must not double-pay
    assert _team(client)["balance"] == STARTING_BALANCE - DEFAULT_PRICE + 5_000_000


def test_record_result_endpoint_settles(admin_client, db_session):
    """Integration: the admin record-result endpoint pays fantasy users."""
    home = _seed_team(db_session, name="Home", members=(("Ada", DEFAULT_PRICE),))
    away = _seed_team(db_session, name="Away", members=(("Rob", DEFAULT_PRICE),))
    ada, rob = home.members[0], away.members[0]
    match = Match(team_a_id=home.id, team_b_id=away.id)
    db_session.add(match)
    db_session.commit()
    db_session.refresh(match)

    _register(admin_client)  # fantasy cookie coexists with the admin Bearer header
    admin_client.put("/api/fantasy/team/slots/1", json={"member_id": ada.id})

    resp = admin_client.put(
        f"/api/admin/matches/{match.id}/result",
        json={"games": [{"member_a_id": ada.id, "member_b_id": rob.id,
                         "team_a_score": 11, "team_b_score": 5}]},
    )
    assert resp.status_code == 200
    assert _team(admin_client)["balance"] == STARTING_BALANCE - DEFAULT_PRICE + 5_000_000


# --- US4: Golden Racket ----------------------------------------------------------

def _buy_two(client, db_session):
    team = _seed_team(db_session)
    ada, bea = team.members
    _register(client)
    client.put("/api/fantasy/team/slots/1", json={"member_id": ada.id})
    client.put("/api/fantasy/team/slots/2", json={"member_id": bea.id})
    return team, ada, bea


def test_racket_assigns_to_one_slot_only(client, db_session):
    _buy_two(client, db_session)
    body = client.put("/api/fantasy/team/racket", json={"slot_index": 1}).json()
    assert _slot(body, 1)["has_racket"] is True
    assert _slot(body, 2)["has_racket"] is False
    # Move it to slot 2 — slot 1 loses it.
    body = client.put("/api/fantasy/team/racket", json={"slot_index": 2}).json()
    assert _slot(body, 1)["has_racket"] is False
    assert _slot(body, 2)["has_racket"] is True


def test_racket_on_empty_slot_rejected(client, db_session):
    _seed_team(db_session)
    _register(client)
    assert client.put(
        "/api/fantasy/team/racket", json={"slot_index": 1}
    ).status_code == 422


def test_clear_racket(client, db_session):
    _buy_two(client, db_session)
    client.put("/api/fantasy/team/racket", json={"slot_index": 1})
    body = client.delete("/api/fantasy/team/racket").json()
    assert all(s["has_racket"] is False for s in body["slots"])


def test_racket_doubles_settlement(client, db_session):
    home, away, ada, rob = _setup_bought_player(client, db_session)
    client.put("/api/fantasy/team/racket", json={"slot_index": 1})
    match = _completed_match(db_session, home, away, [(11, 5, ada.id, rob.id)])
    settle_match(db_session, match)
    assert _team(client)["balance"] == STARTING_BALANCE - DEFAULT_PRICE + 10_000_000


def test_selling_drops_the_racket(client, db_session):
    home, away, ada, rob = _setup_bought_player(client, db_session)
    client.put("/api/fantasy/team/racket", json={"slot_index": 1})
    client.delete("/api/fantasy/team/slots/1")  # sell
    # Re-buy the same player — the racket must be gone.
    body = client.put("/api/fantasy/team/slots/1", json={"member_id": ada.id}).json()
    assert _slot(body, 1)["has_racket"] is False


# --- US5: Booster shop -----------------------------------------------------------

def test_buy_booster_deducts_and_holds_one(client, db_session):
    _seed_team(db_session)
    _register(client)
    body = client.post("/api/fantasy/shop/booster").json()
    assert body["boosters_available"] == 1
    assert body["balance"] == STARTING_BALANCE - body["booster_price"]


def test_buy_booster_one_at_a_time(client, db_session):
    _register(client)
    assert client.post("/api/fantasy/shop/booster").status_code == 200
    assert client.post("/api/fantasy/shop/booster").status_code == 409


def test_place_booster_requires_owning_one(client, db_session):
    team, ada, bea = _buy_two(client, db_session)
    assert client.put(
        "/api/fantasy/team/booster", json={"slot_index": 1}
    ).status_code == 409  # none owned yet
    client.post("/api/fantasy/shop/booster")
    body = client.put("/api/fantasy/team/booster", json={"slot_index": 1}).json()
    assert _slot(body, 1)["booster_active"] is True
    assert body["boosters_available"] == 0


def test_booster_bonus_on_next_win_then_consumed(client, db_session):
    home, away, ada, rob = _setup_bought_player(client, db_session)
    client.post("/api/fantasy/shop/booster")
    price = _team(client)["booster_price"]
    client.put("/api/fantasy/team/booster", json={"slot_index": 1})
    match = _completed_match(db_session, home, away, [(11, 5, ada.id, rob.id)])
    settle_match(db_session, match)
    body = _team(client)
    # base 5M + 50% (2.5M) = 7.5M won; booster gone afterwards.
    assert body["balance"] == STARTING_BALANCE - DEFAULT_PRICE - price + 7_500_000
    assert _slot(body, 1)["booster_active"] is False


def test_booster_does_not_stack_with_racket(client, db_session):
    home, away, ada, rob = _setup_bought_player(client, db_session)
    client.put("/api/fantasy/team/racket", json={"slot_index": 1})
    client.post("/api/fantasy/shop/booster")
    price = _team(client)["booster_price"]
    client.put("/api/fantasy/team/booster", json={"slot_index": 1})
    match = _completed_match(db_session, home, away, [(11, 5, ada.id, rob.id)])
    settle_match(db_session, match)
    # Racket 10M only (no +50% stack).
    assert _team(client)["balance"] == STARTING_BALANCE - DEFAULT_PRICE - price + 10_000_000


def test_can_rebuy_booster_after_consumption(client, db_session):
    home, away, ada, rob = _setup_bought_player(client, db_session)
    client.post("/api/fantasy/shop/booster")
    client.put("/api/fantasy/team/booster", json={"slot_index": 1})
    match = _completed_match(db_session, home, away, [(11, 5, ada.id, rob.id)])
    settle_match(db_session, match)
    # Booster consumed → buying another is allowed again.
    assert client.post("/api/fantasy/shop/booster").status_code == 200
