#!/bin/sh

set -e

echo "Running migrations..."
python manage.py makemigrations
python manage.py migrate

echo "Creating superuser if not exists..."
python manage.py create_superuser \
    --username="${DJANGO_SUPERUSER_USERNAME:-admin}" \
    --email="${DJANGO_SUPERUSER_EMAIL:-admin@example.com}" \
    --password="${DJANGO_SUPERUSER_PASSWORD:-admin123}"

echo "Starting server..."
exec "$@"
