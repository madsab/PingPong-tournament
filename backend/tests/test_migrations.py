"""Guard: the Alembic migrations must stay in sync with the ORM models.

We run the migrations against a throwaway SQLite database and then ask Alembic to
autogenerate a diff (`alembic check`). If someone changes a model but forgets to add
a migration, `check` finds pending operations and this test fails — catching schema
drift before it reaches a real database.

Runs Alembic in a subprocess with its own DATABASE_URL so it never touches the app's
real database or the other tests' in-memory one.
"""

import os
import subprocess
import sys
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent


def _run_alembic(args, db_url):
    env = {**os.environ, "DATABASE_URL": db_url}
    return subprocess.run(
        [sys.executable, "-m", "alembic", *args],
        cwd=BACKEND_DIR,
        env=env,
        capture_output=True,
        text=True,
    )


def test_migrations_match_models(tmp_path):
    db_url = f"sqlite:///{tmp_path / 'migrations.db'}"

    upgrade = _run_alembic(["upgrade", "head"], db_url)
    assert upgrade.returncode == 0, upgrade.stderr

    # `check` exits non-zero if the models and the migrated schema differ.
    check = _run_alembic(["check"], db_url)
    assert check.returncode == 0, (
        "Migrations are out of sync with the models — create a new migration.\n"
        f"{check.stdout}\n{check.stderr}"
    )
