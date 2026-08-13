# decisiones.md — ReservaPadel

Este documento explica el **porqué** de cada decisión técnica, en lenguaje simple.
Es material de estudio para la defensa oral: está escrito para una persona, no como
changelog. Si en la defensa preguntan "¿por qué X?", la respuesta está acá.

---

# TP2 — Contenedores

## La aplicación

### ¿Por qué esta app y no otra?

Los criterios de la cátedra piden un sistema que se pueda **entregar**: contenerizar,
configurar por entorno, versionar, testear. Una app de reservas de canchas cumple todo
eso con un dominio que se explica en una frase y que además tiene **reglas de negocio
de verdad** (solapamiento, horarios, transiciones de estado, permisos), no un CRUD
plano. Eso importa porque el TP5 pide 8 tests de backend: si el dominio fuera "guardar
un nombre en una tabla" no habría nada interesante que testear.

### ¿Por qué es tan chica? ¿No le falta funcionalidad?

**El tamaño es deliberado, no es un recorte por falta de tiempo.** Son exactamente 5
pantallas y cada una está justificada:

- `/login` y `/registro` existen porque **sin usuarios no hay regla de autorización**,
  y la autorización es la regla más interesante de testear del TP5.
- `/reservas`, `/reservas/nueva` y `/reservas/[id]` son el mínimo para ejercer las
  7 reglas de negocio: listar, crear, cambiar de estado.
- `/admin/reservas` existe **solo para que la regla 6 tenga sentido**: si nadie
  pudiera ver reservas ajenas, "jugador solo ve las suyas" sería una regla sin
  contraparte observable. Es lo primero que se recorta si el alcance crece.

No hay ABM de canchas ni de usuarios: las canchas las crea el seed y los usuarios se
registran solos. Cada pantalla de más es superficie que hay que dockerizar, testear y
defender, sin agregar nada al aprendizaje del sistema de entrega, que es lo que evalúa
la materia. **El foco del TP no es la app: es cómo se entrega la app.**

---

## Arquitectura

### ¿Por qué dos servicios y no un Next.js fullstack?

Next.js puede perfectamente tener sus route handlers (`app/api/...`) hablando con
Prisma: una sola app, un solo contenedor, menos piezas. De hecho **el proyecto empezó
así y se reestructuró**. Las razones del cambio:

1. **Es lo que el TP quiere enseñar.** Un solo servicio no tiene red interna, ni
   `depends_on` con healthcheck, ni descubrimiento por nombre de servicio, ni un
   proxy. Con dos servicios el `docker-compose.yml` deja de ser decorativo: si el
   `backend` no arranca, el `frontend` no tiene a quién pedirle datos, y eso se ve.
2. **Escalan distinto.** El front SSR es CPU liviana y muchas conexiones; el backend
   tiene el pool de Postgres. Separados se pueden replicar de forma independiente.
3. **El backend no depende de Next.** Las reglas de negocio no saben qué las consume.
   Mañana una app móvil pega a la misma API sin tocar una línea.
4. **Los tests del TP5 quedan más limpios.** Los servicios son TypeScript plano en
   `backend/src/services/`: se testean con `node` a secas, sin el runtime de Next
   alrededor.

**El costo, para ser honestos:** dos `package.json`, dos imágenes, dos builds en CI, y
la duplicación de validaciones que se explica más abajo. Es un costo real que se paga a
cambio de un sistema de entrega que se puede mostrar.

### ¿Por qué rewrites de Next y no nginx?

En el caso típico de una SPA (React/Vue compilado a estáticos) hace falta **nginx**:
sirve los archivos y proxea `/api` al backend, porque un `index.html` no puede proxear
nada.

Acá el front es **SSR**: ya hay un proceso Node de Next escuchando en el 3000, y ese
proceso sabe hacer de proxy. El `rewrite` de `next.config.ts` reenvía todo `/api/*` a
`BACKEND_URL`. Meter nginx sería agregar **una tercera pieza que no hace nada que Next
no haga ya**: más config, más imagen, más cosas que se pueden romper.

El beneficio es el mismo que daría nginx: el navegador **solo conoce el puerto 3000**.
No hay CORS que configurar (todo es mismo origen), la cookie de sesión pertenece a un
único dominio, y el backend puede quedar sin publicar al exterior.

