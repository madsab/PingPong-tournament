"""Read/write the handful of tunable globals kept in the ``settings`` table.

Right now that is just the Booster shop price (feature 008). Keeping it here means both
the admin router (which sets it) and the fantasy router (which charges it) share one
source of truth with one default.
"""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.fantasy import DEFAULT_BOOSTER_PRICE
from app.models import Setting

BOOSTER_PRICE_KEY = "booster_price"


def get_booster_price(db: Session) -> int:
    """The current Booster price, or the default if an admin never changed it."""
    row = db.get(Setting, BOOSTER_PRICE_KEY)
    return row.value if row is not None else DEFAULT_BOOSTER_PRICE


def set_booster_price(db: Session, value: int) -> int:
    """Set (upsert) the Booster price and return it."""
    row = db.get(Setting, BOOSTER_PRICE_KEY)
    if row is None:
        db.add(Setting(key=BOOSTER_PRICE_KEY, value=value))
    else:
        row.value = value
    db.commit()
    return value
