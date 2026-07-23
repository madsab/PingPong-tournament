from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.config import (
    get_cookie_https_only,
    get_cookie_same_site,
    get_frontend_origins,
    get_session_secret,
)
from app.routers import admin, fantasy, public

# The database schema is owned by Alembic migrations, not created at startup.
# Deploys run `alembic upgrade head` before the server boots (see the Dockerfile /
# docker-compose command). Tests create their tables directly (see conftest).

app = FastAPI(title="PingPong API")

# Signs the admin session cookie (F6). Must be added before the routers use it.
# same_site/https_only come from env so a cross-domain deploy (frontend and
# backend on different hosts) can use SameSite=None; Secure — see app/config.py.
app.add_middleware(
    SessionMiddleware,
    secret_key=get_session_secret(),
    same_site=get_cookie_same_site(),
    https_only=get_cookie_https_only(),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=get_frontend_origins(),
    allow_credentials=True,  # let the browser send the admin session cookie
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(public.router)
app.include_router(admin.router)
app.include_router(fantasy.router)


@app.get("/api/hello")
def hello() -> dict[str, str]:
    return {"message": "Hello World"}
