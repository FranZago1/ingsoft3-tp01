# syntax=docker/dockerfile:1
# Imagen del backend (Express + Prisma). Multi-stage: la imagen final no lleva
# ni el código TypeScript ni las devDependencies ni el compilador.

########## 1. deps: dependencias completas (incluye las de build) ##########
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

########## 2. build: prisma generate + tsc ##########
FROM node:20-alpine AS build
WORKDIR /app
# Los engines nativos de Prisma necesitan OpenSSL 3 (Alpine usa musl).
RUN apk add --no-cache openssl
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# "npm run build" = prisma generate && tsc  → deja el cliente y dist/.
RUN npm run build

########## 3. runner: solo lo necesario para correr ##########
FROM node:20-alpine AS runner
WORKDIR /app
RUN apk add --no-cache openssl
ENV NODE_ENV=production
ENV PORT=8080

# Solo dependencias de producción. `prisma` está en dependencies (no en
# devDependencies) justamente porque el entrypoint necesita el CLI para correr
# `migrate deploy` en este stage.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Cliente y engines de Prisma ya generados en el stage de build: así no hace
# falta volver a generarlos (ni descargarlos) acá.
# Ojo con el --chown: hacer `chown -R` en un RUN aparte reescribiría todos los
# archivos en una capa nueva y duplicaría ~90 MB de node_modules en la imagen.
COPY --from=build --chown=node:node /app/node_modules/.prisma ./node_modules/.prisma
# JavaScript compilado.
COPY --from=build --chown=node:node /app/dist ./dist
# Schema, migraciones y seed: los usa el entrypoint.
COPY --from=build --chown=node:node /app/prisma ./prisma

COPY --chown=node:node --chmod=755 docker-entrypoint.sh ./docker-entrypoint.sh

# Usuario no-root: si comprometen el proceso, que no sea root dentro del container.
USER node

EXPOSE 8080

# 127.0.0.1 y no localhost: dentro del container localhost puede resolver a IPv6
# y el server escucha en IPv4.
HEALTHCHECK --interval=30s --timeout=3s --start-period=30s --retries=5 \
  CMD wget -qO- http://127.0.0.1:8080/api/health || exit 1

ENTRYPOINT ["./docker-entrypoint.sh"]
