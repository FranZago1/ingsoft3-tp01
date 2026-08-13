# evidencias.md — TP2 Contenedores

Evidencia de los 4 puntos que pide el TP. Las salidas de comandos que están abajo son
**reales**, tomadas de la máquina de desarrollo. Donde dice `[PEGAR CAPTURA]` hay que
adjuntar la pantalla correspondiente, y el punto 4 hay que completarlo después de
publicar las imágenes.

Entorno de la corrida:

- macOS (Apple Silicon) · Docker 28.1.1 · Docker Compose v2
- Fecha de la corrida: 2026-08-13

---

## 1. `docker compose up` de cero, end-to-end

### 1.1 Punto de partida limpio

```console
$ docker compose down -v
[+] Running 4/4
 ✔ Container reservapadel-frontend-1  Removed
 ✔ Container reservapadel-backend-1   Removed
 ✔ Container reservapadel-db-1        Removed
 ✔ Volume reservapadel_db_data        Removed
```

### 1.2 Los dos comandos del arranque en frío

```console
$ cp .env.example .env      # y editar DB_PASSWORD y JWT_SECRET
$ docker compose up -d
 Network reservapadel_default  Created
 Volume "reservapadel_db_data"  Created
 Container reservapadel-db-1  Created
 Container reservapadel-backend-1  Created
 Container reservapadel-frontend-1  Created
 Container reservapadel-db-1  Started
 Container reservapadel-db-1  Healthy
 Container reservapadel-backend-1  Started
 Container reservapadel-backend-1  Healthy
 Container reservapadel-frontend-1  Started

docker compose up -d  11.580 total
```

Notar el orden: **nada arranca antes de tiempo**. `db` pasa a `Healthy` y recién ahí
arranca `backend`; `backend` pasa a `Healthy` (o sea, ya migró y sembró) y recién ahí
arranca `frontend`. Eso es `depends_on: condition: service_healthy` funcionando.

### 1.3 Estado de los servicios

```console
$ docker compose ps
SERVICE    STATUS                    PORTS
backend    Up 17 seconds (healthy)   0.0.0.0:8080->8080/tcp
db         Up 23 seconds (healthy)   0.0.0.0:5432->5432/tcp
frontend   Up 12 seconds             0.0.0.0:3000->3000/tcp
```

### 1.4 El entrypoint dejó la base lista sin pasos manuales

```console
$ docker compose logs backend
backend-1  | ==> Aplicando migraciones (prisma migrate deploy)...
backend-1  | 1 migration found in prisma/migrations
backend-1  | Applying migration `20260807190839_init`
backend-1  | The following migration(s) have been applied:
backend-1  | migrations/
backend-1  |     └─ migration.sql
backend-1  | All migrations have been successfully applied.
backend-1  | ==> Sembrando datos iniciales (idempotente)...
backend-1  | Seed completado.
backend-1  | ==> Iniciando el backend...
backend-1  | Backend escuchando en http://0.0.0.0:8080
```

### 1.5 La app responde (todo a través del puerto 3000)

```console
$ curl -s http://localhost:3000/api/health
{"status":"ok"}

$ curl -s http://localhost:3000/api/canchas -b cookie.txt
Cancha 1, Cancha 2, Cancha 3

$ # datos del seed
reservas: 1
```

### 1.6 Seguridad básica del contenedor

```console
$ docker compose exec backend whoami
node
```

No corre como root.

### 1.7 La app en el navegador

**[PEGAR CAPTURA]** — `http://localhost:3000/login`

**[PEGAR CAPTURA]** — `/reservas` con el contador y los filtros

**[PEGAR CAPTURA]** — `/reservas/nueva` con el botón deshabilitado por datos inválidos

**[PEGAR CAPTURA]** — `/reservas/[id]` mostrando solo las acciones válidas

**[PEGAR CAPTURA]** — `/admin/reservas` con la sesión de `admin@club.com`

### 1.8 Reglas de negocio verificadas por HTTP

Todas contra `http://localhost:3000` (o sea, atravesando el rewrite del frontend):

