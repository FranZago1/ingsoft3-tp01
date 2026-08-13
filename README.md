# ReservaPadel

Sistema de reservas de canchas de pádel para un club. Proyecto de la materia
**Ingeniería de Software 3 (UCC)**: el foco está en el **sistema de entrega**
(Docker, CI/CD, configuración por entorno, testeabilidad), no en la app en sí.

Stack: **Next.js 15 (App Router) + TypeScript + Tailwind + Prisma + PostgreSQL 15**.

---

## Levantar todo con Docker (recomendado)

Requisito: Docker + Docker Compose. En una máquina limpia:

```bash
docker compose up --build
```

Esperá a que el servicio `app` termine de migrar y sembrar, y entrá a:

👉 **http://localhost:3000**

`docker compose up` deja todo listo **sin pasos manuales**: levanta Postgres, aplica
las migraciones, siembra los datos y arranca la app.

Para empezar de cero (borrando la base):

```bash
docker compose down -v && docker compose up --build
```

## Usuarios del seed

| Rol     | Email              | Contraseña     |
| ------- | ------------------ | -------------- |
| Admin   | `admin@club.com`   | `admin1234`    |
| Jugador | `jugador@club.com` | `jugador1234`  |

También hay 3 canchas (`Cancha 1/2/3`) y una reserva de ejemplo del jugador.

---

## Desarrollo local (sin Docker para la app)

Postgres **siempre** en Docker; la app corre nativa:

```bash
# 1. Variables de entorno
cp .env.example .env      # y ajustá si hace falta

# 2. Base de datos (solo el servicio db)
docker compose up -d db

# 3. Dependencias, migraciones y seed
npm ci
npx prisma migrate dev
npm run seed

# 4. App en modo dev
npm run dev               # http://localhost:3000
```

## Variables de entorno

| Variable       | Descripción                                        |
| -------------- | -------------------------------------------------- |
| `DATABASE_URL` | Conexión a PostgreSQL. Única fuente de conexión.   |
| `JWT_SECRET`   | Secret para firmar los JWT. Obligatoria.           |

Ver `.env.example`.

---

## Scripts

- `npm run dev` — servidor de desarrollo.
- `npm run build` — `prisma generate` + build de producción (standalone).
- `npm run start` — sirve el build de producción.
- `npm run lint` — ESLint.
- `npm run typecheck` — `tsc --noEmit`.
- `npm run seed` — siembra datos (idempotente).

## Pantallas

- `/login`, `/registro` — acceso.
- `/reservas` — mis reservas (filtro por fecha y cancha + contador).
- `/reservas/nueva` — crear reserva.
- `/reservas/[id]` — detalle con acciones según estado y rol.
- `/admin/reservas` — todas las reservas (solo admin).

## API

- `GET /api/health` → `{ status: "ok" }` (sin auth).
- `POST /api/auth/registro` · `POST /api/auth/login` · `POST /api/auth/logout`
- `GET /api/reservas?fecha=&canchaId=` (propias; admin con `?todas=true` ve todas)
- `GET /api/reservas/:id` · `POST /api/reservas`
- `PATCH /api/reservas/:id/estado` → `{ estado: "confirmada" | "cancelada" }`
- `GET /api/canchas`

Códigos de error: `401` sin sesión, `403` sin permiso, `404` no existe,
`422` regla de negocio incumplida, con `{ error: "mensaje" }`.

## Reglas de negocio

1. Sin solapamiento de reservas no canceladas en la misma cancha/horario.
2. Fin > inicio; duración 60–120 min; horario entre 08:00 y 23:00.
3. Sin reservas en el pasado.
4. Transiciones válidas: `pendiente → confirmada/cancelada`, `confirmada → cancelada`.
5. Una reserva confirmada solo se cancela hasta 2 h antes del inicio.
6. Un jugador solo ve/modifica sus reservas; el admin, todas.
7. Registro: email único y válido, contraseña de mínimo 8 caracteres.

## Arquitectura

Tres capas separadas para poder testear las reglas **sin DB ni servidor**:

- `src/lib/services/` — reglas de negocio como funciones puras.
- `src/app/api/` — route handlers: parsean, autentican, llaman al servicio, mapean a HTTP.
- `src/components/` — validación de formularios y visibilidad de acciones.

Ver **`decisiones.md`** para el porqué de cada decisión técnica.
