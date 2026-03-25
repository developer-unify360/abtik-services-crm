#!/bin/sh

set -e

# Wait for DB to be ready
echo "Waiting for database..."
while ! pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME"; do
  echo "Database is unavailable - sleeping..."
  sleep 2
done

echo "Database is up - continuing..."

# Only check/make migrations in dev or if explicitly needed
# In prod, it's safer to run 'migrate' only
echo "Running migrations..."
python manage.py makemigrations --noinput
python manage.py migrate --noinput

# Collect static files (needed if serving via Nginx proxying static or using Whitenoise)
echo "Collecting static files..."
python manage.py collectstatic --noinput --clear

# Automatic superuser creation
if [ "$DJANGO_SUPERUSER_USERNAME" ]; then
    echo "Creating superuser..."
    # Wrap in try-except block or catch output via management command
    python manage.py shell -c "from django.contrib.auth import get_user_model; User = get_user_model(); \
    User.objects.filter(username='$DJANGO_SUPERUSER_USERNAME').exists() or \
    User.objects.create_superuser('$DJANGO_SUPERUSER_USERNAME', '$DJANGO_SUPERUSER_EMAIL', '$DJANGO_SUPERUSER_PASSWORD')"
fi

echo "All startup tasks completed. Executing command..."
exec "$@"
