# ReservaPadel

Sistema de reservas de canchas de pádel para un club. Proyecto de la materia
**Ingeniería de Software 3 (UCC)**: el foco está en el **sistema de entrega**
(Docker, CI/CD, configuración por entorno, testeabilidad), no en la app en sí.

Stack: **Express + Prisma + PostgreSQL 15** (backend) · **Next.js 15 App Router +
TypeScript + Tailwind** (frontend) · todo en TypeScript.

> **Estado:** la aplicación está terminada y verificada. Contenerizarla (TP2), el CI
> (TP4) y los tests (TP4/TP5) están pendientes.

---

## Cómo levantarla

Postgres en Docker; backend y frontend nativos, en dos terminales.

```bash
# 0. Variables de entorno
cp .env.example .env               # editar DB_PASSWORD
cp backend/.env.example backend/.env   # que la password coincida con la de arriba

# 1. La base
docker compose up -d db

# 2. Backend (terminal 1)
cd backend
npm ci
npx prisma migrate dev             # crea las tablas
npm run seed                       # canchas + usuarios de prueba
npm run dev                        # http://localhost:8080

# 3. Frontend (terminal 2)
cd frontend
npm ci
npm run dev                        # http://localhost:3000
```

👉 **http://localhost:3000**

El rewrite del frontend apunta por default a `http://localhost:8080`, así que en
desarrollo no hace falta setear `BACKEND_URL`.

Para empezar de cero borrando la base: `docker compose down -v && docker compose up -d db`
(y volver a correr `migrate dev` + `seed`).

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

### Raíz (`.env`, lo consume `docker-compose.yml`)

| Variable | Descripción |
| --- | --- |
| `DB_PASSWORD` | Password del usuario `padel` de Postgres. **Obligatoria.** |

### Backend (`backend/.env`)

| Variable | Descripción |
| --- | --- |
| `DATABASE_URL` | Única fuente de conexión a la base. Prohibido hardcodearla. |
| `JWT_SECRET` | Obligatoria: el backend no arranca sin ella. |
| `PORT` | Default `8080`. |

### Frontend

| Variable | Descripción |
| --- | --- |
| `BACKEND_URL` | Destino del rewrite de `/api/*`. Default `http://localhost:8080`. |

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
  oral. Incluye la declaración de **uso de IA**.
