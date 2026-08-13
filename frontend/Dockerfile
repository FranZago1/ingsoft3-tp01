# syntax=docker/dockerfile:1
# Imagen del frontend (Next.js SSR). Multi-stage: la imagen final solo lleva el
# server.js standalone y sus dependencias reales, no todo node_modules.

########## 1. deps: dependencias ##########
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

########## 2. build: next build con output standalone ##########
FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# El rewrite lee BACKEND_URL en runtime (rewrites() se evalúa al arrancar el
# server), pero next build igual ejecuta la función: le damos un valor para que
# no falle. El valor real lo inyecta docker-compose.
ENV BACKEND_URL=http://backend:8080
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

########## 3. runner: imagen final ##########
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
# El server standalone escucha en localhost si no se le dice otra cosa, y
# entonces no sería alcanzable desde fuera del container.
ENV HOSTNAME=0.0.0.0
ENV NEXT_TELEMETRY_DISABLED=1

# Salida standalone: server.js + el node_modules mínimo que Next calculó por
# file tracing. No copiamos node_modules entero.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

# Usuario no-root.
USER node

EXPOSE 3000

CMD ["node", "server.js"]