| # | Regla | Caso probado | Resultado |
| --- | --- | --- | --- |
| 1 | Sin solapamiento | 15:00–16:00 y después 15:30–16:30 | `422` "Ya existe una reserva que se superpone…" |
| 1 | Sin solapamiento | 16:00–17:00 pegada a la anterior | `201` (no se solapan) |
| 2 | Duración mínima | 10:00–10:30 (30 min) | `422` "…al menos 60 minutos." |
| 2 | Duración máxima | 10:00–12:30 (150 min) | `422` "…no puede durar más de 120 minutos." |
| 2 | Apertura | 07:00–08:00 | `422` "…no puede empezar antes de las 08:00." |
| 2 | Cierre | 22:00–23:30 | `422` "…no puede terminar después de las 23:00." |
| 3 | Sin pasado | fecha de ayer | `422` "No se pueden crear reservas en el pasado." |
| 4 | Transición válida | `pendiente → confirmada` | `200` |
| 4 | Transición inválida | `confirmada → confirmada` | `422` "No se puede pasar de…" |
| 4 | Transición inválida | `cancelada → confirmada` | `422` "No se puede pasar de…" |
| 5 | Cancelación tardía | confirmar y cancelar una que empieza en ~1 h | `422` "…solo se puede cancelar hasta 2 horas antes…" |
| 6 | Reserva ajena (GET) | jugador pide una reserva del admin | `403` "No tenés permiso para esto." |
| 6 | Reserva ajena (PATCH) | jugador cambia estado de una del admin | `403` |
| 6 | `?todas=true` sin ser admin | jugador | `403` |
| 6 | `?todas=true` siendo admin | admin | `200`, 5 reservas (vs 4 propias del jugador) |
| 7 | Email inválido | `no-es-mail` | `422` "El email no es válido." |
| 7 | Password corta | 7 caracteres | `422` "…al menos 8 caracteres." |
| 7 | Email duplicado | mismo email dos veces | `422` "Ya existe un usuario con ese email." |

Y los códigos de error transversales:

| Caso | Resultado |
| --- | --- |
| `GET /api/canchas` sin cookie | `401` "No autenticado." |
| `GET /api/reservas/no-existe` | `404` "No existe." |
| `GET /api/nada` | `404` "No existe." |
| Login con password incorrecta | `401` "Email o contraseña incorrectos." |
| Login con email inexistente | `401` **mismo mensaje** (no filtra qué emails existen) |

### 1.9 La cookie de sesión llega bien a través del rewrite

```console
$ curl -si -X POST http://localhost:3000/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"admin@club.com","password":"admin1234"}'
HTTP/1.1 200 OK
set-cookie: token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...; Max-Age=86400; Path=/;
            Expires=Fri, 14 Aug 2026 22:18:33 GMT; HttpOnly; SameSite=Lax
```

`HttpOnly` y `SameSite=Lax` presentes, y el `Set-Cookie` que emite el backend en el
puerto 8080 atraviesa el rewrite y queda guardado para `localhost:3000`.

---

## 2. Prueba de persistencia

La regla que se demuestra: **solo persiste lo que está en el volumen nombrado
`db_data`**.

### 2.1 Estado inicial: se crean datos

```console
$ # 5 reservas en la base (1 del seed + 4 creadas durante las pruebas)
ANTES: 5 reservas
```

### 2.2 `down` sin `-v` → los datos SOBREVIVEN

```console
$ docker compose down
 Container reservapadel-frontend-1  Removed
 Container reservapadel-backend-1   Removed
 Container reservapadel-db-1        Removed
 Network reservapadel_default       Removed
   (el volumen db_data NO se toca)

$ docker compose up -d
 Container reservapadel-db-1        Started
 Container reservapadel-backend-1   Started
 Container reservapadel-frontend-1  Started

DESPUES de down/up: 5 reservas   ← se conservaron
```

Esto además prueba que el **seed es idempotente**: volvió a correr en el arranque y no
duplicó nada (siguen siendo 5, no 6).

### 2.3 `down -v` → los datos SE BORRAN

```console
$ docker compose down -v
 Volume reservapadel_db_data  Removed
 Network reservapadel_default Removed

$ docker compose up -d
 Container reservapadel-db-1        Started
 Container reservapadel-backend-1   Started
 Container reservapadel-frontend-1  Started

DESPUES de down -v/up: 1 reserva   ← base vacía, reconstruida por migraciones + seed
```

