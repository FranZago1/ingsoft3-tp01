# ReservaPadel

Sistema de reservas de canchas de pádel para un club. Proyecto de la materia
**Ingeniería de Software 3 (UCC)**: el foco está en el **sistema de entrega**
(Docker, CI/CD, configuración por entorno, testeabilidad), no en la app en sí.

Stack: **Express + Prisma + PostgreSQL 15** (backend) · **Next.js 15 App Router +
TypeScript + Tailwind** (frontend) · todo en TypeScript.

> **Estado:** la aplicación está terminada y contenerizada (TP2). El CI (TP4) y los
> tests (TP4/TP5) están pendientes.

Este repositorio arrastra **todos los TP de la materia**: arrancó con el TP1 (ramas
protegidas, pull requests, conflictos y release `v1.0.0`) y desde el TP2 aloja además
el código de la aplicación. `decisiones.md` y `evidencias.md` son documentos únicos
que acumulan una sección por TP.

---

## Cómo levantarla en una máquina limpia

Lo único que hace falta instalado es **Docker** (con Docker Compose v2). Ni Node,
ni Postgres, ni nada más.

```bash
git clone https://github.com/FranZago1/ingsoft3-tp01.git
cd ingsoft3-tp01

cp .env.example .env      # ⚠️ PRIMERO esto, y después EDITALO
docker compose up -d
```

👉 **http://localhost:3000**

Son **dos comandos**, y el del `.env` es parte del diseño, no un defecto: los
secretos no se commitean, así que alguien los tiene que poner. El `.env.example`
documenta cuáles hacen falta.

**Editá el `.env` antes de levantar.** Trae valores de ejemplo:

| Variable | Qué es |
| -------- | ------ |
| `DB_PASSWORD` | Password del usuario `padel` de PostgreSQL. |
| `JWT_SECRET`  | Clave con la que el backend firma los JWT. Generá una: `openssl rand -hex 32`. |

Si falta alguna, `docker compose up` **corta con un error que la nombra** en vez de
levantar la app en un estado inseguro.

🔴 **La password de Postgres se fija la primera vez que se inicializa el volumen.**
Si después la cambiás en el `.env`, la base la ignora. Para que tome la nueva hay
que borrar el volumen: `docker compose down -v` (con la pérdida de datos que eso
implica).

No hace falta correr migraciones ni seed a mano: el entrypoint del backend aplica
`prisma migrate deploy` y un seed idempotente en cada arranque.

### Qué levanta

| Servicio | Imagen | Puerto publicado |
| -------- | ------ | ---------------- |
| `frontend` | build de `./frontend` | **3000** → la app |
| `backend`  | build de `./backend`  | 8080 → la API, para `curl`/Postman |
| `db`       | `postgres:15-alpine`  | ninguno: solo se accede desde la red interna |

### Comandos útiles

```bash
docker compose ps                    # estado y healthchecks
docker compose logs -f backend       # seguir los logs
docker compose exec db psql -U padel -d padel   # entrar a la base
docker compose down                  # apaga; los datos SOBREVIVEN
docker compose down -v               # apaga y BORRA los datos
```

### Levantarlo sin el código, desde las imágenes publicadas

```bash
cp .env.example .env      # y editarlo igual que arriba
docker compose -f docker-compose.registry.yml up -d
```

Baja `ghcr.io/franzago1/reservapadel-backend:v0.1.0` y `...-frontend:v0.1.0` en vez
de construir. Las imágenes son **linux/arm64** (construidas en Apple Silicon): en una
máquina Intel/AMD van a dar `no matching manifest for linux/amd64`.

---

## Desarrollo sin contenedores

Para iterar sobre el código conviene el modo nativo: Postgres en Docker, back y
front con recarga automática, en dos terminales.

```bash
cp .env.example .env
cp backend/.env.example backend/.env   # que la password coincida con la de arriba

docker compose up -d db                # solo la base

cd backend && npm ci && npx prisma migrate dev && npm run seed && npm run dev
cd frontend && npm ci && npm run dev
```

El proxy `/api/*` del frontend apunta por default a `http://localhost:8080`, así que
en este modo no hace falta setear `BACKEND_URL`.

---

## Usuarios del seed

| Rol     | Email              | Contraseña      |
| ------- | ------------------ | --------------- |
| Admin   | `admin@club.com`   | `admin1234`     |
| Jugador | `jugador@club.com` | `jugador1234`   |

También crea 3 canchas (`Cancha 1/2/3`) y una reserva de ejemplo del jugador para que el
listado no arranque vacío. El seed es **idempotente**: correrlo de nuevo no duplica nada.

Cualquiera puede registrarse desde `/registro`; los usuarios nuevos son siempre
`jugador`. No hay alta de admins por la API.

---

## Arquitectura

```
navegador ──/api/*──▶ frontend (Next SSR, :3000) ──rewrite──▶ backend (Express, :8080) ──▶ Postgres (:5432)
```

Dos proyectos separados. **El frontend no tiene lógica de negocio ni toca Prisma**:
consume la API por rutas relativas `/api/...` y un rewrite en `frontend/next.config.ts`
las reenvía a `BACKEND_URL`. El navegador nunca le habla al backend directamente.

