# syntax=docker/dockerfile:1

########## 1. deps: instala dependencias ##########
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

########## 2. build: genera cliente Prisma y compila Next (standalone) ##########
FROM node:20-alpine AS build
WORKDIR /app
# openssl para que `prisma generate` detecte openssl 3 y genere los engines correctos.
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# prisma generate corre dentro de "npm run build" (ver package.json).
RUN npm run build

########## 3. runner: imagen final chica ##########
FROM node:20-alpine AS runner
WORKDIR /app
# libssl/openssl que necesitan los engines de Prisma (migrate/query) en Alpine.
RUN apk add --no-cache openssl
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Salida standalone: server.js + node_modules mínimo.
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public

# Prisma CLI + engines + schema/migraciones/seed para poder migrar y sembrar
# en el entrypoint (no vienen en el output standalone).
COPY --from=build /app/node_modules/prisma ./node_modules/prisma
COPY --from=build /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
# bcryptjs (sin dependencias) lo usa el seed; el tracing standalone no lo incluye.
COPY --from=build /app/node_modules/bcryptjs ./node_modules/bcryptjs
COPY --from=build /app/prisma ./prisma

COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x docker-entrypoint.sh && chown -R node:node /app

# Usuario no-root.
USER node

EXPOSE 3000

# Healthcheck contra el endpoint sin auth.
HEALTHCHECK --interval=30s --timeout=3s --start-period=20s --retries=5 \
  CMD wget -qO- http://127.0.0.1:3000/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
