# Frontend (Next.js 15, App Router, SSR) — imagen multi-stage.
#
# OJO: el patrón "build + nginx sirve estáticos" NO aplica acá. Ese patrón es
# para una SPA, donde el build escupe HTML/JS/CSS y cualquier servidor web los
# sirve. Este front es SSR: renderiza páginas en el servidor en cada pedido,
# así que la imagen final necesita un runtime de Node, no un nginx. Por eso
# tampoco hay nginx.conf: el proxy /api → backend lo hace el propio server de
# Next con el rewrite de next.config.ts (ver decisiones.md).

# ---- Etapa 1: dependencias ----
# Separada del build para que la instalación se cachee: esta capa se rehace
# solo si cambian package.json o el lockfile, no cada vez que tocás un .tsx.
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
# `npm ci`, no `npm install`: respeta el lockfile exactamente. Acá se instalan
# TODAS las dependencias (incluidas las de desarrollo) porque compilar Next
# necesita TypeScript y Tailwind.
RUN npm ci

# ---- Etapa 2: build ----
FROM node:20-alpine AS build
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Telemetría anónima de Next apagada: en un build de CI no aporta nada y hace
# una llamada de red que puede colgarse.
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# ---- Etapa 3: runner (la imagen que se publica) ----
FROM node:20-alpine AS runner
WORKDIR /app

# Linkea el package publicado en ghcr con este repositorio: sin esta etiqueta
# la imagen aparece suelta en el perfil de GitHub, sin referencia al código.
LABEL org.opencontainers.image.source=https://github.com/FranZago1/ingsoft3-tp01


ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

# Gracias a output: "standalone", Next arma en .next/standalone un server.js
# con SOLO los módulos que la app realmente usa. Los estáticos y public/ van
# aparte porque el trazado de dependencias no los incluye.
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

# Usuario no-root: la imagen de Node ya trae el usuario `node` (uid 1000).
USER node

EXPOSE 3000
# Sin esto server.js escucha en localhost, que dentro del contenedor significa
# "solo yo mismo": el mapeo de puertos no llegaría a nada.
ENV HOSTNAME=0.0.0.0
ENV PORT=3000

HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/login').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "server.js"]
