#!/bin/sh
# Entrypoint del backend: deja la base lista y recién ahí arranca el server.
# Todo lo de acá es IDEMPOTENTE, así que se puede reiniciar el container N veces:
#   - `migrate deploy` solo aplica las migraciones que falten.
#   - el seed usa upsert, no duplica nada.
# Trade-off (ver decisiones.md): con varias réplicas del backend, todas
# migrarían al arrancar y podrían pisarse. Con una sola instancia es seguro.
set -e

echo "==> Aplicando migraciones (prisma migrate deploy)..."
node node_modules/prisma/build/index.js migrate deploy

echo "==> Sembrando datos iniciales (idempotente)..."
node prisma/seed.mjs

echo "==> Iniciando el backend..."
exec node dist/index.js