```
navegador ──/api/reservas──▶ Next (3000) ──rewrite──▶ backend (8080) ──▶ Postgres (5432)
```

### ¿Cómo hacen las páginas SSR para pedirle datos al backend?

Acá hay un detalle fino que conviene tener claro para la defensa, porque parece una
contradicción y no lo es:

- Los **componentes de cliente** (login, registro, nueva reserva, botones de
  confirmar/cancelar) hacen `fetch("/api/...")` con ruta relativa. Eso sale del
  navegador, entra al server de Next y el rewrite lo manda al backend. Tal cual el
  diagrama de arriba.
- Los **componentes de servidor** (las páginas que se renderizan en el server: mis
  reservas, detalle, admin) **no pueden usar una ruta relativa**: en el servidor no hay
  "origen actual" contra el cual resolver `/api/...`, y además el rewrite solo actúa
  sobre pedidos que *entran* al server de Next, no sobre los que ese server hace por su
  cuenta. Entonces usan `frontend/src/lib/api.ts`, que va directo a `BACKEND_URL`
  (server → server, por la red interna de Docker) **reenviando la cookie del usuario**
  con `cookies()` de `next/headers`.

En los dos casos se cumple la regla que importa: **el navegador nunca le habla al
backend**, y el frontend nunca toca Prisma ni la base. Lo único que cambia es quién
hace el salto: en un caso el rewrite, en el otro el propio server de Next.

### ¿Por qué las reglas de negocio están separadas de Express?

Para poder **testearlas sin base de datos y sin servidor**, que es requisito del TP5.
La estructura es de tres capas:

| Capa | Dónde | Qué hace | Qué NO hace |
| --- | --- | --- | --- |
| Servicios | `backend/src/services/` | Decide si algo cumple una regla | No importa Express ni Prisma |
| Rutas | `backend/src/routes/` | Parsea, autentica, consulta, mapea a HTTP | No decide reglas de negocio |
| UI | `frontend/src/` | Muestra y valida formularios | No consulta la base |

La clave está en cómo se pasan los datos: la ruta **consulta** las reservas existentes
y se las **entrega ya consultadas** al servicio, que decide si hay solapamiento. El
servicio nunca abre una conexión. Además, `ahora: Date` se pasa como parámetro en vez
de llamar a `new Date()` adentro: así un test puede decir "son las 22:00 de hoy" y
verificar la regla de las 2 horas sin esperar ni mockear el reloj.

Un test del TP5 va a ser literalmente:

```ts
validarNuevaReserva(nueva, [reservaExistente], new Date("2026-08-14T09:00:00"))
// → { ok: false, error: "Ya existe una reserva que se superpone..." }
```

Sin Postgres, sin Express, sin levantar nada.

### ¿Por qué `app.ts` está separado de `index.ts`?

`app.ts` arma la aplicación de Express y la devuelve; `index.ts` es el único que llama
a `listen()`. Así un test de integración futuro puede montar la app **sin ocupar un
puerto** ni dejar procesos colgados. Es una línea de separación que no cuesta nada y
habilita una categoría entera de tests.

### ¿Por qué se duplican las validaciones en el frontend?

`frontend/src/lib/validacion.ts` repite parte de lo que hay en
`backend/src/services/`. Es **a propósito** y hay que poder defenderlo:

- La alternativa "correcta" sería un paquete compartido, pero eso exige herramientas de
  monorepo (workspaces, un build compartido, versionado interno). **Cada imagen se
  construye desde su propia carpeta con su propio `package.json`**; un paquete
  compartido rompería esa independencia, que es justo lo que el TP quiere mostrar.
- **La autoridad es el backend, siempre.** El front valida solo para no hacer esperar
  al usuario un viaje al servidor para enterarse de que le faltó un campo. Si alguien
  saltea el front y pega directo a la API, el backend valida todo de nuevo y responde
  422. Nunca se confía en la validación del cliente.
- Lo duplicado es chico y estable: las reglas de horario no cambian todos los días.

---

## Autenticación

### ¿Por qué JWT en cookie httpOnly y no en localStorage?