**Conclusión:** `down` borra contenedores, `down -v` borra además el volumen. Los datos
viven en `db_data`, no en el contenedor de Postgres.

**[PEGAR CAPTURA]** — opcional: la misma prueba vista desde la UI (una reserva creada
que sigue estando después de `down`/`up` y desaparece después de `down -v`).

---

## 3. Comparación de tamaños de imagen

```console
$ docker images --format 'table {{.Repository}}:{{.Tag}}\t{{.Size}}'
REPOSITORY:TAG                 SIZE
reservapadel-frontend:latest   300MB
reservapadel-backend:latest    381MB
postgres:15-alpine             408MB
reservapadel-app:latest        862MB   ← monolito anterior, para comparar
```

### 3.1 Multi-stage: qué se ganó

| Imagen | Tamaño | Comentario |
| --- | --- | --- |
| `reservapadel-app` (monolito, una sola imagen) | **862 MB** | Next fullstack con Prisma adentro |
| `reservapadel-backend` (multi-stage) | **381 MB** | Express + Prisma + engines + CLI |
| `reservapadel-frontend` (multi-stage, standalone) | **300 MB** | Next con `output: "standalone"` |

### 3.2 Optimización concreta: el `chown -R` costaba 91 MB

La primera versión del backend pesaba **510 MB**. `docker history` mostró la capa
culpable:

```console
$ docker history reservapadel-backend:latest
SIZE      CREATED BY
91MB      RUN /bin/sh -c chmod +x docker-entrypoint.sh && chown -R node:node /app
30.7MB    COPY /app/node_modules/.prisma ./node_modules/.prisma
92.7MB    RUN /bin/sh -c npm ci --omit=dev && npm cache clean --force
```

Un `chown -R` reescribe todos los archivos y, como cada `RUN` es una capa, Docker
guardaba **una segunda copia entera de `node_modules`**. Cambiándolo por
`COPY --chown` (sin capa extra):

```
510 MB  →  381 MB     (−129 MB, −25 %)
```

### 3.3 Qué ocupa la imagen del backend

```console
$ docker run --rm --entrypoint sh reservapadel-backend:latest -c "du -sh /app/*"
86.6M   /app/node_modules      ← de los cuales 40.9M @prisma + 10.6M prisma (CLI)
72.0K   /app/dist              ← todo el código compilado del backend
28.0K   /app/prisma            ← schema + migraciones + seed
```

El código propio son **72 KB**; el resto es Prisma y la base de Node. Por eso el backend
pesa más que el frontend, aunque tenga menos código.

**[PEGAR CAPTURA]** — salida de `docker images` en tu máquina.

---

## 4. Imágenes publicadas en el registry

> **Pendiente:** completar después de publicar. El CI construye las imágenes pero
> **no las pushea** a propósito (ver `decisiones.md`).

### 4.1 Login en GHCR

```console
$ echo $GITHUB_TOKEN | docker login ghcr.io -u franzago1 --password-stdin
Login Succeeded
```

### 4.2 Build con el tag del registry y push

```console
$ docker build -t ghcr.io/franzago1/reservapadel-backend:v0.1.0 ./backend
$ docker build -t ghcr.io/franzago1/reservapadel-frontend:v0.1.0 ./frontend

$ docker push ghcr.io/franzago1/reservapadel-backend:v0.1.0
$ docker push ghcr.io/franzago1/reservapadel-frontend:v0.1.0
```

**[PEGAR SALIDA REAL DE LOS PUSH]**

### 4.3 Las imágenes en GitHub

**[PEGAR CAPTURA]** — la pestaña *Packages* del repo mostrando los dos paquetes con el
tag `v0.1.0`.

### 4.4 Prueba final: levantar desde el registry, sin el código fuente

En una máquina limpia, con **solo** `docker-compose.registry.yml` y `.env`:

```console
$ docker compose -f docker-compose.registry.yml up -d
```

**[PEGAR SALIDA]** — debería bajar las imágenes de `ghcr.io` (no construir nada) y dejar
la app andando en `http://localhost:3000`.

**[PEGAR CAPTURA]** — la app funcionando levantada desde el registry.
