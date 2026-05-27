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

CMD python -c "import os; os.environ.setdefault('DJANGO_SETTINGS_MODULE','enrollment_system.settings'); from django.conf import settings; db=settings.DATABASES['default']; print(f\"Database: {db.get('ENGINE')} host={db.get('HOST')} name={db.get('NAME')} user={db.get('USER')}\")" && python manage.py migrate --noinput && gunicorn enrollment_system.wsgi:application --bind 0.0.0.0:${PORT:-8000}