Una cookie `httpOnly` **no se puede leer desde JavaScript**. Eso corta de raíz el robo
del token por XSS: si alguien inyecta un script en la página, no puede leer la cookie.
`localStorage` es accesible desde cualquier script, así que un XSS se lleva el token.
Además la cookie viaja sola en cada request al mismo dominio, así que el frontend no
tiene que "acordarse" de mandarla. Le sumamos `sameSite=lax`, que mitiga CSRF básico.

### ¿Por qué JWT y no sesiones en base de datos?

Es la opción más simple que cumple: el token es **autocontenido** y se verifica con el
secret, sin ir a la base a buscar una sesión. Evita una tabla de sesiones y su
mantenimiento. **Trade-off consciente:** no hay logout "server-side" real, no podemos
invalidar un token antes de que expire. Se acepta porque la expiración es corta (24 h)
y no hay refresh tokens.

### ¿Por qué el token lleva nombre y email adentro?

Para que el layout del frontend pueda mostrar "quién está logueado" y el link de Admin
**sin inventar un endpoint `/api/auth/me`**, que está fuera de los endpoints definidos
para el proyecto. El front decodifica el payload (que no está cifrado, solo firmado)
solo para pintar la navegación.

**Esto no es autorización y hay que decirlo así en la defensa:** el front no verifica la
firma. Alguien podría falsificar esa cookie y ver un link de más; al hacer click, el
backend verifica la firma de verdad y responde 401/403. **La autorización vive en el
backend y solo ahí.**

### ¿Por qué la cookie NO tiene `secure: true`?

Porque el criterio de aceptación del TP es que la app funcione en
`http://localhost:3000`, **sin HTTPS**. Una cookie marcada `Secure` solo viaja por
HTTPS: algunos navegadores (Safari, entre ellos) la descartan directamente sobre http,
y el login quedaría roto en la corrección.

Antes esto estaba atado a `NODE_ENV === "production"`, que en el compose vale
`production` — o sea, se habría roto justo en la demo. Se dejó explícito en `false` con
un comentario. **En un despliegue real con HTTPS delante, esto va en `true`**, y es lo
primero que habría que cambiar.

### ¿Por qué bcrypt para las contraseñas?

Nunca se guarda la contraseña en texto plano. bcrypt es un hash **lento y con salt
incorporado**, diseñado contra fuerza bruta: aunque se filtre la base, romper los hashes
es caro. Un hash genérico rápido (MD5/SHA) sería inseguro justamente por ser rápido.

### ¿Por qué `bcryptjs` y no el paquete nativo `bcrypt`?

Mismo algoritmo, pero `bcryptjs` es **JavaScript puro, sin binarios nativos**. El
paquete `bcrypt` se compila con node-gyp (python, make, g++), y en `node:20-alpine` no
hay binarios prearmados para musl: compilaría en cada build, más lento y más frágil.
`bcryptjs` no necesita toolchain, así que el build de Docker queda rápido y
reproducible.

### ¿Por qué no se usó `cookie-parser`?

Leer una cookie del header es un `split` de cuatro líneas
(`backend/src/auth.ts`, función `leerCookie`). Sumar una dependencia para eso agranda
el árbol de paquetes y la superficie a auditar sin ganar nada. Menos dependencias es
menos que puede romperse y menos advisories que revisar.

### ¿Por qué `JWT_SECRET` es obligatoria y la app falla sin ella?

Si el secret no está, firmar y verificar tokens no tiene sentido y sería un agujero de
seguridad silencioso. Preferimos **fallar temprano y ruidosamente**: `assertEnv()` se
ejecuta en `index.ts` **antes** del `listen()`, así que el contenedor muere con un
mensaje claro en vez de quedar levantado y explotar recién en el primer login.

---

## Configuración

### ¿Por qué todo por variables de entorno?

La **misma imagen** tiene que correr en local, en QA y en producción sin recompilar ni
tocar código, apuntando a bases distintas. `DATABASE_URL` es la única fuente de conexión
(prohibido duplicarla o hardcodearla). Cambiar de entorno = cambiar variables.

### ¿Por qué la password de Postgres entra por `${DB_PASSWORD}` desde un `.env`?

Porque **los secretos no se commitean**. El `.env` está en `.gitignore`; lo que sí se
versiona es `.env.example`, que documenta qué variables hacen falta y con qué forma,
con valores de ejemplo. El compose usa la sintaxis `${DB_PASSWORD:?mensaje}`: si la
variable falta, `docker compose up` falla al instante con un mensaje entendible en vez
de levantar Postgres con una password vacía.

