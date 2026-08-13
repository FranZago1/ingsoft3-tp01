# decisiones.md — ReservaPadel

Este documento explica el **porqué** de cada decisión técnica, en lenguaje simple.
Es material de estudio para la defensa oral: está escrito para una persona, no como
changelog.

---

## Autenticación

### ¿Por qué JWT en cookie httpOnly y no en localStorage?
Una cookie `httpOnly` **no puede leerse desde JavaScript**. Eso corta de raíz el
robo del token por XSS (si alguien inyecta un script en la página, no puede leer la
cookie). `localStorage`, en cambio, es accesible desde cualquier script: un XSS se
lleva el token. Además la cookie viaja sola en cada request al mismo dominio, así
que el backend la recibe sin que el frontend tenga que "acordarse" de mandarla.
Le agregamos `sameSite=lax` (mitiga CSRF básico) y `secure` en producción (solo
viaja por HTTPS).

### ¿Por qué JWT y no sesiones en base de datos?
Es la opción más simple que cumple: el token es **autocontenido** y se verifica con
el secret, sin ir a la base en cada request. Para una app de cátedra evita una tabla
de sesiones y su mantenimiento. Trade-off consciente: no hay logout "server-side"
real (no podemos invalidar un token antes de que expire). Lo aceptamos porque la
expiración es corta (24 h) y no hay refresh tokens.

### ¿Por qué bcrypt para las contraseñas?
Nunca se guarda la contraseña en texto plano. bcrypt es un hash **lento y con salt
incorporado**, diseñado específicamente contra ataques de fuerza bruta: aunque se
filtre la base, romper los hashes es caro. Un hash genérico rápido (MD5/SHA) sería
inseguro justamente por ser rápido.

### ¿Por qué `bcryptjs` en vez del paquete nativo `bcrypt`?
Mismo algoritmo, pero `bcryptjs` es **JavaScript puro, sin binarios nativos**. El
paquete `bcrypt` necesita compilarse con node-gyp (python, make, g++), y en
`node:20-alpine` no hay binarios prearmados para musl, así que compilaría en cada
build → más lento y más frágil. `bcryptjs` no necesita toolchain: el build de Docker
queda rápido y reproducible, que es justo lo que prioriza este proyecto.

### ¿Por qué `JWT_SECRET` obligatoria y la app falla sin ella?
Si el secret no está, firmar/verificar tokens no tiene sentido y sería un agujero de
seguridad silencioso. Preferimos **fallar temprano y ruidosamente** (al primer uso)
que arrancar en un estado inseguro. Está centralizado en `src/lib/env.ts`.

---

## Arquitectura en 3 capas

### ¿Por qué separar servicios / route handlers / componentes?
Para poder **testear las reglas de negocio sin base de datos ni servidor**. Las
reglas viven en `src/lib/services/` como funciones puras: reciben datos ya
consultados y devuelven un resultado. Los route handlers (`src/app/api/`) solo
parsean, autentican, llaman al servicio y traducen a HTTP. Así un test de la regla
"no solapamiento" es una función que recibe dos arrays y no toca Postgres ni Next.
Esto es lo que evalúa la materia y lo que permite los 12 tests del TP siguiente.

---

## Configuración

### ¿Por qué todo por variables de entorno?
La misma imagen tiene que correr en local, QA y producción **sin recompilar ni tocar
código**, apuntando a bases distintas. `DATABASE_URL` es la única fuente de conexión
(prohibido duplicarla o hardcodearla). Cambiar de entorno = cambiar env vars.

---

## Docker

### ¿Por qué un Dockerfile multi-stage (deps → build → runner)?
Para que la **imagen final sea chica y sin herramientas de build**. En `deps` se
instalan dependencias, en `build` se compila, y al `runner` solo copiamos lo
necesario para correr. El resultado no lleva devDependencies ni el código fuente de
más: menos peso y menos superficie de ataque.

### ¿Por qué `output: "standalone"` de Next?
Next arma un `server.js` autocontenido con **solo las dependencias que realmente usa**
(file tracing). No hace falta copiar todo `node_modules` al runner. Es la forma
recomendada para dockerizar Next y da la imagen más liviana.

### ¿Por qué `node:20-alpine`?
Alpine es una base **mínima** (unos pocos MB) → imágenes chicas y builds rápidos.
Costo: usa musl en vez de glibc, por eso hay que ser explícito con los engines de
Prisma (ver abajo) e instalar `openssl`.

### ¿Por qué instalar `openssl` y declarar `binaryTargets` en Prisma?
Prisma usa **motores nativos** que dependen de la libc y de OpenSSL del sistema. En
Alpine (musl + OpenSSL 3) hay que: (1) instalar `openssl` para que los engines
carguen, y (2) declarar los targets `linux-musl-openssl-3.0.x` (x64, para CI/Intel)
y `linux-musl-arm64-openssl-3.0.x` (para Apple Silicon). Sin esto, Prisma genera el
engine equivocado y falla en runtime con "query engine not found".

### ¿Por qué usuario no-root en el runner?
Si algo compromete el proceso, que **no tenga privilegios de root** dentro del
container. Corremos como el usuario `node`. Es una buena práctica de contención.

### ¿Por qué `HEALTHCHECK` contra `/api/health`?
Da a Docker/compose una forma de saber si la app **está realmente lista** (no solo
"el proceso arrancó"). `docker-compose` usa la healthiness de `db` para que `app`
no arranque antes de tiempo, y el `HEALTHCHECK` del `app` permite detectar cuelgues.
Usamos `127.0.0.1` (no `localhost`) porque dentro del container `localhost` puede
resolver a IPv6 y el server escucha en IPv4.

### ¿Por qué migrar y sembrar en el ENTRYPOINT? ¿Qué riesgo tiene?
El criterio es que `docker compose up` deje **todo usable sin pasos manuales**. El
entrypoint corre `prisma migrate deploy` y el seed (idempotente) antes de arrancar el
server. Ventaja: cero comandos extra, la base siempre queda al día con el código.

**Riesgo / trade-off:** si escalás a varias réplicas del `app`, **todas** correrían
las migraciones al arrancar y podrían pisarse (condición de carrera). En un sistema
más grande esto se hace en un **paso/Job separado** del despliegue (una sola vez,
antes de levantar las réplicas). Para esta app, con una sola instancia, migrar en el
entrypoint es lo más simple y `migrate deploy` es seguro de reejecutar. El seed es
idempotente (usa `upsert`), así que correrlo dos veces no duplica datos.

---

## CI (GitHub Actions)

### ¿Por qué ese orden: lint → typecheck → build → imagen?
De lo **más barato y rápido a lo más caro**, para fallar cuanto antes. El lint y el
typecheck tardan segundos y atrapan la mayoría de los errores; recién si pasan tiene
sentido gastar tiempo en `next build` y en construir la imagen Docker. Se usan
`DATABASE_URL` y `JWT_SECRET` dummy porque el build no necesita una base real, pero
esas variables tienen que existir. El job de `test` queda comentado con un TODO: se
activa en el TP siguiente.
