FROM python:3.13-slim

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip \
    && pip install --no-cache-dir -r requirements.txt

COPY . .

RUN python manage.py collectstatic --noinput

CMD if [ -n "$RAILWAY_ENVIRONMENT" ] && [ -z "$DATABASE_URL" ] && [ -z "$DATABASE_PRIVATE_URL" ] && [ -z "$POSTGRES_URL" ] && [ -z "$PGHOST" ]; then echo "Missing Railway PostgreSQL variables. Add DATABASE_URL from your Railway PostgreSQL service to this Django service."; exit 1; fi; python manage.py migrate --noinput && gunicorn enrollment_system.wsgi:application --bind 0.0.0.0:${PORT:-8000}