Por eso el arranque en frío son **dos comandos** (`cp .env.example .env` y
`docker compose up -d`) y no uno. **Ese paso extra es parte del diseño, no un
defecto:** un `up` de un solo comando solo es posible si los secretos están escritos en
un archivo versionado, que es exactamente lo que hay que evitar.

### ¿Por qué se fija `TZ` en los contenedores?

Este fue un problema real encontrado durante la implementación. Por defecto un
contenedor corre en **UTC**, mientras que el navegador del usuario está en UTC−3. Las
reglas de horario usan la hora local del backend (`getHours()` para el rango 08:00–23:00)
y `validarNoPasado` compara contra `new Date()`.

Sin `TZ`, una reserva pedida a las 10:00 se guardaría como 10:00 UTC = **07:00 hora
local**, y a las 8 de la mañana la regla "sin reservas en el pasado" habría rechazado
reservas perfectamente válidas del mismo día. Fijar `TZ` en `backend` y `frontend`
alinea los tres relojes (navegador, front y backend).

La alternativa "más correcta" sería guardar todo en UTC y convertir en los bordes, pero
eso agrega complejidad de zonas horarias a una app que sirve a **un solo club en una
sola ciudad**. Se documenta el atajo en vez de disfrazarlo.

---

## Docker

### ¿Por qué Dockerfile multi-stage (deps → build → runner)?

Para que la **imagen final sea chica y sin herramientas de build**. En `deps` se
instalan dependencias, en `build` se compila, y al `runner` se copia solo lo necesario
para correr. El resultado no lleva devDependencies, ni el compilador de TypeScript, ni
el código fuente. Menos peso y menos superficie de ataque.

Los números concretos de este proyecto (ver `evidencias.md`): el monolito anterior en
una sola imagen pesaba **862 MB**; ahora backend **381 MB** + frontend **300 MB**.

### ¿Por qué el backend pesa más que el frontend?

Por **Prisma**: el cliente generado y los engines nativos son unos 70 MB, y encima el
CLI de `prisma` tiene que quedar en la imagen final porque el entrypoint lo usa para
correr `migrate deploy`. Por eso `prisma` está en `dependencies` y no en
`devDependencies`: si estuviera en dev, `npm ci --omit=dev` lo dejaría afuera y el
entrypoint fallaría.

### El error del `chown -R`: 91 MB de más

Durante la implementación la imagen del backend pesaba **510 MB**. El culpable era esta
línea:

```dockerfile
RUN chmod +x docker-entrypoint.sh && chown -R node:node /app
```

Un `chown -R` **reescribe todos los archivos**, y como cada `RUN` crea una capa nueva,
Docker guardaba una segunda copia entera de `node_modules`: 91 MB duplicados. La
solución es hacer el cambio de dueño **en el momento de copiar**, sin capa extra:

```dockerfile
COPY --from=build --chown=node:node /app/dist ./dist
COPY --chown=node:node --chmod=755 docker-entrypoint.sh ./docker-entrypoint.sh
```

510 MB → **381 MB**. Es el ejemplo más claro de por qué en Docker importa *cómo* se
escribe cada instrucción, no solo qué hace.

### ¿Por qué `output: "standalone"` en Next?

Next arma un `server.js` autocontenido con **solo las dependencias que realmente usa**
(file tracing). No hace falta copiar todo `node_modules` al runner. Es la forma
recomendada de dockerizar Next y da la imagen más liviana.

Detalle: hubo que fijar `outputFileTracingRoot` en `next.config.ts`. Next busca
lockfiles hacia arriba para inferir la raíz del proyecto y, con un `package-lock.json`
suelto en el directorio del usuario, elegía una carpeta padre. Eso cambia la estructura
de `.next/standalone` y rompe el `COPY` del Dockerfile. Fijándolo, el build es
determinístico en cualquier máquina.

### ¿Por qué `node:20-alpine`?

Alpine es una base **mínima** → imágenes chicas y builds rápidos. Costo: usa musl en vez
de glibc, por eso hay que ser explícito con los engines de Prisma e instalar `openssl`.

### ¿Por qué instalar `openssl` y declarar `binaryTargets` en Prisma?

