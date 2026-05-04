#!/bin/bash
# Deploy script — run on VPS as root or sudo user
# Usage: bash deploy.sh
set -e

APP_DIR=/var/www/gym
BACKEND=$APP_DIR/backend
FRONTEND=$APP_DIR/frontend
VENV=$APP_DIR/venv

echo "=== Pulling latest code ==="
cd $APP_DIR
git pull origin main

echo "=== Backend: install deps ==="
$VENV/bin/pip install -r $BACKEND/requirements.txt

echo "=== Backend: migrate ==="
cd $BACKEND
$VENV/bin/python manage.py migrate --no-input

echo "=== Backend: collectstatic ==="
$VENV/bin/python manage.py collectstatic --no-input

echo "=== Restart gunicorn ==="
systemctl restart gym

echo "=== Frontend: install & build ==="
cd $FRONTEND
npm ci
npm run build

echo "=== Reload nginx ==="
nginx -t && systemctl reload nginx

echo "=== Done! ==="
