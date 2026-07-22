"""Database wiring: engine, session, and the FastAPI dependency.

The database URL comes from the DATABASE_URL environment variable (set in
docker-compose.yml). We default to a local Postgres so running outside Docker
still works if you have one; tests override the session entirely (see conftest).
"""

import os

from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql+psycopg://pingpong:pingpong@localhost:5432/pingpong",
)

# SQLAlchemy 2.0 wants the psycopg (v3) driver spelled out. docker-compose gives
# us the plain "postgresql://" form, so normalise it to use psycopg v3.
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

engine = create_engine(DATABASE_URL, echo=False, future=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)


class Base(DeclarativeBase):
    """Base class every ORM model inherits from."""


def get_db():
    """Yield a database session and always close it afterwards.

    Used as a FastAPI dependency so each request gets its own session.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