Prisma usa **motores nativos** que dependen de la libc y del OpenSSL del sistema. En
Alpine (musl + OpenSSL 3) hay que (1) instalar `openssl` para que los engines carguen y
(2) declarar los targets `linux-musl-openssl-3.0.x` (x64, para CI e Intel) y
`linux-musl-arm64-openssl-3.0.x` (para Apple Silicon). Sin esto, Prisma genera el engine
equivocado y falla en runtime con "query engine not found".

### ¿Por qué usuario no-root?

Si algo compromete el proceso, que **no tenga privilegios de root** dentro del
contenedor. Los dos servicios corren como el usuario `node`. Se verifica con
`docker compose exec backend whoami`.

### ¿Por qué `HEALTHCHECK` contra `/api/health`?

Le da a Docker una forma de saber si la app **está realmente lista**, no solo si el
proceso arrancó. Es lo que permite que el `frontend` espere con
`depends_on: condition: service_healthy` a que el backend haya terminado de migrar y
sembrar. Sin eso, el front podría atender pedidos contra un backend que todavía está
corriendo migraciones.

Se usa `127.0.0.1` y no `localhost` porque dentro del contenedor `localhost` puede
resolver a IPv6 mientras el server escucha en IPv4.

`/api/health` es el único endpoint **sin autenticación**: un healthcheck no tiene
cookies para presentar.

### ¿Por qué migrar y sembrar en el ENTRYPOINT? ¿Qué riesgo tiene?

El criterio es que `docker compose up` deje **todo usable sin pasos manuales**. El
entrypoint corre `prisma migrate deploy` y el seed antes de arrancar el server. Ventaja:
cero comandos extra, la base siempre queda al día con el código.

**Riesgo / trade-off, que hay que saber decir:** si se escala a varias réplicas del
backend, **todas** correrían las migraciones al arrancar y podrían pisarse (condición de
carrera). En un sistema más grande esto se hace en un **Job separado** del despliegue,
una sola vez, antes de levantar las réplicas. Para esta app, con una sola instancia,
migrar en el entrypoint es lo más simple: `migrate deploy` solo aplica lo que falta y el
seed usa `upsert`, así que reejecutarlos es seguro. La prueba de persistencia lo
confirma: después de `down` + `up` el seed corre de nuevo y **no duplica nada**.

### ¿Qué persiste y qué no?

Persiste **solo** lo que está en el volumen nombrado `db_data`, que guarda el directorio
de datos de Postgres. Todo lo demás (código, `node_modules`, logs, el sistema de
archivos de los contenedores) es efímero y se pierde en cada recreación.

- `docker compose down` → borra los contenedores, **conserva** el volumen. Los datos
  siguen ahí.
- `docker compose down -v` → borra también el volumen. La base vuelve a nacer vacía y
  el entrypoint la reconstruye con las migraciones y el seed.

Ver `evidencias.md` para la corrida completa de esta prueba.

---

## CI (GitHub Actions)

### ¿Por qué ese orden: lint → typecheck → build → imágenes?

De lo **más barato y rápido a lo más caro**, para fallar cuanto antes. El lint y el
typecheck tardan segundos y atrapan la mayoría de los errores; recién si pasan tiene
sentido gastar minutos en compilar y construir imágenes. Se usan `DATABASE_URL`,
`JWT_SECRET` y `BACKEND_URL` dummy porque ningún paso necesita una base real, pero las
variables tienen que existir.

### ¿Por qué el CI construye las imágenes pero no las pushea?

Construirlas verifica que **los Dockerfile siguen siendo válidos** en cada commit, que
es donde suele romperse el sistema de entrega. Publicar, en cambio, es una decisión
deliberada asociada a una versión (`v0.1.0`), no algo que deba pasar en cada push a una
rama. En este TP la publicación en GHCR es manual; automatizar el push por tag es tema
del TP de CI/CD.

### ¿Por qué el job de tests está comentado?

Porque los tests son el TP4/TP5 y **todavía no existen**. Un job que corriera `npm test`
sin tests fallaría o pasaría vacío, que es peor: da una sensación falsa de cobertura.
Queda el esqueleto con el TODO para descomentar cuando haya qué correr. Lo que sí está
listo es la **testeabilidad**: reglas puras en `backend/src/services/`, validaciones
puras en `frontend/src/lib/validacion.ts` y la app de Express montable sin `listen()`.

