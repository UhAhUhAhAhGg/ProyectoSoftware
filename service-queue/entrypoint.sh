#!/bin/sh
# entrypoint.sh — Arranca el barrendero en background y luego el servidor Django

set -e

echo "[Entrypoint] Aplicando migraciones..."
python manage.py migrate --noinput

echo "[Entrypoint] Iniciando barrendero en background (cada 60s)..."
python manage.py barrendero --daemon --interval 60 &

echo "[Entrypoint] Iniciando servidor Django en puerto 8000..."
exec python manage.py runserver 0.0.0.0:8000
