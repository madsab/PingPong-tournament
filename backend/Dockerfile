FROM python:3.14-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Production default (used by Render): apply any pending DB migrations, then start
# the server with no --reload, bound to the port the host injects via $PORT (Render
# sets it), falling back to 8000. Shell form so ${PORT} expands and && chains.
# `alembic upgrade head` is a no-op when the DB is already current. Local dev
# overrides this with the command in docker-compose.yml.
CMD alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