---

## Problemas encontrados durante la implementación

1. **El proyecto estaba mal arquitecturado.** Era un Next.js fullstack con Prisma
   dentro de las páginas. Hubo que separarlo en dos servicios. Lo que se salvó entero
   fueron los servicios de reglas de negocio: al ser funciones puras, se movieron de
   carpeta sin cambiarles una línea. **Esa es la ventaja concreta de tener las reglas
   desacopladas**, y es un buen argumento para la defensa.
2. **`fetch` relativo en componentes de servidor.** No funciona: en el server no hay
   origen. Se resolvió con `frontend/src/lib/api.ts` (explicado arriba).
3. **La zona horaria de los contenedores.** UTC vs UTC−3 rompía la regla de "sin
   reservas en el pasado". Se resolvió fijando `TZ`.
4. **La cookie `Secure` en `NODE_ENV=production`.** Habría roto el login en la demo
   sobre http. Se resolvió dejando `secure: false` explícito y documentado.
5. **91 MB de más por un `chown -R`.** Explicado arriba.
6. **`outputFileTracingRoot` de Next.** Explicado arriba.
7. **Vulnerabilidades en Next 15.1.6.** `npm audit` reportaba advisories críticas,
   incluidas dos sobre **rewrites** (request smuggling y SSRF), que es justo el
   mecanismo que usa este proyecto. Se actualizó a 15.5.23 (misma versión mayor, sin
   cambios de API). Quedan 3 advisories `high` en `sharp`, una dependencia transitiva
   de Next para optimización de imágenes que esta app no usa; cerrarlas exige saltar a
   Next 16, un cambio mayor que no se justifica ahora.

---

## Uso de IA

**Declaración obligatoria.** Este proyecto fue desarrollado con asistencia de **Claude
Code** (Anthropic). Ocultarlo o minimizarlo no sería defendible, así que se detalla qué
hizo la IA y —más importante— **cómo se verificó cada cosa**.

### Qué se hizo con asistencia de IA

| Parte | Rol de la IA | Cómo se verificó |
| --- | --- | --- |
| Reestructuración a dos servicios | Movió los archivos y adaptó los handlers de Next a Express | `npm run build` y `tsc --noEmit` en ambos proyectos; `grep -ri prisma frontend/src` sin resultados |
| Reglas de negocio (`services/`) | Escritas con asistencia, **movidas sin cambios** en la reestructuración | 15 casos probados por HTTP contra el stack levantado (ver `evidencias.md`) |
| Auth (bcrypt, JWT, cookie) | Portada de `next/headers` a `req`/`res` de Express | Login, logout, 401 sin cookie, 403 ajeno, `Set-Cookie` inspeccionado con `curl -i` |
| Dockerfiles y compose | Escritos con asistencia | `docker compose up -d` desde cero, prueba de persistencia, `whoami` → `node`, healthchecks en `healthy` |
| Documentación | Redactada con asistencia | Revisada y contrastada contra el código real |

### Hallazgos de la IA que hubo que evaluar (no aceptar a ciegas)

Cuatro de los problemas de la lista de arriba (zona horaria, cookie `Secure`, el
`chown -R`, `outputFileTracingRoot`) los detectó la IA, pero **ninguno se aceptó sin
comprobarlo**:

- El `chown -R` se confirmó con `docker history`, que mostraba la capa de 91 MB, y se
  midió la imagen antes (510 MB) y después (381 MB).
- La zona horaria se verificó viendo que una reserva de las 15:00 se guarda como
  `18:00Z`, que es 15:00 en UTC−3.
- El resto se comprobó levantando el stack y ejercitando el flujo real.

### Qué NO hizo la IA

No tomó las decisiones de alcance ni de arquitectura: qué pantallas hay, cuáles son las
7 reglas, dos servicios en vez de uno, y los criterios de entrega salieron de la
consigna de la cátedra y del enunciado del TP.

### Postura

La IA se usó como un par que escribe rápido y propone; **la verificación fue siempre
por evidencia ejecutable** (builds, `curl` contra el stack real, `docker history`,
`docker compose ps`), nunca "quedó lindo, va". Todo lo que está en `evidencias.md` es
salida real de comandos, no texto generado.
