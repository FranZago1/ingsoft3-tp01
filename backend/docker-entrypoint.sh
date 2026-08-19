#!/bin/sh
# Arranque del contenedor del backend.
#
# Trade-off deliberado (va a decisiones.md): las migraciones corren acá, en el
# arranque de la app, y no en un paso aparte. A favor: `docker compose up` en
# una máquina limpia deja la base lista sin comandos extra, que es el criterio
# de aceptación del TP. En contra: con varias réplicas del backend, todas
# intentarían migrar a la vez, y una migración que falla deja el contenedor
# en crash-loop. Para una entrega de una sola réplica es el trade-off correcto;
# en producción real esto es un job separado que corre antes del deploy.
set -e

echo "==> Aplicando migraciones (prisma migrate deploy)"
# `migrate deploy` (no `migrate dev`): aplica las migraciones que ya existen y
# nunca genera ni pide nada de forma interactiva. Es la variante para entornos
# desatendidos.
npx prisma migrate deploy

echo "==> Seed (idempotente)"
# El seed usa upsert, así que correrlo en cada arranque no duplica datos.
node prisma/seed.mjs

echo "==> Iniciando el servidor"
# `exec` reemplaza al shell por Node: así el proceso de la app queda como PID 1
# y recibe directamente el SIGTERM de `docker stop`. Sin exec, el shell se
# queda con la señal y el contenedor tarda 10 segundos en morir a la fuerza.
exec node dist/index.js
