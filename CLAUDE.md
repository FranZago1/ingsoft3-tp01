El frontend NO tiene route handlers de negocio ni toca Prisma. Consume la API por
rutas relativas `/api/...`; un rewrite en `next.config.ts` las reenvía a
`process.env.BACKEND_URL` (equivalente al proxy nginx del caso SPA — este front
es SSR y por eso no lleva nginx; documentarlo en decisiones.md).

## Qué es la app

Reservas de canchas de pádel con usuarios. Pantallas (exactamente estas):

1. `/login` y `/registro` — formularios simples (nombre, email, password).
2. `/reservas` — MIS reservas, filtro por fecha y cancha, contador de resultados.
3. `/reservas/nueva` — formulario (cancha, fecha, hora inicio, hora fin).
4. `/reservas/[id]` — detalle con acciones según estado (confirmar / cancelar).
5. `/admin/reservas` — TODAS las reservas (solo admin), con filtro. (Existe solo
   para darle sentido a la regla de autorización; es lo primero que se recorta
   si el alcance crece.)

Seed: 3 canchas, un admin (`admin@club.com`) y un jugador (`jugador@club.com`),
passwords documentadas en el README. Sin ABM de canchas ni de usuarios.

## Autenticación (deliberadamente simple, vive en el backend)

- Registro/login con email + password, hash con **bcrypt**.
- JWT firmado con `jsonwebtoken` (`JWT_SECRET` por env; la app falla al arrancar
  si falta), en **cookie httpOnly**, 24 h, sin refresh. Logout = borrar cookie.
- Helper único (`backend/src/auth.ts`) que verifica y devuelve el usuario actual.
- Roles: `admin` y `jugador` (enum en User). Nada más.

## Arquitectura del backend: reglas separadas de Express

Requisito duro — en TP4/TP5 se necesitan 8 tests de backend y 4 de frontend que
corran SIN base de datos y SIN servidor:

1. `backend/src/services/` — reglas como funciones puras/servicios. NO importan
   Express ni Prisma directo (reciben datos ya consultados o un repositorio
   inyectado).
2. `backend/src/routes/` — handlers finitos: parsean, autentican, llaman al
   servicio, mapean a HTTP. Cero lógica de negocio.
3. Frontend: validación de formularios y visibilidad de acciones en
   componentes/hooks chicos y testeables.

## Reglas de negocio (`backend/src/services/`)

1. **Sin solapamiento**: no crear reserva superpuesta en fecha/horario/cancha con
   otra no cancelada.
2. **Horario**: fin > inicio; duración 60–120 min; solo entre 08:00 y 23:00.
3. **Sin reservas en el pasado.**
4. **Transiciones**: `pendiente→confirmada`, `pendiente→cancelada`,
   `confirmada→cancelada`. Otra cosa → 422.
5. **Cancelación**: una `confirmada` solo se cancela hasta 2 h antes del inicio.
6. **Autorización**: jugador solo ve/modifica SUS reservas; admin todas. Ajeno → 403.
7. **Registro**: email único y válido; password mínimo 8 caracteres.

## Comportamientos del frontend (testeables a futuro)

1. Formularios no envían con datos inválidos: botón deshabilitado + mensajes.
2. El detalle muestra solo acciones válidas según estado y rol.
3. El listado recalcula el contador al filtrar.

## API (exactamente estos endpoints, en el backend)

- `GET /api/health` → `{ status: "ok" }` (sin auth; lo usan los healthchecks).
- `POST /api/auth/registro` · `POST /api/auth/login` · `POST /api/auth/logout`
- `GET /api/reservas?fecha=&canchaId=` (propias; admin con `?todas=true`: todas)
- `GET /api/reservas/:id` · `POST /api/reservas`
- `PATCH /api/reservas/:id/estado` → `{ estado: "confirmada" | "cancelada" }`
- `GET /api/canchas`

Errores: 401 sin sesión, 403 sin permiso, 404 no existe, 422 regla de negocio,
siempre `{ error: "mensaje legible" }`.

## Configuración: todo por variables de entorno

- Backend: `DATABASE_URL` (única fuente de conexión, PROHIBIDO hardcodear),
  `JWT_SECRET`, `PORT` (default 8080).
- Frontend: `BACKEND_URL` (lo usa el rewrite).
- Compose: la password de Postgres entra por `${DB_PASSWORD}` desde un `.env` en
  la raíz que NO se commitea (va al `.gitignore`). Se commitea `.env.example`
  documentado con valores de ejemplo.

