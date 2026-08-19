# Backend (Express + Prisma) — imagen multi-stage.
#
# La idea de las etapas: lo que hace falta para COMPILAR (TypeScript, tipos,
# linter) no hace falta para EJECUTAR. Se compila en una etapa y a la imagen
# final se copia solo el resultado, así lo que se publica y se descarga es lo
# mínimo. Compará los tamaños con `docker images` (va a evidencias.md).

# ---- Etapa 1: dependencias de PRODUCCIÓN + cliente Prisma ----
# Se copian package.json y package-lock.json solos, antes que el código: esta
# capa se rehace únicamente si cambian las dependencias, no cada vez que tocás
# un .ts. Es la misma idea que el `restore` antes del `COPY . .`.
FROM node:20-alpine AS deps
WORKDIR /app

# Prisma trae motores nativos compilados y elige cuál usar mirando la versión
# de OpenSSL del sistema. alpine no trae openssl instalado: sin esto Prisma
# avisa "failed to detect the libssl/openssl version", cae al engine de
# openssl-1.1.x y en runtime intenta bajarse el correcto (y falla, porque la
# imagen no tiene red ni permisos de escritura). Tiene que estar ANTES del
# npm ci, que es cuando se descargan los motores.
RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
# `npm ci` (no `npm install`) instala exactamente lo del lockfile: build
# reproducible. `--omit=dev` deja afuera TypeScript, ESLint y tsx.
RUN npm ci --omit=dev

# El cliente de Prisma es código GENERADO a partir del schema: sin este paso
# la imagen final tendría el paquete pero no el cliente que la app importa.
COPY prisma ./prisma
RUN npx prisma generate

# ---- Etapa 2: build (acá sí hacen falta las devDependencies) ----
FROM node:20-alpine AS build
WORKDIR /app

RUN apk add --no-cache openssl

COPY package.json package-lock.json ./
RUN npm ci

COPY tsconfig.json ./
COPY prisma ./prisma
COPY src ./src
# `prisma generate` también acá porque el código compilado importa los tipos
# del cliente; `tsc` deja el JavaScript en dist/.
RUN npx prisma generate && npx tsc

# ---- Etapa 3: runner (la imagen que se publica) ----
# Sin TypeScript, sin código fuente, sin devDependencies: solo Node, las
# dependencias de producción y el dist/ ya compilado.
FROM node:20-alpine AS runner
WORKDIR /app

# Linkea el package publicado en ghcr con este repositorio: sin esta etiqueta
# la imagen aparece suelta en el perfil de GitHub, sin referencia al código.
LABEL org.opencontainers.image.source=https://github.com/FranZago1/ingsoft3-tp01


ENV NODE_ENV=production

# También en runtime: es acá donde Prisma elige el motor al correr
# `migrate deploy` y al abrir la conexión.
RUN apk add --no-cache openssl

# --chown=node:node en el COPY (en vez de un `chown -R` después): el CLI de
# Prisma quiere poder escribir en node_modules/@prisma/engines, y un chown -R
# posterior duplicaría todo node_modules en una capa nueva.
COPY --from=deps  --chown=node:node /app/node_modules ./node_modules
COPY --from=build --chown=node:node /app/dist ./dist

# package.json queda por metadata; prisma/ es necesario en runtime porque el
# entrypoint corre `prisma migrate deploy` y el seed.
COPY --chown=node:node package.json ./
COPY --chown=node:node prisma ./prisma
COPY --chown=node:node docker-entrypoint.sh ./

# chmod explícito: el bit de ejecución del archivo se pierde en checkouts de
# Windows, y sin esto el contenedor arranca con "permission denied".
RUN chmod +x /app/docker-entrypoint.sh

# Usuario no-root. La imagen de Node ya trae el usuario `node` (uid 1000): un
# proceso que no necesita root no debe correr como root, y si alguien escapa
# de la app no cae en un root del contenedor.
USER node

# Documenta el puerto; el que manda es PORT (default 8080, ver src/env.ts).
EXPOSE 8080

# El healthcheck lo usan `docker ps`, el `condition: service_healthy` del
# compose y los orquestadores. Se hace con node porque la imagen alpine no
# trae curl, y así no hay que instalar nada extra.
HEALTHCHECK --interval=10s --timeout=3s --start-period=20s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||8080)+'/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

ENTRYPOINT ["/app/docker-entrypoint.sh"]
