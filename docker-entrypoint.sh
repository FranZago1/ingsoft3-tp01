#!/bin/sh
# Entrypoint del servicio `app`: deja la base lista y arranca el server.
# Idempotente: migrate deploy y el seed (upsert) se pueden correr N veces.
set -e

echo "==> Aplicando migraciones (prisma migrate deploy)..."
node node_modules/prisma/build/index.js migrate deploy

echo "==> Sembrando datos iniciales (idempotente)..."
node prisma/seed.mjs

echo "==> Iniciando Next.js (standalone)..."
exec node server.js