## Docker (entregables exactos del TP2)

- **`backend/Dockerfile`** multi-stage: deps → build (tsc + prisma generate) →
  runner `node:20-alpine` con solo lo necesario. Usuario no-root. `HEALTHCHECK`
  contra `/api/health`. Entrypoint: `prisma migrate deploy` + seed **idempotente**
  y después el server (trade-off documentado en decisiones.md).
- **`backend/.dockerignore`**: `node_modules/`, `dist/`, `.git/`.
- **`frontend/Dockerfile`** multi-stage: deps → `next build` con
  `output: "standalone"` → runner `node:20-alpine` no-root que corre `server.js`.
- **`frontend/.dockerignore`**: `node_modules/`, `.next/`, `.git/`.
- **`docker-compose.yml`** (raíz): `db` (postgres:15-alpine, volumen nombrado
  `db_data`, healthcheck `pg_isready`), `backend` (espera `db` healthy vía
  `condition: service_healthy`, `DATABASE_URL` con `Host=db`, publica 8080) y
  `frontend` (`BACKEND_URL=http://backend:8080`, publica 3000, depends_on
  backend).
- **`docker-compose.registry.yml`** (raíz): idéntico pero con
  `image: ghcr.io/franzago1/reservapadel-backend:v0.1.0` y
  `...-frontend:v0.1.0` en vez de `build:`. (El push lo hace el alumno a mano.)
- Criterio de aceptación en máquina limpia: `cp .env.example .env` (editando la
  password) + `docker compose up -d` → app usable en `http://localhost:3000`.
  DOS comandos: el paso del .env es parte del diseño, no un defecto.
- Prueba obligatoria de persistencia: crear datos → `down`/`up` conserva →
  `down -v`/`up` borra. Las salidas van a evidencias.md.

## CI (se deja preparado; el TP de CI es el TP4)

`.github/workflows/ci.yml` mínimo: checkout, Node 20 con cache, `npm ci` en ambas
carpetas, lint, `tsc --noEmit`, builds, build de ambas imágenes Docker sin push.
Job `test` comentado con `# TODO TP4/TP5`. No escribir tests todavía.

## decisiones.md, evidencias.md y declaración de IA — OBLIGATORIOS

- **decisiones.md** (raíz, sección `## TP2 — Contenedores` si ya existe de antes):
  por qué esta app contra los criterios de la cátedra, incluyendo **por qué su
  tamaño es deliberado** (5 rutas porque el login habilita la regla de
  autorización → tests del TP5; nada más se agrega); por qué dos servicios y no
  Next.js fullstack; por qué rewrites en vez de nginx (SSR); imágenes base;
  multi-stage; qué persiste y qué no; migraciones en el entrypoint y su riesgo;
  JWT en cookie httpOnly vs localStorage; bcrypt; problemas encontrados.
  **Además, sección "Uso de IA"**: qué partes fueron asistidas por IA (Claude
  Code) y cómo se verificaron. Actualizarla en CADA etapa: sin declaración
  defendible, el TP no se aprueba.
- **evidencias.md** (raíz): plantilla con los 4 puntos del TP (compose up de
  cero end-to-end, prueba de persistencia, comparación de tamaños de imagen,
  imágenes publicadas) para que el alumno pegue capturas/salidas.
- Escribir ambos para una persona que estudia para una defensa oral.

## Qué NO hacer

- No agregar dependencias, entidades, pantallas ni endpoints fuera de lo listado.
- No "mejorar" la app ni la auth.
- No escribir tests todavía; sí dejar todo testeable.
- No configurar despliegue a ningún proveedor ni push de imágenes desde CI.
- No usar bases en la nube: la BD es el contenedor del compose.

## Modo de trabajo

Por etapas, frenando en cada checkpoint para revisión:

1. Estructura + backend base (Express + Prisma schema User/Cancha/Reserva +
   seed) + compose solo con `db` + `.env.example`. **Frenar.**
2. Auth completa en el backend. **Frenar.**
3. Servicios con las 7 reglas + rutas. **Frenar.**
4. Frontend: pantallas + rewrite a BACKEND_URL + los 3 comportamientos. **Frenar.**
5. Dockerfiles + .dockerignore + compose completo + entrypoint + prueba
   `down -v`/`up` de cero. **Frenar.**
6. docker-compose.registry.yml + CI + decisiones.md completo + evidencias.md
   (plantilla) + README de arranque en frío. **Frenar.**

En cada checkpoint, mostrar qué se hizo y qué entró a decisiones.md.