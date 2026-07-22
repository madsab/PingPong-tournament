from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from app.config import (
    get_cookie_https_only,
    get_cookie_same_site,
    get_frontend_origins,
    get_session_secret,
)
from app.db import Base, engine
from app.routers import admin, public

# Import models so their tables are registered on Base before we create them.
from app import models  # noqa: F401


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create any missing tables on startup so a fresh database just works. This
    # only CREATES missing tables; it does not alter existing ones (no migration
    # tool yet), so an out-of-date schema still needs a DB reset — see README.
    Base.metadata.create_all(engine)
    yield


app = FastAPI(title="PingPong API", lifespan=lifespan)

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


@app.get("/api/hello")
def hello() -> dict[str, str]:
    return {"message": "Hello World"}