```
backend/
  src/services/   reglas de negocio como funciones puras (sin Express, sin Prisma)
  src/routes/     handlers finitos: parsean, autentican, llaman al servicio, mapean a HTTP
  src/auth.ts     helper único de autenticación (bcrypt + JWT + cookie)
  src/app.ts      arma la app de Express (sin listen, para poder testearla)
  prisma/         schema, migraciones y seed
frontend/
  src/app/        las 5 pantallas
  src/components/ filtro con contador, acciones por estado, logout
  src/lib/        cliente de la API, validaciones puras de formularios
```

Esa separación existe para poder testear las reglas **sin base de datos y sin servidor**
(TP4/TP5). Ver `decisiones.md`.

---

## Pantallas

- `/login`, `/registro` — acceso.
- `/reservas` — mis reservas, con filtro por fecha y cancha y contador de resultados.
- `/reservas/nueva` — crear reserva (cancha, fecha, hora inicio, hora fin).
- `/reservas/[id]` — detalle con las acciones válidas según el estado.
- `/admin/reservas` — todas las reservas (solo admin).

---

## API

Todos los endpoints cuelgan de `/api` y están en el backend.

| Método | Ruta | Auth | Qué hace |
| --- | --- | --- | --- |
| `GET` | `/api/health` | — | `{ status: "ok" }` |
| `POST` | `/api/auth/registro` | — | Crea un jugador y abre sesión |
| `POST` | `/api/auth/login` | — | Abre sesión |
| `POST` | `/api/auth/logout` | — | Borra la cookie |
| `GET` | `/api/reservas?fecha=&canchaId=` | sí | Las propias; con `?todas=true`, todas (solo admin) |
| `GET` | `/api/reservas/:id` | sí | Detalle (dueño o admin) |
| `POST` | `/api/reservas` | sí | Crea una reserva propia en estado `pendiente` |
| `PATCH` | `/api/reservas/:id/estado` | sí | `{ estado: "confirmada" \| "cancelada" }` |
| `GET` | `/api/canchas` | sí | Lista de canchas |

Errores, siempre con la forma `{ "error": "mensaje legible" }`:

| Código | Cuándo |
| --- | --- |
| `400` | Request mal formado (falta un campo, JSON inválido) |
| `401` | Sin sesión |
| `403` | Con sesión, pero el recurso es de otro |
| `404` | No existe |
| `422` | Regla de negocio incumplida |

---

## Reglas de negocio

1. **Sin solapamiento**: no se puede crear una reserva superpuesta en fecha/horario/cancha
   con otra que no esté cancelada.
2. **Horario**: fin posterior al inicio, duración de 60 a 120 minutos, todo entre las
   08:00 y las 23:00.
3. **Sin reservas en el pasado.**
4. **Transiciones**: `pendiente→confirmada`, `pendiente→cancelada`,
   `confirmada→cancelada`. Cualquier otra cosa → 422.
5. **Cancelación**: una reserva `confirmada` solo se cancela hasta 2 horas antes del
   inicio.
6. **Autorización**: un jugador solo ve y modifica SUS reservas; el admin, todas.
   Recurso ajeno → 403.
7. **Registro**: email único y válido, contraseña de mínimo 8 caracteres.

Viven en `backend/src/services/` como funciones puras.

---

## Variables de entorno

### Raíz (`.env`, lo consumen `docker-compose.yml` y `docker-compose.registry.yml`)

| Variable | Descripción |
| --- | --- |
| `DB_PASSWORD` | Password del usuario `padel` de Postgres. **Obligatoria.** |
| `JWT_SECRET` | Clave de firma de los JWT, que el compose le inyecta al backend. **Obligatoria.** |

Las dos llevan `${VAR:?mensaje}` en el compose: si falta alguna, `docker compose up`
corta nombrándola en vez de arrancar con un valor vacío.

### Backend (`backend/.env`)

| Variable | Descripción |
| --- | --- |
| `DATABASE_URL` | Única fuente de conexión a la base. Prohibido hardcodearla. |
| `JWT_SECRET` | Obligatoria: el backend no arranca sin ella. |
| `PORT` | Default `8080`. |

### Frontend

| Variable | Descripción |
| --- | --- |
| `BACKEND_URL` | Destino al que `src/middleware.ts` reenvía `/api/*`. Se lee **en cada pedido**, así que la misma imagen sirve para cualquier entorno. Default `http://localhost:8080`. |

Ver `.env.example` y `backend/.env.example`.

---

## Scripts

### `backend/`

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Server con recarga (tsx watch). |
| `npm run build` | `prisma generate` + `tsc` → `dist/`. |
| `npm start` | Corre `dist/index.js`. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | `tsc --noEmit`. |
| `npm run seed` | Siembra datos (idempotente). |

### `frontend/`

| Script | Qué hace |
| --- | --- |
| `npm run dev` | Server de desarrollo. |
| `npm run build` | Build de producción. |
| `npm start` | Sirve el build. |
| `npm run lint` | ESLint. |
| `npm run typecheck` | `tsc --noEmit`. |

---

## Tests

**Todavía no hay tests: son el TP4/TP5.** Lo que sí está listo es la testeabilidad:
reglas puras en `backend/src/services/`, validaciones puras en
`frontend/src/lib/validacion.ts` y la app de Express montable sin `listen()`.

---

## Documentación

- **`decisiones.md`** — el porqué de cada decisión técnica, escrito para la defensa
  oral. Una sección por TP, cada una con su declaración de **uso de IA**.
- **`evidencias.md`** — las pruebas de cada TP (capturas en `img/`): push rechazado
  por la protección de `main`, el conflicto en el PR, los marcadores y la release
  `v1.0.0`. También conserva el `README.md` original del ejercicio de conflicto.

