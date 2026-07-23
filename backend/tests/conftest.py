"""Shared test setup.

Backend tests run against a throwaway in-memory SQLite database so they need no
Postgres and stay fully isolated. We point the app's session at SQLite and create
the tables fresh for each test.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app import db as db_module
from app.db import Base, get_db
from app.main import app


@pytest.fixture()
def db_session():
    # One shared in-memory database for the duration of a test.
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
        future=True,
    )
    Base.metadata.create_all(engine)
    TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)
    session = TestingSession()
    try:
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(engine)


@pytest.fixture()
def client(db_session):
    # Make every request in this test use the same in-memory session.
    app.dependency_overrides[get_db] = lambda: db_session
    try:
        yield TestClient(app)
    finally:
        app.dependency_overrides.clear()


@pytest.fixture()
def admin_password(monkeypatch):
    """Set a known admin password hash in the env and return the plain password."""
    from app.auth import hash_password

    password = "test-secret"
    monkeypatch.setenv("ADMIN_PASSWORD_HASH", hash_password(password))
    return password


@pytest.fixture()
def admin_client(client, admin_password):
    """A client that is already logged into the admin area.

    Login returns a Bearer token; we set it as a default header so every later
    request in the test is authenticated (no cookies involved).
    """
    resp = client.post("/api/admin/login", json={"password": admin_password})
    assert resp.status_code == 200
    client.headers.update({"Authorization": f"Bearer {resp.json()['token']}"})
    return client
