FROM python:3.14-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Production default (used by Render): no --reload, and bind to the port the host
# injects via $PORT (Render sets it), falling back to 8000. Shell form so ${PORT}
# expands. Local dev overrides this with --reload in docker-compose.yml.
CMD uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
