# Decisiones — Ingeniería de Software 3

Este documento explica el **porqué** de cada decisión técnica, en lenguaje simple.
Es material de estudio para la defensa oral: está escrito para una persona, no como
changelog. Si en la defensa preguntan "¿por qué X?", la respuesta está acá.

Es un documento **único para toda la materia**: cada TP agrega su sección al final y
las anteriores quedan intactas, para que el recorrido del semestre se lea de corrido.
Cada sección incluye su propia **declaración de uso de IA**.

Secciones a futuro: `## TP2 — Contenedores` (Dockerfiles, compose y persistencia),
CI y despliegue cuando correspondan.

---

## Enlaces del TP7

**Paquetes públicos** (se bajan sin credenciales, por la etiqueta `sha-<commit>`; la de
`v7.0.0` está abajo, en «La release»):

- https://github.com/FranZago1/ingsoft3-tp01/pkgs/container/ingsoft3-tp01-backend
- https://github.com/FranZago1/ingsoft3-tp01/pkgs/container/ingsoft3-tp01-frontend

```bash
docker pull --platform linux/amd64 ghcr.io/franzago1/ingsoft3-tp01-backend:sha-3ffa9bfc40bce755d2992f071c0c8a7302864d58
docker pull --platform linux/amd64 ghcr.io/franzago1/ingsoft3-tp01-frontend:sha-3ffa9bfc40bce755d2992f071c0c8a7302864d58
```

**La corrida roja: integración VERDE, e2e ROJA, `deploy-prod` sin arrancar.**

- El commit que rompió la app (sólo toca `frontend/src/app/reservas/nueva/page.tsx`, nada de `e2e/`):
  https://github.com/FranZago1/ingsoft3-tp01/commit/3f05e9392ff87f75ce837b20515cd21734dcc96d (PR #31)
- La corrida: https://github.com/FranZago1/ingsoft3-tp01/actions/runs/37701015542
- Reporte de integración, en verde (`playwright-report-integracion`):
  https://github.com/FranZago1/ingsoft3-tp01/actions/runs/37701015542/artifacts/11518120052
- Reporte e2e, en rojo, con capturas y trazas (`playwright-report-e2e`):
  https://github.com/FranZago1/ingsoft3-tp01/actions/runs/37701015542/artifacts/11517498120

**La corrida completa en verde posterior, hasta PROD** (el arreglo, PR #32):
https://github.com/FranZago1/ingsoft3-tp01/actions/runs/37701852507

**Los entornos**, vivos hasta la defensa (el primer pedido tarda hasta un minuto: el free tier duerme):

| | Front | API |
| --- | --- | --- |
| QA | https://reservapadel-front-qa.onrender.com | https://reservapadel-api-qa.onrender.com/api/health |
| PROD | https://reservapadel-front-prod.onrender.com | https://reservapadel-api-prod.onrender.com/api/health |

Para entrar: `jugador@club.com` / `jugador1234` (el usuario del seed, el mismo que usan las suites).

**La release:** https://github.com/FranZago1/ingsoft3-tp01/releases/tag/v7.0.0

---

## Enlaces de este TP (TP6)

**Paquetes públicos** (se bajan sin credenciales; los dos etiquetados con el commit del
merge del PR #26):

- https://github.com/FranZago1/ingsoft3-tp01/pkgs/container/ingsoft3-tp01-backend —
  `docker pull --platform linux/amd64 ghcr.io/franzago1/ingsoft3-tp01-backend:sha-4ec4e09a6dca981744b3d86e6303983e09a7151b`
- https://github.com/FranZago1/ingsoft3-tp01/pkgs/container/ingsoft3-tp01-frontend —
  `docker pull --platform linux/amd64 ghcr.io/franzago1/ingsoft3-tp01-frontend:sha-4ec4e09a6dca981744b3d86e6303983e09a7151b`

**La cadena del registry:**

1. PR con los tests en verde que **no** publicó («Entrar al registry» salteado):
   https://github.com/FranZago1/ingsoft3-tp01/actions/runs/36619747550/job/109581806502
2. Corrida de `main` donde «Construir y publicar la imagen» es el **último** paso:
   https://github.com/FranZago1/ingsoft3-tp01/actions/runs/36619870756/job/109582221272

**Los entornos** (el primer pedido tarda hasta un minuto: el free tier duerme):

| | Front | API |
| --- | --- | --- |
| QA | https://reservapadel-front-qa.onrender.com | https://reservapadel-api-qa.onrender.com/api/health |
| PROD | https://reservapadel-front-prod.onrender.com | https://reservapadel-api-prod.onrender.com/api/health |

---

## TP1 — Ramas protegidas, pull requests y conflictos

### 1. Por qué Git no pudo resolver el conflicto solo

**Qué pasó exactamente.** Las dos ramas de trabajo nacieron del mismo commit de `main`  y las dos reescribieron la línea 1 del `README.md`, cada una con un título distinto. Cuando se integró `feature/titulo-a` (PR #2), `main` pasó a tener "versión A". Al intentar integrar `feature/titulo-b` (PR #3), Git ejecutó un merge de tres vías: comparó las dos puntas contra el ancestro común y encontró que ambas habían modificado la misma línea, respecto de ese ancestro, de forma divergente.

Ahí Git se detiene, y no por una limitación que un algoritmo más sofisticado pudiera superar: Git compara texto, no interpreta su significado. No existe ninguna regla mecánica que le permita decidir si el título correcto es "versión A" o "versión B", porque esa respuesta no está en los archivos sino en la decisión del equipo. Lo único honesto que puede hacer es escribir las dos versiones, marcar dónde empieza y termina cada una con `<<<<<<<`, `=======` y `>>>>>>>`, y devolver la decisión a una persona. El conflicto no es un error: es Git negándose a inventar una respuesta que no tiene.

La prueba de que el criterio es "misma línea" y no "mismo archivo" está en la captura del editor de conflictos: la sección `## instalación`, en el mismo `README.md`, se fusionó sola. Ninguna de las dos ramas la tocó, así que no había nada que decidir.

**Qué habría tenido que pasar para que nunca apareciera.** El camino más realista es integrar antes. Si `feature/titulo-b` hubiera hecho `git pull` de `main` después de mergear el PR #2 —o se hubiera creado recién ahí—, habría partido de un `main` que ya tenía "versión A", y su cambio habría sido una edición secuencial y no paralela: sin conflicto. Esa es la lógica detrás de integrar seguido a la rama principal; las ramas cortas no evitan los conflictos, los mantienen chicos. Un segundo camino es repartir el trabajo de modo que cada rama toque zonas distintas del archivo, donde Git fusiona sin preguntar. Y el fondo del asunto es que el conflicto de Git es el síntoma: la causa es que dos cambios incompatibles se tomaron sobre lo mismo sin coordinar previamente, y eso ninguna herramienta lo resuelve.

Vale aclarar lo evidente: en este TP el conflicto se fabricó a propósito, siguiendo la guía. El objetivo no era evitarlo sino provocarlo en un entorno controlado, que es preferible a encontrárselo por primera vez en un repositorio de trabajo real.

### 2. Qué problemas encontré y cómo los solucioné

**a) El push directo a `main` rechazado.** Después de proteger la rama, hice un commit local y probé `git push` para confirmar que la protección funcionaba. Los objetos se transfirieron sin problema —autenticación y permisos de escritura estaban—, pero el servidor devolvió `GH006: Protected branch update failed` y `! [remote rejected] main -> main (protected branch hook declined)`. Lo que al principio me desconcertó es que el rechazo me alcanzaba a mí, que soy el dueño del repositorio: como activé *Do not allow bypassing the above settings*, la regla aplica también al administrador. En rigor no era un problema a resolver sino el resultado buscado —la prueba de que la protección funciona—, pero la reacción natural frente a un `error:` en rojo es querer dar vuelta la configuración, y acá el rojo era el éxito. Asumí el flujo correcto (trabajar en ramas, entrar a `main` por PR) y descarté el commit huérfano con `git reset --hard HEAD~1`.

**b) GitHub tarda unos segundos en detectar el conflicto.** Inmediatamente después de mergear el PR #2, el PR #3 seguía figurando como *mergeable*. Recién unos segundos más tarde apareció el aviso *Merge conflicts* y el botón de merge quedó deshabilitado. Al principio me desconcertó que un PR "sano" se rompiera sin que yo tocara su rama, hasta que entendí que el estado de mergeabilidad se calcula contra el `main` del momento —y ese `main` se había movido— y que GitHub lo recalcula en segundo plano, no al instante. Esto importaba porque la captura del conflicto había que sacarla en ese momento exacto: si la tomaba apenas mergeado el PR #2, habría fotografiado una pantalla que todavía no mostraba el conflicto. La solución fue verificar el estado antes de capturar, no capturar y suponer.

**c) La resolución del conflicto en sí.** Con el PR #3 ya marcado como conflictivo, entré al editor de conflictos de GitHub. El archivo mostraba las dos versiones separadas por los marcadores. Resolví a mano: elegí la versión que correspondía, eliminé las tres líneas de marcadores (`<<<<<<<`, `=======`, `>>>>>>>`) y marqué el archivo como resuelto para poder completar el merge. Verifiqué después que no quedara ningún marcador huérfano en el `README.md`, porque mientras quede uno el archivo no puede darse por resuelto.

### 3. Declaración de uso de IA

**Qué hice con ayuda de IA.** Usé asistencia de IA únicamente para redactar las descripciones que acompañan las capturas de pantalla presentadas como evidencia: es decir, para pasar a texto claro lo que se observa en cada screenshot, y para la redacción de este documento.

**Qué hice yo.** Toda la ejecución de la guía la hice a mano, siguiendo el paso a paso del enunciado: proteger la rama `main`, crear y mergear los pull requests con squash, provocar el conflicto entre las dos ramas de título, y resolverlo eligiendo yo la versión final y borrando los marcadores. La decisión de contenido del conflicto —qué título quedaba— y el método de resolución —a mano, no con un botón automático— fueron míos. Las capturas las tomé yo de mi propia terminal y de mi sesión de GitHub.

**Cómo verifiqué lo que la IA me devolvió.** Contrasté cada descripción redactada por la IA directamente contra la evidencia real: revisé que los hashes de commit, los nombres de rama, los mensajes de error y lo que se afirma que muestra cada pantalla coincidieran exactamente con lo que se ve en la captura y con lo que efectivamente ocurrió en mi terminal y en GitHub. Donde el texto no correspondía a la evidencia real, lo corregí antes de incorporarlo al informe.


---

## La aplicación — ReservaPadel

Las decisiones de la app que sirve de base a los TP siguientes: qué hace, por qué
es del tamaño que es y cómo está armada por dentro.

### Alcance y tamaño

#### ¿Por qué esta app y no otra?

Los criterios de la cátedra piden un sistema que se pueda **entregar**: contenerizar,
configurar por entorno, versionar, testear. Una app de reservas de canchas cumple todo
eso con un dominio que se explica en una frase y que además tiene **reglas de negocio
de verdad** (solapamiento, horarios, transiciones de estado, permisos), no un CRUD
plano. Eso importa porque el TP5 pide 8 tests de backend: si el dominio fuera "guardar
un nombre en una tabla" no habría nada interesante que testear.

#### ¿Por qué es tan chica? ¿No le falta funcionalidad?

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
la materia. **El foco no es la app: es cómo se entrega la app.**

---

### Arquitectura

#### ¿Por qué dos servicios y no un Next.js fullstack?

Next.js puede perfectamente tener sus route handlers (`app/api/...`) hablando con
Prisma: una sola app, menos piezas. De hecho **el proyecto empezó así y se
reestructuró**. Las razones del cambio:

1. **Es lo que la materia quiere enseñar.** Un solo servicio no tiene red interna, ni
   dependencias entre procesos, ni un proxy. Con dos servicios la topología deja de ser
   decorativa: si el backend no está, el frontend no tiene a quién pedirle datos, y eso
   se ve.
2. **Escalan distinto.** El front SSR es CPU liviana y muchas conexiones; el backend
   tiene el pool de Postgres. Separados se pueden replicar de forma independiente.
3. **El backend no depende de Next.** Las reglas de negocio no saben qué las consume.
   Mañana una app móvil pega a la misma API sin tocar una línea.
4. **Los tests del TP5 quedan más limpios.** Los servicios son TypeScript plano en
   `backend/src/services/`: se testean con `node` a secas, sin el runtime de Next
   alrededor.

**El costo, para ser honestos:** dos `package.json`, dos builds, dos procesos que
levantar en desarrollo, y la duplicación de validaciones que se explica más abajo. Es un
costo real que se paga a cambio de una arquitectura que se puede mostrar y defender.

#### ¿Por qué rewrites de Next y no nginx?

En el caso típico de una SPA (React/Vue compilado a estáticos) hace falta **nginx**:
sirve los archivos y proxea `/api` al backend, porque un `index.html` no puede proxear
nada.

Acá el front es **SSR**: ya hay un proceso Node de Next escuchando en el 3000, y ese
proceso sabe hacer de proxy. El `rewrite` de `next.config.ts` reenvía todo `/api/*` a
`BACKEND_URL`. Meter nginx sería agregar **una tercera pieza que no hace nada que Next
no haga ya**: más configuración, más cosas que se pueden romper.

El beneficio es el mismo que daría nginx: el navegador **solo conoce el puerto 3000**.
No hay CORS que configurar (todo es mismo origen), la cookie de sesión pertenece a un
único dominio, y el backend puede quedar sin exponer al exterior.

```
navegador ──/api/reservas──▶ Next (3000) ──rewrite──▶ backend (8080) ──▶ Postgres (5432)
```

#### ¿Cómo hacen las páginas SSR para pedirle datos al backend?

Acá hay un detalle fino que conviene tener clarísimo para la defensa, porque parece una
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
  (server → server) **reenviando la cookie del usuario** con `cookies()` de
  `next/headers`.

En los dos casos se cumple la regla que importa: **el navegador nunca le habla al
backend**, y el frontend nunca toca Prisma ni la base. Lo único que cambia es quién hace
el salto: en un caso el rewrite, en el otro el propio server de Next.

#### ¿Por qué las reglas de negocio están separadas de Express?

Para poder **testearlas sin base de datos y sin servidor**, que es requisito del TP5.
La estructura es de tres capas:

| Capa | Dónde | Qué hace | Qué NO hace |
| --- | --- | --- | --- |
| Servicios | `backend/src/services/` | Decide si algo cumple una regla | No importa Express ni Prisma |
| Rutas | `backend/src/routes/` | Parsea, autentica, consulta, mapea a HTTP | No decide reglas de negocio |
| UI | `frontend/src/` | Muestra y valida formularios | No consulta la base |

La clave está en cómo se pasan los datos: la ruta **consulta** las reservas existentes y
se las **entrega ya consultadas** al servicio, que decide si hay solapamiento. El
servicio nunca abre una conexión. Además, `ahora: Date` se pasa como parámetro en vez de
llamar a `new Date()` adentro: así un test puede decir "son las 22:00 de hoy" y verificar
la regla de las 2 horas sin esperar ni mockear el reloj.

Un test del TP5 va a ser literalmente:

```ts
validarNuevaReserva(nueva, [reservaExistente], new Date("2026-08-14T09:00:00"))
// → { ok: false, error: "Ya existe una reserva que se superpone..." }
```

Sin Postgres, sin Express, sin levantar nada.

#### ¿Por qué `app.ts` está separado de `index.ts`?

`app.ts` arma la aplicación de Express y la devuelve; `index.ts` es el único que llama a
`listen()`. Así un test de integración futuro puede montar la app **sin ocupar un
puerto** ni dejar procesos colgados. Es una línea de separación que no cuesta nada y
habilita una categoría entera de tests.

#### ¿Por qué se duplican las validaciones en el frontend?

`frontend/src/lib/validacion.ts` repite parte de lo que hay en
`backend/src/services/`. Es **a propósito** y hay que poder defenderlo:

- La alternativa "correcta" sería un paquete compartido, pero eso exige herramientas de
  monorepo (workspaces, un build compartido, versionado interno). Cada proyecto tiene su
  propio `package.json` y se construye solo; un paquete compartido rompería esa
  independencia, que es justo lo que se quiere mostrar.
- **La autoridad es el backend, siempre.** El front valida solo para no hacer esperar al
  usuario un viaje al servidor para enterarse de que le faltó un campo. Si alguien
  saltea el front y pega directo a la API, el backend valida todo de nuevo y responde
  422. Nunca se confía en la validación del cliente.
- Lo duplicado es chico y estable: las reglas de horario no cambian todos los días.

---

### Autenticación

#### ¿Por qué JWT en cookie httpOnly y no en localStorage?

Una cookie `httpOnly` **no se puede leer desde JavaScript**. Eso corta de raíz el robo
del token por XSS: si alguien inyecta un script en la página, no puede leer la cookie.
`localStorage` es accesible desde cualquier script, así que un XSS se lleva el token.
Además la cookie viaja sola en cada request al mismo dominio, así que el frontend no
tiene que "acordarse" de mandarla. Le sumamos `sameSite=lax`, que mitiga CSRF básico.

#### ¿Por qué JWT y no sesiones en base de datos?

Es la opción más simple que cumple: el token es **autocontenido** y se verifica con el
secret, sin ir a la base a buscar una sesión. Evita una tabla de sesiones y su
mantenimiento. **Trade-off consciente:** no hay logout "server-side" real, no podemos
invalidar un token antes de que expire. Se acepta porque la expiración es corta (24 h) y
no hay refresh tokens.

#### ¿Por qué el token lleva nombre y email adentro?

Para que el layout del frontend pueda mostrar "quién está logueado" y el link de Admin
**sin inventar un endpoint `/api/auth/me`**, que está fuera de los endpoints definidos
para el proyecto. El front decodifica el payload (que no está cifrado, solo firmado)
solo para pintar la navegación.

**Esto no es autorización y hay que decirlo así en la defensa:** el front no verifica la
firma. Alguien podría falsificar esa cookie y ver un link de más; al hacer click, el
backend verifica la firma de verdad y responde 401/403. **La autorización vive en el
backend y solo ahí.**

#### ¿Por qué la cookie NO tiene `secure: true`?

Porque toda la app corre hoy sobre **http**, sin TLS. Una cookie marcada `Secure` solo
viaja por HTTPS: algunos navegadores (Safari, entre ellos) la descartan directamente
sobre http, y el login quedaría roto.

Estaba atado a `NODE_ENV === "production"`, lo cual es una trampa: cualquier despliegue
que use `NODE_ENV=production` sobre http rompe el login sin avisar. Se dejó explícito en
`false` con un comentario. **En un despliegue real con HTTPS delante esto va en `true`**,
y es lo primero que hay que cambiar.

#### ¿Por qué bcrypt para las contraseñas?

Nunca se guarda la contraseña en texto plano. bcrypt es un hash **lento y con salt
incorporado**, diseñado contra fuerza bruta: aunque se filtre la base, romper los hashes
es caro. Un hash genérico rápido (MD5/SHA) sería inseguro justamente por ser rápido.

#### ¿Por qué `bcryptjs` y no el paquete nativo `bcrypt`?

Mismo algoritmo, pero `bcryptjs` es **JavaScript puro, sin binarios nativos**. El paquete
`bcrypt` se compila con node-gyp (python, make, g++), lo que lo vuelve más lento y más
frágil de instalar, sobre todo en imágenes base mínimas donde no hay binarios prearmados.
`bcryptjs` no necesita toolchain: instalar es siempre igual de rápido y reproducible.

#### ¿Por qué no se usó `cookie-parser`?

Leer una cookie del header es un `split` de cuatro líneas (`backend/src/auth.ts`, función
`leerCookie`). Sumar una dependencia para eso agranda el árbol de paquetes y la
superficie a auditar sin ganar nada. Menos dependencias es menos que puede romperse y
menos advisories que revisar.

#### ¿Por qué `JWT_SECRET` es obligatoria y la app falla sin ella?

Si el secret no está, firmar y verificar tokens no tiene sentido y sería un agujero de
seguridad silencioso. Preferimos **fallar temprano y ruidosamente**: `assertEnv()` se
ejecuta en `index.ts` **antes** del `listen()`, así que el proceso muere con un mensaje
claro en vez de quedar levantado y explotar recién en el primer login.

---

### Configuración

#### ¿Por qué todo por variables de entorno?

El **mismo código** tiene que correr en local, en QA y en producción sin recompilar ni
tocar nada, apuntando a bases distintas. `DATABASE_URL` es la única fuente de conexión
(prohibido duplicarla o hardcodearla). Cambiar de entorno = cambiar variables.

#### ¿Por qué la password de Postgres entra por `${DB_PASSWORD}` desde un `.env`?

Porque **los secretos no se commitean**. El `.env` está en `.gitignore`; lo que sí se
versiona es `.env.example`, que documenta qué variables hacen falta y con qué forma, con
valores de ejemplo. La sintaxis `${DB_PASSWORD:?mensaje}` hace que levantar la base falle
al instante con un mensaje entendible si la variable no está, en vez de arrancar Postgres
con una password vacía.

#### La app trabaja en hora local, y eso hay que saberlo

Las reglas de horario usan la hora local del backend: `getHours()` para el rango
08:00–23:00, y `validarNoPasado` compara contra `new Date()`. Es la decisión más simple y
alcanza porque la app sirve a **un solo club en una sola ciudad**.

**La consecuencia, que hay que poder explicar:** si el backend corre con una zona horaria
distinta a la del usuario, las reglas se corren de lugar. Una reserva pedida a las 10:00
contra un proceso en UTC se guarda como 10:00 UTC, que son las 07:00 en UTC−3, y la regla
"sin reservas en el pasado" empieza a rechazar reservas perfectamente válidas del mismo
día. O sea: **el entorno donde corra el backend tiene que tener la zona horaria
correcta**, no es un detalle cosmético.

La alternativa más robusta sería guardar todo en UTC y convertir en los bordes, pero eso
agrega complejidad de zonas horarias a una app que no la necesita. Es un atajo
documentado, no un descuido.

---

### Dependencias y seguridad

#### ¿Por qué se actualizó Next de 15.1.6 a 15.5.23?

`npm audit` reportaba advisories **críticas** en 15.1.6, entre ellas dos que afectan
directamente a los **rewrites** (request smuggling y SSRF), que es el mecanismo central
de esta arquitectura. La actualización es dentro de la misma versión mayor, sin cambios
de API.

Quedan 3 advisories `high` en `sharp`, una dependencia transitiva de Next para
optimización de imágenes que esta app no usa (no hay `next/image` en ningún lado).
Cerrarlas exige saltar a Next 16, un cambio mayor que hoy no se justifica. **Es una
decisión consciente, no una vulnerabilidad ignorada**, y conviene tenerla lista por si la
preguntan.

---

### Problemas encontrados durante la implementación

1. **El proyecto estaba mal arquitecturado.** Era un Next.js fullstack con Prisma dentro
   de las páginas. Hubo que separarlo en dos proyectos. Lo que se salvó entero fueron los
   servicios de reglas de negocio: al ser funciones puras, se movieron de carpeta sin
   cambiarles una línea. **Esa es la ventaja concreta de tener las reglas desacopladas**,
   y es un buen argumento para la defensa.
2. **`fetch` relativo en componentes de servidor.** No funciona: en el server no hay
   origen. Se resolvió con `frontend/src/lib/api.ts` (explicado arriba).
3. **La zona horaria.** Explicado arriba: rompía la regla de "sin reservas en el pasado"
   cuando el backend corría en UTC.
4. **La cookie `Secure` atada a `NODE_ENV=production`.** Habría roto el login en
   cualquier despliegue sobre http. Se resolvió dejándolo explícito y documentado.
5. **`outputFileTracingRoot` de Next.** Next infiere la raíz del proyecto buscando
   lockfiles hacia arriba y elegía el home del usuario por un `package-lock.json` suelto,
   llenando el build de advertencias. Se fijó explícitamente.
6. **Vulnerabilidades en Next 15.1.6.** Explicado arriba.

---

### Uso de IA

**Declaración obligatoria.** Este proyecto fue desarrollado con asistencia de **Claude
Code** (Anthropic). Ocultarlo o minimizarlo no sería defendible, así que se detalla qué
hizo la IA y —más importante— **cómo se verificó cada cosa**.

#### Qué se hizo con asistencia de IA

| Parte | Rol de la IA | Cómo se verificó |
| --- | --- | --- |
| Reestructuración a dos proyectos | Movió los archivos y adaptó los handlers de Next a Express | `npm run build` y `tsc --noEmit` en ambos; `grep -ri prisma frontend/src` sin resultados |
| Reglas de negocio (`services/`) | Escritas con asistencia, **movidas sin cambios** en la reestructuración | 18 casos probados por HTTP contra la app levantada |
| Auth (bcrypt, JWT, cookie) | Portada de `next/headers` a `req`/`res` de Express | Login, logout, 401 sin cookie, 403 ajeno, `Set-Cookie` inspeccionado con `curl -i` |
| Pantallas | Adaptadas para consumir la API en vez de Prisma | Renderizadas y verificadas con la app corriendo |
| Este documento | Redactado con asistencia | Revisado y contrastado contra el código real |

#### Hallazgos de la IA que hubo que evaluar (no aceptar a ciegas)

Tres de los problemas de la lista de arriba (zona horaria, cookie `Secure`,
`outputFileTracingRoot`) los detectó la IA, pero **ninguno se aceptó sin comprobarlo**:
la zona horaria se verificó viendo que una reserva de las 15:00 se guarda como `18:00Z`,
que es 15:00 en UTC−3, y el resto se comprobó levantando la app y ejercitando el flujo
real.

#### Qué NO hizo la IA

No tomó las decisiones de alcance ni de arquitectura: qué pantallas hay, cuáles son las
7 reglas, dos servicios en vez de uno, y los criterios de entrega salieron de la consigna
de la cátedra.

#### Postura

La IA se usó como un par que escribe rápido y propone; **la verificación fue siempre por
evidencia ejecutable** (builds, `curl` contra la app real), nunca "quedó lindo, va".

---

## TP2 — Contenedores

Todo lo de abajo se decidió durante la contenerización. La justificación de **por qué
esta app** y de por qué es del tamaño que es está más arriba, en "La aplicación —
ReservaPadel": se eligió antes del TP2 y no cambió.

### ¿Por qué dos Dockerfiles y no uno solo?

Porque son dos unidades de despliegue distintas, que escalan y fallan por separado.
Meter los dos en una imagen obligaría a redeployar el backend cada vez que cambia un
color del frontend, y a que la imagen cargue con las dependencias de los dos. El
compose los une en tiempo de ejecución; el build los mantiene separados.

Cada uno tiene su propio `.dockerignore` **en su carpeta**, no uno en la raíz: Docker
lo busca en el directorio que se le pasa como contexto (`./backend`, `./frontend`).
Un `.dockerignore` en la raíz del repo no lo lee nadie.

### ¿Por qué `node:20-alpine` como base?

- **Alpine** porque la imagen base pesa ~194 MB contra ~1.1 GB de `node:20` a secas.
  Menos superficie instalada es también menos superficie de ataque.
- **Node 20** porque es LTS y es la versión con la que se desarrolló. Está **fijada**:
  nada de `node:latest`, que convierte cada build en una lotería.
- El costo de alpine es real y lo pagamos: usa musl en vez de glibc, y eso rompió
  Prisma (ver "Problemas encontrados", más abajo).

Para Postgres, `postgres:15-alpine`, fijada por la misma razón.

### Multi-stage: qué queda afuera de la imagen final

La idea es que **lo que hace falta para compilar no hace falta para ejecutar**.

| | Backend | Frontend |
| --- | --- | --- |
| Etapa 1 | `deps`: `npm ci --omit=dev` + `prisma generate` | `deps`: `npm ci` (todas) |
| Etapa 2 | `build`: devDependencies + `tsc` → `dist/` | `build`: `next build` con `output: "standalone"` |
| Etapa 3 | `runner`: Node + deps de prod + `dist/` | `runner`: Node + `server.js` + estáticos |

La prueba de que sirvió es que en la imagen final **no existe `/app/src`**: no viaja
el código fuente ni el compilador. Los números están en `evidencias.md`; el frontend
se achica más (‑73%) que el backend (‑36%) porque `output: "standalone"` traza qué
módulos usa realmente y descarta el resto de `node_modules`.

El orden de las capas no es casual: primero se copian `package.json` y el lockfile y
recién después el código. Así la capa de dependencias solo se rehace cuando cambian
las dependencias, y no en cada edición de un `.ts`.

### ¿Por qué `npm ci` y no `npm install`?

`ci` instala exactamente lo que dice el lockfile y falla si `package.json` y el lock
no coinciden. `install` puede resolver versiones nuevas y hacer que dos builds del
mismo commit produzcan imágenes distintas. En una imagen que se publica, eso es
inaceptable.

### Usuario no-root y healthcheck

Los dos contenedores corren como el usuario `node` (uid 1000) que ya trae la imagen.
Un proceso que no necesita root no debe correr como root: si alguien logra escapar de
la app, no cae en un root del contenedor.

Los dos declaran `HEALTHCHECK` con `node -e "fetch(...)"` en vez de `curl`, porque
alpine no trae curl y no vale la pena instalarlo. El healthcheck no es decorativo: es
lo que habilita el `condition: service_healthy` del compose.

### Migraciones en el entrypoint: el trade-off

El entrypoint del backend corre `prisma migrate deploy`, después un seed idempotente,
y recién ahí `exec node dist/index.js`.

- **A favor:** en una máquina limpia, `docker compose up -d` deja la base lista sin
  comandos extra. Es literalmente el criterio de aceptación del TP.
- **En contra:** con varias réplicas del backend, todas intentarían migrar a la vez.
  Y una migración que falla deja el contenedor en crash-loop en vez de dejar la app
  vieja andando.
- **Postura:** para una entrega de una sola réplica es el trade-off correcto. En
  producción real esto es un job separado que corre antes del deploy, y así se hace
  en el TP6.

El `exec` del final no es cosmético: reemplaza al shell por Node, así la app queda
como PID 1 y recibe el `SIGTERM` de `docker stop`. Sin `exec`, el shell se come la
señal y el contenedor tarda 10 segundos en morir a la fuerza.

### Qué persiste y qué no

**Persiste solo la base**, en el volumen nombrado `db_data`. Todo lo demás —los
contenedores, el `dist/`, el `.next/`— es descartable y se reconstruye.

Es un **volumen nombrado** y no un bind mount a propósito: en Mac y Windows hay una
VM en el medio, y montar el directorio de datos de PostgreSQL desde el disco del host
es notablemente más lento y da problemas de permisos.

La consecuencia práctica: `docker compose down` conserva los datos y `down -v` los
borra. La prueba está en `evidencias.md`.

### ¿Por qué la base NO publica el puerto 5432?

Porque nadie fuera de la red del compose necesita hablarle: el único cliente es el
backend, que la alcanza por el nombre de servicio `db`. Publicarla la expone a toda
la máquina sin ninguna necesidad.

Y hay una razón práctica que descubrimos a los golpes: esta máquina tiene un
**PostgreSQL nativo** escuchando en `127.0.0.1:5432`. Mientras el compose publicaba
ese mismo puerto, todo lo que la app escribía por `localhost:5432` iba a la base
nativa y no a la del contenedor — con lo cual una prueba de persistencia daba
"positiva" sin probar nada. Al dejar de publicar el puerto, la ambigüedad desapareció:
la app solo puede hablar con la base del compose. Para inspeccionarla:
`docker compose exec db psql -U padel -d padel`.

### `depends_on` con `condition: service_healthy`

`depends_on` a secas solo ordena el arranque: dice "arrancá la base primero", no
"esperá a que la base esté lista". Postgres tarda varios segundos entre que el
contenedor arranca y que acepta conexiones, y en esa ventana `migrate deploy` falla.

Por eso la base declara un healthcheck con `pg_isready -U padel -d padel` y el
backend espera `service_healthy`. El frontend hace lo mismo con el backend, que a su
vez tiene su healthcheck contra `/api/health`. El arranque lo muestra en orden:
`db Healthy → backend Starting → backend Healthy → frontend Starting`.

### Configuración: `${VAR:?mensaje}` en vez de `${VAR}`

Compose, ante una variable que no existe, **no falla**: la reemplaza por vacío y
sigue. El resultado es una base que se niega a arrancar con un error que no menciona
la variable, o peor, una app levantada sin secreto. La sintaxis `${VAR:?mensaje}`
corta el `up` nombrando la variable que falta. Está probado: el primer
`docker compose config` cortó con *"required variable JWT_SECRET is missing a value"*.

`.env` está en `.gitignore` y se commitea `.env.example` con los nombres y valores de
ejemplo. `docker-compose.registry.yml` también necesita ese `.env`: si se le pasa a
alguien "para levantar sin el código", van dos archivos, no uno.

### ¿Por qué el frontend no lleva nginx?

Porque no es una SPA. Una SPA compila a HTML/JS/CSS estáticos y necesita un servidor
web que los sirva y que proxee `/api` al backend — ese es el rol del `nginx.conf`.
Nuestro frontend es **SSR**: renderiza en el servidor en cada pedido, así que la
imagen final necesita un runtime de Node y ya tiene un server propio. Poner nginx
adelante sería un salto de red extra sin ninguna función.

El rol que en una SPA cumple el `proxy_pass` de nginx, acá lo cumple el reenvío de
`/api/*` del propio server de Next.

### ¿Por qué el proxy de `/api/*` está en un middleware y no en `next.config.ts`?

Esta decisión **cambió durante el TP2** y vale la pena poder contarla.

Originalmente el reenvío era un `rewrites()` en `next.config.ts`, que es lo que
recomienda la documentación. Al inspeccionar la imagen construida apareció el
problema: Next **resuelve los rewrites en tiempo de build**. El destino queda escrito
en `.next/routes-manifest.json` y el `next.config.js` ni siquiera viaja en la imagen
con `output: "standalone"`. Verificado a mano:

```json
"destination": "http://localhost:8080/api/:path*"
```

Es decir: la imagen quedaba atada al backend que estuviera configurado el día que se
compiló, y `BACKEND_URL` en runtime no hacía nada. Eso rompe el principio que sostiene
todo el TP —una misma imagen, distinta configuración según dónde corra— y habría
hecho fallar el login dentro del compose, porque `localhost` adentro del contenedor
del frontend es el frontend mismo.

La solución fue mover el reenvío a `src/middleware.ts`, que corre en **cada pedido** y
lee `process.env.BACKEND_URL` cuando el contenedor ya está andando. Se validó con un
experimento antes de adoptarla: se levantó un contenedor cualquiera llamado `backend`
y se pidió `/api/health` a través del front, que respondió con el header
`x-middleware-rewrite: http://backend/api/health`. Sigue sin haber lógica de negocio
en el frontend: el middleware solo reenvía.

Las llamadas server→server (`lib/api.ts`, para las páginas SSR) nunca tuvieron este
problema: leen la variable al arrancar el proceso.

### Registry: ghcr.io, tag `v0.1.0`, público

Se eligió **ghcr.io** porque la cuenta ya existe —es la de GitHub del TP1—, las
imágenes quedan junto al código, y en el TP7 el pipeline se va a poder autenticar con
el `GITHUB_TOKEN` del propio workflow, sin secretos.

Las dos imágenes llevan `LABEL org.opencontainers.image.source` apuntando al repo,
que es lo que linkea el package con el código.

El tag es **`v0.1.0`**, semver, no `latest`. `latest` es un nombre que apunta a cosas
distintas según el día: sirve para probar, no para declarar qué está corriendo.

**Arquitectura:** las imágenes se construyeron en una Mac con Apple Silicon, así que
son `linux/arm64`. Una máquina Intel/AMD —por ejemplo los runners de GitHub Actions—
va a recibir `no matching manifest for linux/amd64`. Es una limitación conocida y
asumida para este TP; se resuelve en el TP7 con `docker buildx` construyendo para las
dos arquitecturas a la vez.

### Problemas encontrados

**1. Prisma no arrancaba en alpine: `failed to detect the libssl/openssl version`.**
El contenedor del backend construía bien y moría en el arranque. Prisma trae motores
nativos y elige cuál usar mirando la versión de OpenSSL del sistema; `node:20-alpine`
no trae `openssl` instalado, así que Prisma caía al motor de openssl-1.1.x y en
runtime intentaba descargar el correcto. Se resolvió con `apk add --no-cache openssl`,
y **antes del `npm ci`**, que es cuando se descargan los motores. El `schema.prisma`
ya declaraba los `binaryTargets` de musl, pero eso no alcanza si el sistema no puede
reportar su versión de OpenSSL.

**2. `Can't write to /app/node_modules/@prisma/engines`.** Consecuencia del anterior
combinada con `USER node`: los archivos copiados quedaban de root y el CLI de Prisma
no podía escribir. Se resolvió con `COPY --chown=node:node` en vez de un `chown -R`
posterior, que habría duplicado todo `node_modules` en una capa nueva.

**3. El CLI de Prisma no estaba en la imagen final.** El entrypoint corre
`prisma migrate deploy`, pero `prisma` era una `devDependency` y `npm ci --omit=dev`
la dejaba afuera. Se movió a `dependencies`. Detalle que apareció al verificar: el
`package-lock.json` no cambió, porque `@prisma/client` ya declara `prisma` como peer
opcional y npm lo tenía resuelto como no-dev. O sea que funcionaba por accidente;
ahora está declarado a propósito.

**4. El rewrite horneado en el build.** Descrito arriba, en la sección del middleware.
Es el problema más serio que apareció, porque la app **funcionaba** en desarrollo y
habría fallado recién dentro del compose.

**5. `error from registry: unknown` al publicar en ghcr.** El push subía todas las
capas (`Pushed`) y fallaba al final, al subir el índice. No era el token ni los
permisos: buildx adjunta un *attestation manifest* (provenance) que ghcr rechaza. Se
resolvió construyendo y publicando con
`docker buildx build --provenance=false --sbom=false --push`.

**6. La base nativa que se comía las conexiones.** Descrito arriba, en la sección del
puerto 5432. Lo importante del caso: una prueba puede dar el resultado esperado por el
motivo equivocado, y eso es peor que fallar.

### Uso de IA — TP2

**Qué se hizo con asistencia de IA (Claude Code).** La redacción de los Dockerfiles,
el `docker-entrypoint.sh`, los dos `.dockerignore`, los dos compose y esta sección de
`decisiones.md`, además de la ejecución de los builds y las pruebas desde la terminal.

**Cómo se verificó.** Ninguna de las afirmaciones de este documento se aceptó por
buena: cada una se comprobó contra la máquina. Los tamaños salen de `docker images`;
que el fuente no viaje en la imagen final se verificó con `docker exec ... ls /app`;
que el usuario no sea root, con `whoami` adentro del contenedor; la persistencia, con
el ciclo `down` / `up` / `down -v` completo; que las imágenes sean públicas, pidiendo
el manifest a ghcr **sin credenciales** en vez de confiar en lo que dice la pantalla
de GitHub; y que el compose del registry no construya nada, borrando antes las
imágenes locales, el cache de build y las credenciales.

**Hallazgos de la IA que hubo que corregir.** Dos de los problemas de la lista de
arriba —el rewrite horneado en el build y la base nativa que se comía las conexiones—
aparecieron justamente porque una verificación contradijo lo que se había afirmado
antes. En el segundo caso, una prueba de persistencia que se había reportado como
exitosa no probaba nada, y hubo que rehacerla. Sirve como recordatorio de que el
trabajo asistido por IA se defiende con evidencia reproducible, no con la confianza en
lo que la herramienta dice que hizo.

---

## TP3 — Planificación ágil con GitHub Projects

### Sprint de 2 semanas

Es el default de la industria y es el que mejor se defiende acá. Dos semanas alcanzan
para terminar algo entregable de punta a punta —una historia con su PR mergeado— y son
lo bastante poco como para corregir el rumbo antes de que un error se vuelva caro.
Además coincide con el ritmo real de la materia: los TP caen cada una o dos semanas,
así que el sprint y la entrega quedan alineados en vez de cruzarse.

Un sprint de una semana daría feedback más rápido, pero la ceremonia —planificar,
revisar -- pesa demasiado en proporción y cualquier imprevisto se come el sprint
entero. Uno de tres semanas aleja tanto el feedback que cuesta justificar por qué
habría que esperar tanto para revisar el rumbo.

### Límite de trabajo en progreso: 2

La regla de arranque es **cantidad de personas más uno**. El proyecto lo lleva una
sola persona, así que el número es **2**. El "más uno" no es holgura arbitraria: es la
válvula para cuando algo queda esperando —una revisión, un CI que tarda— y hace falta
avanzar en otra cosa sin quedarse de brazos cruzados. Más allá de ahí, el límite deja
de limitar: con tres cosas en curso y una sola persona, ninguna avanza, solo se
acumulan a medio hacer.

No es 1 porque el flujo tiene bloqueos legítimos que no dependen de mí: un PR esperando
que termine el CI, una imagen construyéndose. Con límite 1 quedaría formalmente
impedido de empezar nada mientras espero.

La señal para ajustarlo es simple: **si nunca lo alcanzo, está demasiado alto**. Si
durante el TP4 la columna nunca llega a 2, hay que bajarlo a 1.

Lo importante del límite es entender qué hace y qué no: GitHub **no impide** pasarse,
solo pone el contador de la columna en rojo. Es una señal, no una barrera. El valor
está en que el desvío se ve, y quien lo supera tiene que decidir conscientemente si
está bien.

### Diagnóstico: la historia mal escrita

> *"Como desarrollador quiero crear la tabla usuarios para guardar los datos."*

**Por qué está mal escrita.** Tiene la forma de historia pero es una **tarea técnica**
disfrazada: describe un paso de implementación, no valor para nadie. El "como
desarrollador" es la pista — el desarrollador no es el usuario del producto, es quien
lo construye. Y como no expresa ningún comportamiento observable, **no se puede
verificar**: no hay forma de escribir un criterio de aceptación que diga qué tiene que
poder hacer alguien cuando esté lista. Tampoco entrega valor por sí sola: una tabla
vacía no le sirve a nadie hasta que algo la use.

**Cómo la reescribiría.** Subiendo un nivel, hasta el comportamiento que la tabla
habilita, y colgando de ahí la tabla como tarea:

> *"Como jugador quiero registrarme con mi email y contraseña para poder reservar una
> cancha a mi nombre."*
>
> Criterios de aceptación:
> - [ ] Con email válido y contraseña de 8+ caracteres, la cuenta se crea y quedo logueado
> - [ ] Un email ya registrado devuelve un error legible y no crea una cuenta duplicada
> - [ ] La contraseña se guarda hasheada, nunca en texto plano

Ahí sí hay un usuario real, un valor concreto y tres afirmaciones que se pueden
comprobar. "Crear la tabla usuarios" pasa a ser una de sus tareas.

### Por qué el bug va al costado y no colgando de una historia

La jerarquía cuenta **lo que se planificó construir**: la épica es el objetivo, las
historias el valor a entregar, las tareas los pasos. Un bug es un defecto de algo **ya
entregado**, así que no formaba parte de ese plan y no pertenece al árbol. Colgarlo de
la historia que lo originó tendría además un efecto feo: esa historia ya está cerrada
y su barra de progreso pasaría a mentir.

El criterio que ordena esto es *cuándo* aparece el defecto. Si aparece mientras la
historia está en curso, no es un bug: es que la historia todavía no cumple sus
criterios de aceptación, y se arregla dentro de la historia sin crear nada. Si aparece
sobre algo ya entregado, ahí sí es un bug con issue propio. El bug de esta entrega
—`/reservas` se queda con el listado vacío si el backend todavía no responde— es del
segundo caso: se observó sobre la app del TP2, ya entregada.

Vale aclarar que "al costado" es una **convención de trabajo, no una regla de la
herramienta**: hay equipos que registran los defectos del sprint colgando de su
historia para medir cuántos se les escapan, y en Azure Boards un Bug puede ser hijo de
una Feature. Lo que importa es saber cuál se usa y por qué.

### Sub-issues y no task-lists

Los dos caminos existen, pero solo uno arma **jerarquía navegable**. Una task-list en
el cuerpo (`- [ ] #9`) marca progreso pero no crea la relación padre-hijo: desde la
tarea no se puede subir a su historia ni de ahí a la épica. Los sub-issues sí, y es lo
que pide el TP. La épica muestra su historia con barra de progreso, y la historia sus
dos tareas.

### El PR cierra la TAREA, no la historia

`Closes #9` referencia la tarea "escribir el workflow de build y tests", que es
exactamente lo que ese PR implementa. Poner el número de la historia habría cerrado la
historia con la mitad del trabajo sin hacer —falta publicar el reporte de tests como
artefacto— y la trazabilidad quedaría mintiendo.

La historia se cierra a mano cuando sus dos tareas estén hechas; el workflow del
tablero mueve la tarjeta a Done al cerrarse el issue, pero **no cierra un padre porque
se hayan cerrado sus hijos**.

Dos detalles que hacen que esto funcione y que es fácil pasar por alto: `Closes #N`
solo cierra si el PR apunta a la rama por defecto (`main`), y tiene que estar en la
**descripción del PR** —no en un comentario posterior—, porque es lo que además deja el
issue enlazado al PR que lo cerró.

### Problemas encontrados

**1. `gh` no estaba instalado, y después le faltaba un permiso.** Se instaló con
`brew install gh`. El primer `gh project list` falló por permisos: el token de
`gh auth login` no trae el scope `project`, que es el que habilita todo lo de Projects.
Se resolvió autenticando con `gh auth login -s project`. El síntoma engaña porque el
login dice "Logged in" igual: el problema no es la autenticación sino el alcance del
token.

**2. Los dos `+` de la vista de tabla.** Para crear el campo Sprint hay que usar el `+`
que está al final de la fila de **encabezados de columna**, a la derecha del todo. El
`+` de abajo de las filas agrega **items** y ofrece "New issue / New draft", que es
otra cosa. Se pierde bastante tiempo antes de darse cuenta de que son dos botones
distintos. El camino sin ambigüedad es `⋯` → **Settings**, donde está la lista de
campos con su botón de crear.

**3. `gh` no sabe crear campos de tipo Iteration.** `gh project field-create` solo
acepta `TEXT`, `SINGLE_SELECT`, `NUMBER` y `DATE`, así que el campo Sprint parecía ser
obligatoriamente manual. No lo es: la **API GraphQL sí lo permite**, con
`createProjectV2Field` y `dataType: ITERATION`. El detalle que hace fallar el primer
intento es que `iterationConfiguration` exige el arreglo `iterations` con las
iteraciones explícitas —no alcanza con `startDate` y `duration`—, y el error lo dice
recién al ejecutarlo. Lo mismo con la vista de tablero: `createProjectV2View` con
`layout: BOARD_LAYOUT`.

**4. El límite de trabajo en progreso no tiene API.** Se buscó una mutación que lo
configurara y no existe: `updateProjectV2View` solo maneja nombre, layout, filtro y
configuración de campos. Es lo único del TP que hay que hacer sí o sí por la web
(`⋯` de la columna *In Progress* → *Set limit*). Vale saberlo porque marca el límite
de lo automatizable: si en el TP4 hiciera falta reconstruir el tablero por script, ese
paso quedaría manual.

**5. El tablero no se llena solo si el proyecto se crea por comando.** Acá no pasó
porque el proyecto se creó desde la web con la casilla *Import items from repository*
tildada, que es la que deja configurado el workflow *Auto-add to project*. Se verificó
que funcionó: los 5 issues aparecieron en el tablero sin agregarlos a mano. Con
`gh project create` ese workflow no queda armado —no hay repositorio elegido— y el
tablero nace vacío.

### Uso de IA — TP3

**Qué se hizo con asistencia de IA (Claude Code).** La creación de labels, épica,
historia, tareas y bug por `gh`, el armado de la jerarquía con `--add-sub-issue`, el
esqueleto del workflow de CI con su PR, y la redacción de esta sección.

**Qué es mío y hay que poder defender.** Las dos decisiones que el TP pide justificar
—duración del sprint y límite de WIP— y el diagnóstico de la historia mal escrita.
Ninguna de las tres sale de la guía: son criterio propio.

**Cómo se verificó.** La jerarquía se comprobó consultando `subIssuesSummary` por API
(la épica reporta 1 sub-issue y la historia 2), no mirando la pantalla; la visibilidad
pública del proyecto, leyendo el campo `public` del propio Project; el enlace del PR
con su issue, con `closingIssuesReferences`, que confirma que el PR apunta a `main` y
cierra el issue #9 y no otro; y la automatización del tablero, comprobando que la
tarjeta de #9 pasó a `Done` **sola** al mergearse el PR, sin que nadie la moviera.

---

## TP4 — Integración continua con GitHub Actions

### Estructura del pipeline: dos jobs, en paralelo

El pipeline tiene exactamente dos unidades de trabajo, `build-backend` y
`build-frontend`, y no una sola ni tres. El criterio es simple: **un job por artefacto
desplegable**. El sistema publica dos imágenes, así que hay dos jobs. Si mañana el
backend deja de construirse, quiero saberlo sin que el frontend me contamine el
diagnóstico.

Corren **en paralelo** porque no dependen uno del otro. Cada uno construye su propia
imagen a partir de su propio Dockerfile, y ninguno consume nada que produzca el otro:
no hay razón para que el frontend espere al backend. En GitHub Actions ese paralelismo
es el comportamiento por defecto —los jobs de un mismo workflow arrancan a la vez salvo
que se declare `needs:`— así que la decisión de diseño no fue paralelizarlos, fue **no
encadenarlos**. Cada uno corre en su propia máquina virtual, limpia y separada.

Lo que se gana es tiempo y, sobre todo, información: cuando el PR de la demostración
rompió el backend, `build-frontend` terminó en verde en 22 segundos. Ese verde no es
decorativo — dice que la rotura está acotada al backend, y eso lo sabés antes de abrir
un solo log.

Los dos jobs se disparan con dos eventos distintos, y cada uno tiene su motivo:

- `pull_request` hacia `main` es **el que hace el trabajo**: verifica el código *antes*
  de que entre. Es lo que después se convierte en el gate.
- `push` a `main` corre *después* de cada merge y parece redundante, pero hace dos
  cosas que el otro no puede: le da al badge una corrida de la cual leer el estado, y
  deja el cache guardado en la rama por defecto, que es la única que todos los PRs
  nuevos pueden leer.

### Por qué el pipeline construye con el Dockerfile y no compila por su cuenta

Es la decisión de fondo del práctico. El pipeline **no sabe** cómo se compila esta
aplicación: no tiene una sola línea de Node, ni de `npm`, ni de `tsc`. Le pasa una
carpeta a `docker/build-push-action` y el que sabe qué hacer con ella es el Dockerfile
del TP2.

La alternativa —que el workflow corriera `npm ci && npm run build` por su cuenta—
tendría un defecto que no se ve el primer día y se paga después: habría **dos
definiciones del build**. La del workflow y la del Dockerfile. Mientras coincidan no
pasa nada; el problema es que van a divergir, porque nadie las mantiene juntas. Y el
día que divergen, el pipeline está verificando una compilación que **no es la que se
despliega**. El verde deja de significar lo que creés que significa.

Construyendo con el Dockerfile, lo que el CI verifica y lo que corre en producción son
literalmente el mismo procedimiento. Se ve en el log del runner, donde aparecen las
tres etapas del multi-stage tal como se escribieron en el TP2:

    [deps 5/7]   RUN npm ci --omit=dev
    [build 5/9]  RUN npm ci
    [build 9/9]  RUN npx prisma generate && npx tsc
    [runner 4/9] COPY --from=deps --chown=node:node /app/node_modules ./node_modules

Hay un segundo beneficio, menos obvio: este mismo `ci.yml` le sirve a cualquier
compañero con cualquier stack. Lo específico del proyecto está adentro del Dockerfile,
que es donde corresponde.

La contrapartida honesta: el pipeline hereda todo lo que el Dockerfile **no** hace. Si
el Dockerfile no corre lint, el CI no corre lint. Hoy verifica que la aplicación
compile y que la imagen se arme; nada más. Desde el TP5, cuando el Dockerfile tenga su
etapa de tests, el mismo pipeline va a fallar también por un test en rojo sin que haya
que tocar el workflow. Ése es exactamente el punto de haberlo construido así.

`push: false` en los dos jobs: hoy se verifica que la imagen se construya, no se
publica en ningún registry. La imagen vive y muere adentro del runner. Publicar
requeriría credenciales y es un problema de otro práctico.

### Qué cachea el pipeline, y qué se reutiliza de verdad

Docker construye la imagen en capas, y una capa se puede reutilizar si nada de lo que
depende cambió. El problema en CI es que cada corrida cae en una máquina nueva y vacía:
sin ayuda, no hay ninguna capa que reutilizar, nunca. Eso es lo que resuelven
`cache-from` / `cache-to` con `type=gha`, que guardan las capas en el almacén de GitHub
Actions — **no** en el Docker del runner, que se destruye al terminar, ni en el de mi
máquina.

`mode=max` guarda también las capas intermedias, no solo las de la imagen final. Con el
default (`min`) las etapas `deps` y `build` del multi-stage no se guardarían, y son
justamente las caras: las que corren `npm ci`.

**Qué se reutiliza y qué no, medido en este repositorio.** Se compararon tres corridas
según qué había cambiado:

| Qué cambió en el commit | Capas `CACHED` en `build-backend` |
|---|---|
| Nada (commit vacío) | **18** |
| Solo el `README.md` | **18** |
| `backend/src/index.ts` | **11** |

El tercer caso es el interesante, porque muestra el corte exacto. Se reutilizaron:

- `apk add --no-cache openssl`, `COPY package.json package-lock.json`,
  **`RUN npm ci`** y `RUN npm ci --omit=dev`, `COPY prisma`, `RUN npx prisma generate`
  de la etapa `deps`, y la copia de `node_modules` al runner.

Se reconstruyeron, de ahí para abajo:

- `COPY src ./src` (lo que efectivamente cambió), `RUN npx prisma generate && npx tsc`,
  y **todas** las capas posteriores del runner: la copia del `dist/`, la del
  `package.json`, la del `prisma/`, la del entrypoint y su `chmod`.

Esto último es lo que conviene entender bien: una capa invalidada **arrastra a todas
las que vienen después en su etapa**, aunque esas no tengan nada que ver con el cambio.
El `chmod` del entrypoint se rehízo porque el `dist/` cambió tres capas más arriba.

Y de acá sale el mérito real, que no es del cache sino del **orden del Dockerfile**: si
el `COPY src` estuviera antes del `npm ci`, cualquier cambio de una línea de código
invalidaría la instalación de dependencias y no se reutilizaría prácticamente nada. El
Dockerfile del TP2 copia primero los archivos de dependencias y después el código, y
por eso `npm ci` sobrevive a un cambio de código.

Números de tiempo del PR de esta entrega, primera corrida contra segunda:

| Job | Sin cache | Con cache |
|---|---|---|
| `build-backend` | 106 s | **19 s** |
| `build-frontend` | 145 s | **14 s** |

⚠️ Conviene decir que esta ganancia es más grande de lo típico y no hay que
generalizarla: la segunda corrida fue un commit vacío, el mejor caso posible. Guardar
el cache también cuesta —al terminar, la corrida sube las capas al almacén—, así que en
un proyecto chico con cambios de código reales la diferencia es mucho menor. La
evidencia que importa es la palabra `CACHED` en el log, no el cronómetro.

### Qué pasa si el cache desaparece

Desaparece, y no es una hipótesis: GitHub lo desaloja cuando quiere, tiene límite de
tamaño y se vacía por falta de uso. El pipeline tiene que funcionar **exactamente
igual sin él, solo que más lento**. Si fallara sin cache, no sería un cache: sería una
**dependencia escondida**, y eso es un bug.

La propiedad se cumple por construcción: `cache-from` es una optimización de
`docker build`, no una fuente de la que el build saque nada que no pueda regenerar. Si
el almacén está vacío, BuildKit no encuentra capas, construye todo de cero y produce la
misma imagen. Esto ya se observó en este repositorio: la primera corrida del PR #15
tuvo **0 capas `CACHED`** y terminó en verde igual, en 106 y 145 segundos.

Hay una segunda cara del mismo tema, el **alcance**. Una corrida puede leer el cache de
su propia rama y el de la rama base, pero no el de ramas hermanas. Cuando se armó este
pipeline, `main` todavía no había guardado nada, así que la única manera de ver
`CACHED` era que las dos corridas fueran del mismo PR. Después del merge, la corrida
del `push` a `main` dejó el cache ahí, y desde entonces cualquier PR nuevo lo aprovecha
ya en su primera corrida: el PR del badge construyó el backend en 19 segundos sin haber
corrido nunca antes.

### El `scope` del cache no es opcional cuando hay dos jobs

Los dos jobs guardan en el mismo almacén. Sin `scope`, los dos usan el mismo por
defecto y **se pisan**: el último en terminar sobrescribe el cache del otro. El síntoma
es desconcertante porque parece azar — un job muestra `CACHED` y el otro no, y cuál
cambia de una corrida a la otra según quién terminó último. No hay error, no hay
advertencia: simplemente el cache rinde la mitad.

Por eso cada job declara el suyo: `scope=backend` y `scope=frontend`. Son dos estantes
separados en el mismo almacén.

### Por qué hace falta `setup-buildx-action`

Las capas las exporta el **constructor**, y el que viene de fábrica en el runner no
sabe hacerlo: guarda las capas en el disco de la máquina, que se destruye al terminar.
`docker/setup-buildx-action` instala otro constructor, que corre en su propio contenedor
y sí sabe mandar las capas al almacén de GitHub y traerlas de vuelta. Ese paso no
construye nada; deja el constructor listo para el paso que sigue.

Olvidarlo no pasa desapercibido: el build **falla**, con
`Cache export is not supported for the docker driver`. Es de los pocos errores que
dicen exactamente qué falta.

### La rama en un Pull Request: por qué `github.head_ref`

El primer paso de cada job imprime qué se está verificando, y la rama sale de
`github.head_ref` y no de `GITHUB_REF_NAME`. El motivo es que en un PR **no se
construye tu rama**: GitHub arma un commit sintético que mezcla tu rama con `main`, y
`GITHUB_REF_NAME` vale `<número>/merge`. Un log que dice `Rama 16/merge` no le sirve a
nadie. Con `github.head_ref` dice `Rama feature/demo-gate`, que es lo que se quiere
leer. El `|| github.ref_name` de atrás cubre el otro evento: en el `push` a `main`,
`head_ref` está vacío.

Ese detalle tiene una consecuencia más grande que el nombre en el log, y es la que
justifica el `strict` del gate: **lo que el CI verifica en un PR es la mezcla, no tu
rama sola**.

### Las versiones de las actions van fijadas

`actions/checkout@v6`, `docker/build-push-action@v7`, `docker/setup-buildx-action@v4`.
Se fija la versión mayor a propósito: apuntar a `@main` significaría que el pipeline
cambia solo el día que sus autores publiquen algo, sin que nadie de este repositorio
haya tocado nada. Un pipeline que se modifica solo no es reproducible.

Fijar la mayor (y no el SHA exacto) es un punto intermedio deliberado: se aceptan
correcciones compatibles, se rechazan los cambios de contrato. Para un repositorio con
requisitos de seguridad más estrictos, lo correcto sería anclar el commit SHA.

### El pipeline como gate: qué se exige y qué no

`build-backend` y `build-frontend` son *required status checks* de `main`, y se suman
al Pull Request obligatorio y al `enforce_admins` que ya venían del TP1.

Tres decisiones dentro de eso:

**El nombre del check es el `id` del job.** No el `name:` del workflow ni el de los
pasos. Por eso los jobs se llaman `build-backend` y `build-frontend`: es literal lo que
se escribe en la protección de la rama. Si un job se renombrara después, el gate
quedaría esperando un check que ya no existe y **bloquearía todos los PRs para
siempre**, sin un mensaje que explique por qué.

**`strict: true`** (*Require branches to be up to date*) exige además que la rama esté
actualizada con `main` antes de mergear. Esto ataja el caso clásico que ningún check
individual detecta: dos PRs que pasan cada uno por separado y rompen `main` al
juntarse. El costo es real —hay que apretar *Update branch* y esperar otra corrida— y
se paga porque un verde sacado contra un `main` que ya no existe no prueba nada.

**Los approvals quedan en 0**, igual que en el TP1. No es una concesión: el trabajo es
individual y GitHub nunca deja aprobar el propio Pull Request, así que exigir una
aprobación haría el repositorio imposible de mergear. Lo que bloquea el merge en este
práctico no es una firma humana, es el pipeline en verde.

Que el gate funciona de verdad se comprobó intentando saltearlo: con un check en rojo,
`gh pr merge` falló con *the base branch policy prohibits the merge*. Y `--admin`
tampoco habría servido, porque `enforce_admins` está activo — el gate aplica también al
dueño del repositorio. Si esa casilla estuviera destildada, cualquiera con permisos de
administrador podría saltearse su propio pipeline, que es tanto como no tenerlo.

### El badge: son dos direcciones, no una

`[![CI](…/ci.yml/badge.svg)](…/actions/workflows/ci.yml)`. La de adentro es la imagen;
la de afuera es adónde lleva el clic. Escribiendo solo la imagen el badge se ve
idéntico, pero al clickearlo se abre el SVG suelto — una página en blanco. Es un error
que no se detecta mirando el README, así que se verificaron las dos URLs por separado
antes de commitear.

El badge lee el estado de la **última corrida de `main`**, que existe gracias al
disparador `push`. Y su dirección depende del **nombre del archivo** (`ci.yml`), no del
`name: CI` de adentro: renombrar el archivo rompe el badge.

Se escribe una vez y no se toca más: la imagen se actualiza sola con cada corrida.
Automatizar la escritura de esa línea sería peor que hacerla a mano.

### Problemas encontrados

**1. El `ci.yml` del TP3 había que reemplazarlo entero, no ampliarlo.** El esqueleto
tenía un job llamado `build` que solo hacía checkout. Como el nombre del check sale del
`id` del job, conservarlo habría dejado el gate cableado a un check que no verifica
nada. Los dos jobs nuevos se llaman distinto y el viejo desapareció; el orden importa,
porque el buscador de la protección de rama solo ofrece checks que corrieron en los
últimos 7 días — hay que correr el workflow *antes* de configurar el gate.

**2. El cache no aparece si las dos corridas se solapan.** El cache se sube al
**terminar** el job. Si se pushean dos commits seguidos, la segunda corrida empieza a
construir cuando la primera todavía no subió nada, y no muestra `CACHED` — sin que haya
nada mal configurado. La solución no es tocar el YAML: es esperar a que la primera
corrida termine y recién entonces disparar la segunda, con
`git commit --allow-empty`. Se hizo así deliberadamente.

**3. `docker build` local no se pudo correr para verificar la rotura.** El paso previo
a pushear el build roto es comprobar que también falla en la máquina propia; Docker
Desktop estaba apagado y el comando murió con
`Cannot connect to the Docker daemon`. Se verificó con `npx tsc`, que es exactamente el
comando que ejecuta el Dockerfile en su línea 47, y dio el mismo error
(`TS2307: Cannot find module './no-existe'`) que después dio el runner. Sirve como
sustituto porque no es una prueba parecida: es la misma instrucción.

**4. Después de *Update branch*, el merge sigue bloqueado y parece un error.** El
mensaje es `2 of 2 required status checks are in progress`. No hay nada roto: *Update
branch* crea un **commit nuevo** —la mezcla de la rama con `main`—, y los checks se
atan a un commit, no a una rama. El verde anterior era de un commit que ya no es la
punta, y sobre el commit nuevo el pipeline no había corrido nunca. Hay que esperar los
20 segundos que tarda.

**5. La ganancia del cache fue mucho mayor que la esperada, y casi induce a una
conclusión falsa.** La bibliografía de la cátedra advierte que en un proyecto chico el
cache puede incluso no ahorrar tiempo. Acá ahorró un 80 % (106 s → 19 s). La
explicación no es que el cache sea mejor de lo que dicen: es que la segunda corrida fue
un commit vacío —el mejor caso posible— y que el Dockerfile del TP2 tiene las capas
bien ordenadas. Con un cambio de código real la reutilización bajó de 18 capas a 11.
Anotarlo evita defender en el oral un número que no se sostiene.

**6. `actions/checkout@v6` no es la última versión.** Al verificar antes de pushear que
las tres actions existieran, apareció que `checkout` ya va por `v7`. Se dejó `v6`
igual: fijar la versión sirve justamente para que el pipeline no se mueva solo, y
actualizarla es una decisión que se toma leyendo el changelog, no por reflejo.

### Uso de IA — TP4

**Qué se hizo con asistencia de IA (Claude Code).** La redacción del `ci.yml`
completo, los mensajes de los commits y de los Pull Requests, la ejecución de los
comandos de git y `gh` desde la terminal, la medición de las corridas y esta sección de
`decisiones.md`.

**Qué se hizo a mano y sin asistencia.** La configuración del gate en la protección de
`main` y el límite de trabajo en progreso del tablero — ambos por la web, en el caso
del gate por decisión propia para conocer la pantalla de cara a la defensa.

**Cómo se verificó.** Nada de lo que afirma esta sección sale de lo que la herramienta
dijo haber hecho:

- Que las tres actions existieran en la versión fijada, consultando la API de GitHub
  por sus tags **antes** de pushear, en vez de descubrirlo con una corrida fallida.
- Que el gate hubiera quedado bien configurado, leyendo
  `branches/main/protection` por API y comprobando los dos `contexts`, el `strict`, los
  approvals en 0 y el `enforce_admins` intacto — no mirando la pantalla de Settings.
- Que el gate **bloqueara de verdad**, intentando mergear el PR roto por línea de
  comandos y recibiendo el rechazo de GitHub.
- Que la rotura fuera real, corriendo `tsc` localmente antes de pushear.
- Las cifras de cache y de tiempo, extraídas de los logs de las corridas contando las
  líneas `CACHED` y calculando la diferencia entre `startedAt` y `completedAt` de cada
  job, no estimadas.
- Que el badge funcionara, pidiendo por separado la URL de la imagen y la del enlace y
  comprobando que las dos devolvieran 200 — el error de dejar solo la imagen no se ve
  en el README.

**Qué es propio y hay que poder defender.** La estructura del pipeline (un job por
artefacto desplegable, sin encadenar), la decisión de construir con el Dockerfile en
vez de compilar en el workflow con su contrapartida, y la lectura de qué capas se
reutilizan y por qué, que es una propiedad del Dockerfile del TP2 y no del pipeline.

---

## TP5 — Calidad automatizada: tests, coverage y el umbral que frena un merge

El TP4 construía las imágenes pero no ejecutaba comportamiento: que compile no dice que ande.
Este TP agrega la suite, la cobertura visible en cada corrida y **un umbral elegido por mí que
frena un merge**.

### Qué lógica elegí testear, y por qué ésa

Donde duele un bug en esta app es **una cancha reservada dos veces en el mismo horario**: no
tira error, no rompe ninguna pantalla y nadie lo ve hasta que dos parejas llegan a la misma
hora. Por eso la suite ataca primero `backend/src/services/reservas.ts`:

| Regla | Qué protege |
| --- | --- |
| 1 · solapamiento | Dos reservas no pisadas en la misma cancha (el bug caro) |
| 2 · horario | 08:00–23:00, entre 60 y 120 minutos (todo bordes: `<` contra `<=`) |
| 3 · no pasado | No se reserva hacia atrás (depende del reloj: hay que inyectarlo) |
| 4 · transiciones | `pendiente→confirmada→cancelada` |
| 5 · ventana de 2 h | Una confirmada no se cancela sobre la hora |
| 6 · autorización | Cada uno ve lo suyo; el admin, todo |
| 7 · registro | Email válido, contraseña de 8+ |

**Criterio para saber si un test vale**: si invierto la regla, algo se pone en rojo. Por eso
los casos están **sobre el borde**: 60 minutos se acepta y 59 no; cancelar a 2 h justas se puede
y a 1 h 59 no; 10–11 y 11–12 **no** se solapan. Un test con 90 minutos pasa igual si alguien
mueve el límite.

**Afuera de la suite, a propósito**: los componentes de React y las pantallas. Verificar UI es
de punta a punta contra la app desplegada (TP7).

| | Métodos de test | Casos ejecutados | Reglas |
| --- | --- | --- | --- |
| Backend | 48 | 76 | 7 |
| Frontend | 39 | 57 | 5 (las que espeja del backend) |

El mínimo se cuenta en métodos: un `it.each` con siete filas es **un** test.

### Mi stack no es el de la cátedra: qué herramienta cubre cada cosa

Es Node/TypeScript de los dos lados (Express + Prisma, Next.js), y uso **vitest en los dos**:
un solo runner, un solo `it.each` y un solo `vi.fn()` para entender y explicar.

| Lo que hay que lograr | Con qué lo hice |
| --- | --- |
| Test parametrizado | `it.each` (el equivalente de `[Theory]`) |
| Que la dependencia entre desde afuera | Un parámetro de la función, tipado con un `type` propio |
| El doble | `vi.fn()` |
| Medir la cobertura | `@vitest/coverage-v8` |
| **Umbral que rompe el build** | `coverage.thresholds` en `vitest.config.ts` |
| **Qué entra en la cuenta** | `coverage.include` / `coverage.exclude` |
| Reporte | `html` (navegable) + `json-summary` (lo lee el pipeline) |

### El refactor para poder mockear

**Si algo es difícil de testear, el problema suele ser el diseño.**

- **Backend — `services/crear-reserva.ts` (nuevo).** El handler de `POST /api/reservas`
  mezclaba parsear, aplicar reglas y hablar con Prisma, que entraba por un `import` estático:
  **era imposible probarlo sin una base**. Ahora el servicio recibe su repositorio por parámetro:

  ```ts
  export async function crearReserva<T>(pedido, usuarioId, repo: RepositorioReservas<T>, ahora: Date)
  ```

  La app le pasa un repositorio con Prisma (`routes/reservas.ts`); el test le pasa tres
  `vi.fn()`. Ninguna regla cambió: sólo **de dónde viene la base**.
- **Frontend — `lib/http.ts` (nuevo).** `apiGet` llamaba a `cookies()` y a `fetch` adentro. Se
  separó cómo se lee la respuesta (200, error con cuerpo, backend caído) de quién la trae:
  `pedirJson(url, cookieHeader, traer = fetch)`. El test le pasa un `fetch` falso.
- **Frontend — `lib/token.ts` (nuevo).** `sesionDeToken(token, ahora)`: el parseo del JWT como
  función pura, con el reloj inyectado.

Después de cada refactor verifiqué con la app levantada que la dependencia **real** quedó
cableada: los tests pasan igual si me olvido, porque le pasan el doble a mano.

### El umbral: 90 % de líneas y 90 % de ramas, en los dos lados

| | Líneas | Ramas |
| --- | --- | --- |
| Backend | **100 %** (213/213) | **98,83 %** (85/86) |
| Frontend | **100 %** (144/144) | **98,48 %** (65/66) |

**Por qué 90**: mido 100 y quiero que me frene cuando **entra una función sin tests**, no cuando
agrego un `if` defensivo. Con 90 sobre 144 líneas del front hacen falta ~17 líneas sin cubrir
para el rojo. Un 95 me frenaría con 8 y me empujaría a escribir tests de relleno. El número salió
**de la medición**: primero escribí la suite, medí, y recién ahí elegí (un 80 copiado del ejemplo
habría dejado entrar 28 líneas sin tests).

**Por qué las dos métricas**: líneas sola es la más generosa (ejecutar una línea no recorre sus
dos caminos). Y ramas sola tampoco alcanza: en el PR #22 (abajo) una función entera sin tests
casi no movió las ramas, porque en vitest 3 una función que nadie llama no suma ramas. **Con el
umbral sólo en ramas, ese PR habría pasado.**

**100 % de ramas es inalcanzable acá**: la rama que falta de cada lado no la recorre ninguna
entrada (ver «camino sin cubrir»). **Para subirlo a 95** no faltan tests: falta **ampliar lo que
se mide** (el candidato es `leerCookie()` de `src/auth.ts`).

### Qué dejé afuera de la cuenta, y por qué

En el backend se **incluye todo `src`** y se excluye a mano: así un archivo nuevo entra solo a
la cuenta y no nace invisible para el umbral.

| Backend, fuera de la cuenta | Por qué |
| --- | --- |
| `src/index.ts`, `src/app.ts` | Arranque y cableado de Express: no deciden nada |
| `src/prisma.ts`, `src/env.ts`, `src/services/tipos.ts` | Infraestructura, configuración y tipos |
| `src/http.ts` | Tabla de `Resultado` → código HTTP, sin comportamiento |
| `src/routes/**` | Pegamento **después del refactor** |
| `src/auth.ts` | bcrypt y JWT: es la librería, no reglas mías |

`src/auth.ts` es el caso discutible: adentro está `leerCookie()`, que sí es comportamiento mío.

Antes de excluir `src/routes/**` saqué de ahí lo que eran **reglas** (`rangoDelDia()`, la lista
de estados aceptados) a los servicios. **Primero se sacan las reglas, después se excluye el
archivo**; al revés, el porcentaje sube sin que nada esté más probado.

**Frontend**: entra `src/lib/**`; quedan afuera `tipos.ts` y `api.ts`/`sesion.ts`, que después
del refactor son tres líneas de pegamento con `next/headers`. Páginas y componentes son UI (TP7).

### Por qué una cobertura alta no garantiza calidad

La cobertura mide **ejecución**, no **verificación**:

```ts
it("valida el horario", () => {
  validarHorario(alas(10), alas(11));   // se ejecuta entero… y no comprueba nada
});
```

Suma cobertura y sigue verde si alguien cambia `60` por `45`. **Ejemplo real de mi suite**: los
tests de `pedirJson` están al 100 % y leen `cuerpo.error`. Si el backend cambiara a
`{ message }`, mi doble seguiría contestando la forma vieja: cobertura 100 %, tests verdes,
producción rota. Cobertura baja **sí** es señal de problema; alta **no** es señal de calidad.

### El ejercicio del camino sin cubrir

**`backend/src/services/crear-reserva.ts:90`** — `if (!rango) return pedidoInvalido(...)`

1. **Qué línea es**: se ejecuta siempre, pero sólo por el camino `false`.
2. **Qué entrada la recorrería**: **ninguna**. Cuatro líneas antes ya se validó que
   `fecha + horaInicio` sea una fecha válida, y si eso parsea, `rangoDelDia` también. Probé
   `"25/09/2026"`, `""` y `"2026-13-45"`: las tres caen en el control anterior.
3. **Qué decidí: no agregar el test.** Es una guarda que TypeScript obliga a escribir
   (`rangoDelDia` devuelve `... | null`), no un caso de negocio. Ese 1,17 % que le falta a las
   ramas del backend **es esto**. Lo mismo en el front: el `?? []` de `validacion.ts:107`.

Y dos ramas que **sí eran agujeros**, y les escribí el test:

- La reserva **de 23:00 a 00:00**: dura 60 minutos y su fin (`00:00`) es *menor* que las 23:00,
  así que se colaba por el control del cierre. Sin el reporte no se me ocurría.
- En `cambiarEstado`, el **encadenamiento** de la regla 4 con la regla 5: las tenía probadas
  por separado, nunca juntas.

### Cómo corre en el pipeline

- Los tests corren **adentro del contenedor**, en una etapa `FROM build AS test` del Dockerfile
  (misma idea del TP4: el pipeline le pide todo al Dockerfile). La etapa va **en el medio**: si
  quedara última, un `docker build` sin `--target` publicaría el contenedor de tests.
- Son pasos nuevos **dentro de `build-backend` y `build-frontend`**, sin jobs nuevos: esos jobs
  ya eran *required checks* desde el TP4, así que el umbral frena el merge sin tocar la
  protección de `main`.
- El resultado se ve en el **Summary** de la corrida y como **artefacto descargable**
  (`coverage-backend`, `coverage-frontend`), con `if: !cancelled()` para que exista también
  cuando los tests fallan. Ejemplo: [corrida 36200285102](https://github.com/FranZago1/ingsoft3-tp01/actions/runs/36200285102)
  ([PR #21](https://github.com/FranZago1/ingsoft3-tp01/pull/21)).

### El Pull Request bloqueado

**El primero — [PR #22, huecos libres de una cancha](https://github.com/FranZago1/ingsoft3-tp01/pull/22):
rojo → tests → verde → merge.** Agregué `huecosLibres()` en `frontend/src/lib/agenda.ts` sin
tests. [La corrida roja (36200604544)](https://github.com/FranZago1/ingsoft3-tp01/actions/runs/36200604544):

```
     Tests  57 passed (57)
All files      |   76.19 |     98.5 |     100 |   76.19 |
ERROR: Coverage for lines (76.19%) does not meet global threshold (90%)
```

- **Qué check**: `build-frontend` (required). Compilaba y los 57 tests pasaban.
- **En qué métrica**: **líneas**, 76,19 % contra 90. Las ramas casi no se movieron (98,5 %).
- **Por qué**: `agenda.ts` cae en el `include`, así que entró a la cuenta solo.
- **Que el freno es real**: `gh pr merge 22` → *«the base branch policy prohibits the merge»*.
- **Qué escribí**: nueve tests, **uno por camino que declara la función** (los tres filtros,
  hueco contra apertura, contra cierre, del medio, reservas superpuestas, y un hueco de 30 min
  que se descarta porque no alcanza para la reserva mínima). Volvió a 100 % / 98,73 % y se mergeó.

**El segundo — [PR #23, ocupación por cancha](https://github.com/FranZago1/ingsoft3-tp01/pull/23):
abierto y en rojo hasta la defensa.** Un archivo (`services/estadisticas.ts`) sin tests: líneas
del backend al 83,52 %, `build-backend` en rojo. Prueba que el freno existe sin depender de una
captura.

**Por qué este freno es distinto del del TP4**: allá sólo frenaba algo que **no compilaba**.
Acá todo compila y pasa, y lo frena **un criterio de calidad que elegí yo**.

**Qué deja pasar igual**: un test sin `assert`; una regla bien cubierta y **mal entendida** (si
el club quería 24 h de ventana y yo entendí 2, los tests congelan el error); un cambio de
contrato del backend (mi doble contesta la forma vieja); y lo que viva en el pegamento excluido.
Lo del requisito mal entendido sólo lo ataja el primero de los tres guardianes de `main`: el PR
revisado por una persona (TP1), junto al build verde (TP4) y los tests con umbral (TP5).

### Problemas encontrados

1. **vitest 4/5 no se instalaba** (bug de npm 10.9.2, y vitest 5 exige `@types/node ≥ 22`; el
   proyecto usa la 20). Usé **vitest 3.2.7**, sin `--force` ni `--legacy-peer-deps`, que habrían
   dejado un lockfile roto.
2. **`tsc` metía los tests en la imagen de producción** (el `tsconfig.json` incluía
   `src/**/*.ts`). Los excluí, y como vitest ejecuta TS pero no lo typechequea, agregué un
   `tsconfig.test.json` para que los tests sigan verificados.
3. **La zona horaria**: las reglas usan hora local; mi máquina está en UTC−3 y el runner en UTC.
   Con fechas ISO con `Z`, los tests pasarían acá y fallarían en el pipeline. Regla adoptada:
   fechas con **componentes locales** (`new Date(2026, 8, 25, 10, 0)`).

### Uso de IA — TP5

**Con asistencia de IA (Claude Code)**: el mapeo del enunciado a este stack, la suite, los tres
refactors, las etapas `test` de los Dockerfiles, los pasos del `ci.yml` y la redacción.

**Decidido por mí**: qué lógica testear (la reserva doble), el umbral 90 sobre líneas y ramas,
qué entra y qué sale de la cuenta, y cuántos tests para arreglar el #22.

**Cómo lo verifiqué**:

- Que el umbral frena: vitest con un umbral imposible → `exit=1` con los tests en verde.
- Que el gate bloquea: el rechazo de GitHub al intentar mergear el #22.
- Que los tests corren en el contenedor y los números coinciden con los locales (log de la corrida).
- Que las ramas sin cubrir son inalcanzables: probando entradas concretas.

**Qué verifica cada assert**: casi todos están sobre un borde. Por ejemplo, el
`not.toHaveBeenCalled()` de `crear-reserva.test.ts` comprueba que **la regla frenó la escritura**
en la base, y el `toHaveBeenCalledWith` de `http.test.ts` que la cookie de sesión se reenvía.

**Qué NO está cubierto**: la **concurrencia**. Dos pedidos simultáneos al mismo turno pasan los
dos la validación y crean dos reservas, porque la consulta y el `create` no están en una
transacción. Ningún unit test lo atrapa, y mi 100 % no dice nada de eso.

---

## TP6 — CD: environments, aprobaciones y deployment patterns

Desde este TP el pipeline **entrega**: publica la imagen que verificó, la despliega sola en QA y
la lleva a PROD sólo con aprobación humana.

### El artefacto: se publica sólo lo que pasó la verificación

Cada push a `main` publica `ghcr.io/franzago1/ingsoft3-tp01-{backend,frontend}:sha-<commit>`. La
garantía sale de **encadenar tres controles**:

1. **Nada entra a `main` sin verde** (los *required checks* del TP4 con el umbral del TP5).
2. **Sólo `main` publica**: login y push llevan `github.event_name == 'push' && github.ref == 'refs/heads/main'`.
3. **Publicar es el último paso del job que corrió los tests**: si los tests fallan, el job se
   corta antes. **La condición es el orden.**

Si se publicara con rojo, «estar en el registry» dejaría de significar «pasó la verificación».
**Lo que no garantiza**: un `docker push` a mano entra igual, y una etiqueta se puede re-apuntar;
lo inequívoco es el **digest** (`sha256:…`). `packages: write` va sólo en los jobs de build, con
el `GITHUB_TOKEN` de la corrida.

### Continuous Delivery, no Continuous Deployment

Todo llega solo a QA; a PROD, sólo con aprobación. No Deployment porque mi red no lo sostiene:
sin e2e, sin monitoreo ni alertas, y un smoke que dice que la app contesta, no que funciona. Me
faltarían e2e como compuerta, métricas de error/latencia en PROD y rollback automático.

### Dos entornos: Render + Neon

| | QA | PROD |
| --- | --- | --- |
| Front | https://reservapadel-front-qa.onrender.com | https://reservapadel-front-prod.onrender.com |
| API | https://reservapadel-api-qa.onrender.com | https://reservapadel-api-prod.onrender.com |
| Base | Neon, `app_qa` | Neon, `app_prod` |

Los cinco puntos: dos entornos con URL; una base por entorno; front y back como contenedores de
mis Dockerfiles; deploy disparado por el pipeline con **Auto-Deploy en Off**; PROD detrás de la
aprobación. **Neon y no el Postgres de Render** porque el de Render expira a los 30 días.

**Por variable** (cambia por entorno): `DATABASE_URL` y `JWT_SECRET` en la api, `BACKEND_URL` en
el front. **Adentro de la imagen**: código, dependencias, migraciones, seed y `APP_COMMIT`. Mi front
no usa nginx: el middleware de Next lee `BACKEND_URL` **en cada pedido**, así que la misma imagen
sirve en QA y PROD.

**Bases separadas de verdad**: inserto un dato sólo en `app_prod` desde el SQL Editor y en QA no
aparece.

### La cadena de promoción

```
build-backend ─┐
               ├─ deploy-qa ──── deploy-prod
build-frontend ┘  env: qa         env: production (⏸ required reviewer)
                  sólo en main    needs: deploy-qa · concurrency: deploy-prod
```

- **`needs:`** encadena: sin builds verdes no hay QA; sin smoke de QA verde no hay PROD.
- **`if:` de `main`** en `deploy-qa`: los PRs verifican pero no despliegan.
- **`environment:`** da a cada job los secrets de su entorno y lo registra en *Deployments*.
- **`concurrency: deploy-prod`** evita dos deploys a la vez, pero no ordena aprobaciones:
  aprobar una corrida vieja haría **retroceder** PROD.

**`&ref=$GITHUB_SHA`** en el hook: sin eso Render despliega la **punta de la rama**, no el commit
verificado (con dos merges seguidos, o horas de espera hasta el approve, subiría otro código).

| Secret | Dónde vive | Quién lo lee |
| --- | --- | --- |
| Hooks de QA (api y front) | environment `qa` | sólo `deploy-qa` |
| Hooks de PROD (api y front) | environment `production` | sólo `deploy-prod`, **después del approve** |
| `URL_API`, `URL_FRONT` (variables) | cada environment | el smoke |

Un hook **es una credencial**: en el repo, cualquier job podría desplegar a PROD sin aprobación.

### El smoke test: qué prueba y qué no

Reintenta hasta 15 min (45 × 20 s, `--max-time 10` por curl) por el cold start y el build, y
pide en la misma vuelta: `/api/health` con **el commit de esta corrida**, `/api/health/db`
(toca una tabla real), `/login` del front, y `/api/health` **a través del front**.

**El commit y no sólo un 200** porque Render sirve la versión **vieja** mientras construye (o si
el build falla): en la primera corrida hubo 3 vueltas con 200 y versión anterior.
**No prueba** qué versión corre el front ni que un usuario pueda reservar: prueba que el entorno
**está vivo y es el que desplegué**.

### El gate humano: qué miro antes de aprobar

Required reviewer en `production` (yo, sin *Prevent self-review*). Miro: que sea **la corrida
más nueva** esperando; el smoke de QA verde **para este commit**; qué cambia (migraciones,
variables o `ci.yml`, con más cuidado); el cambio probado a mano en QA; y que PROD esté en el
commit que creo. **No veo** cómo se comporta con tráfico y datos reales: me faltan errores y
latencia por versión, y alertas.

### El rechazo y la aprobación

- **Aprobación**: https://github.com/FranZago1/ingsoft3-tp01/actions/runs/36643549553
- **Rechazo**: https://github.com/FranZago1/ingsoft3-tp01/actions/runs/36645604430 — *«El smoke de
  QA dio verde con la API en 0538875, pero el front de QA seguía mostrando la versión anterior, no
  apruebo sin ver el cambio en QA»*. `deploy-prod` terminó sin leer los secrets de PROD.

### La letra chica del free tier

- Render **duerme** los servicios a los ~15 min (cold start ~1 min) → el smoke reintenta.
- **750 h/mes por workspace**, compartidas → nada de pings para mantenerlos despiertos.
- **500 min de build/mes** → si se acaban, el hook responde igual sin construir; mi smoke lo
  detecta porque exige el commit.
- Neon suspende a los ~5 min y despierta en segundos.

### Qué garantía pierdo porque Render reconstruye

Promuevo **el mismo commit, no la misma imagen**: lo que el lockfile no fija (la base
`node:20-alpine`, `apk add openssl`, el motor de Prisma) puede salir distinto. Lo resuelve el TP7.

### Deployment pattern para producción real

**Blue-green + feature flags.** El riesgo caro de un club es una versión que deja a **todos**
sin reservar en el horario pico: blue-green da rollback instantáneo y probar la versión completa
antes del tráfico, por 2× de infraestructura (barato acá). **Canary no**: no hay tráfico para una
señal estadística ni observabilidad. **Flags** para reglas de negocio: se despliega apagado y se
prende primero para el admin. Cuidado: la base es una sola, así que las migraciones tienen que
servir a las dos versiones (expand/contract).

### Plan de rollback

Disparar los hooks de PROD con `&ref=<sha del último deploy bueno>` (sale de *Deployments* o del
tag anterior), esperar el **live** en *Deploys* de Render y confirmar con `/api/health`.

**Medido: 83 segundos** (de `4ec4e09` a `65bdf88`), con las horas en *Deploys* de los dos
servicios de PROD. Rápido porque ese commit ya estaba construido; si no, 2 a 5 min por servicio.
El MTTR real lo domina la **detección**, porque no hay alertas.

**No deshace los datos**: las migraciones sólo van hacia adelante y las reservas creadas quedan.
Haría falta expand/contract y un restore a un punto en el tiempo de Neon antes de cada migración.

### Problemas encontrados

- **El proxy del front daba 404 en Render**: el código andaba en local con el mismo `BACKEND_URL`;
  el valor en Render estaba mal. **El smoke lo atrapó** con el chequeo a través del front.
- **PROD corría un commit no aprobado**: Auto-Deploy prendido. Lo apagué en los cuatro servicios.
- **No había endpoint público que tocara la base**: agregué `/api/health/db`, aparte de
  `/api/health` para que el `HEALTHCHECK` no despierte a Neon cada 10 s.

### Uso de IA — TP6

**Con IA (Claude Code)**: el mapeo a este stack, el `ci.yml`, los endpoints de salud, el
diagnóstico del 404, los environments, los PRs y la redacción. **A mano**: Neon y Render (bases,
servicios, variables, Auto-Deploy en Off), los hooks como secrets, aprobar y rechazar con mi
motivo, la prueba de las bases y el cronometraje del rollback. **Verificado**: el orden de los
pasos en la corrida de `main`, el registry `skipped` en un PR, los paquetes públicos (manifest con
token anónimo) y el commit de cada entorno en `/api/health`, directo y a través del front.

---

## TP7 — Contenedores en el pipeline + integración y e2e

Cierra el hueco del TP6 (Render reconstruía) y agrega dos pruebas contra QA que deciden la
promoción:

```
build (tests + publica sha-<commit>) → deploy-qa → integracion → e2e → ⏸ aprobación → deploy-prod
```

Son dos Dockerfiles: **cuatro** servicios *Existing Image* y dos paquetes. `API_BASE_URL` y
`E2E_BASE_URL` son distintas porque api y front tienen URLs distintas.

### Build once, deploy many

En el TP6 dos builds del mismo commit podían salir distintos. Ejemplo de mi app: el motor de
Prisma se elige **según la versión de OpenSSL** que baja `apk add openssl` ese día; si Alpine la
sube entre el build de QA y el de PROD, PROD corre un motor que QA nunca probó. Ahora la imagen
se construye **una vez** y QA, las suites y PROD usan esa misma imagen.

### Las etiquetas

- **`sha-<commit>`** (registry): de qué código salió. Es la única que publica el pipeline.
- **`v7.0.0`** (git): nombre humano sobre **el commit que está en PROD** según *Deployments*.
  Del tag a la imagen: `git rev-list -n1 v7.0.0` → `…:sha-<ese commit>`.
- **Sin `latest`**: no dice qué hay detrás, y dos deploys de `latest` pueden correr cosas
  distintas. Las etiquetas son mutables; la garantía completa sería desplegar por **digest**.

**Render** quedó configurado con `…:sha-a134ff6…` (el último merge del TP6), pero cambiar la
fuente no despliega: lo que corre lo nombra cada deploy con `imgURL`, y lo leo en `/api/health`.
Por eso no se usa *Manual Deploy* (desplegaría la imagen vieja). No creé servicios nuevos: les
cambié la fuente a los cuatro, y conservé URLs, variables y hooks.

### Cómo se comprueba que el entorno EJECUTA la imagen

En los *Events* de Render («Triggered via Deploy Hook» con la imagen `sha-…`, lo muestro en
vivo); en el log, el mismo `imgURL` en `deploy-qa` y `deploy-prod`; y `/api/health`, que devuelve
el `APP_COMMIT` **horneado en la imagen** (un servicio *Existing Image* no tiene otro de dónde
sacarlo). El smoke espera ese commit, pero **no prueba que la app funcione**: en la corrida roja
dio verde con el alta rota.

### Qué pruebo en cada suite

El dato único es el **turno** (cancha + fecha + hora): `turnoUnico()` lo arma con la hora actual.
Para poder limpiar agregué `DELETE /api/reservas/:id` y un botón de borrar.

**Integración** (`e2e/api.spec.js`, sin navegador, contra la api de QA):

1. **Alta + verificación + borrado**: `POST` 201 → `GET` la encuentra → `DELETE` 204 → `GET` 404.
2. **Alta inválida**: sin cancha → 400, y el jugador no tiene ninguna reserva ese día.
3. **Cancelar libera el turno** (elegida): activa bloquea con 422; cancelada, se vuelve a
   reservar. La regla vive en **una consulta a Postgres**, donde un doble no ve nada.

**e2e** (`e2e/reservas.spec.js`, Chromium contra el front de QA):

1. **Creación**: reservar → verlo en el detalle y en «Mis reservas» → borrar → ya no está.
2. **Error**: turno ocupado → el usuario ve «…se superpone…» → aparece una sola vez en su lista.
3. **Cancelar mi reserva** (elegida, el uso diario): crear → cancelar → `cancelada` en el detalle
   y en la lista → borrar. Sobre el login porque toca la base.

Cada test afirma **sobre su propio turno** y limpia comprobándolo. Buscar por
`getByLabel`/`getByRole` me obligó a arreglar accesibilidad (labels y `role="alert"`).

**Qué no puse (pirámide)**: en e2e, las reglas de horario y estados (ya las cubren los unitarios
en milisegundos); en integración, los mensajes de cada validación y el 403 (mapeo HTTP ya probado
con dobles). Sólo la e2e prueba la traducción entre pantalla y api.

### El par verde/rojo de mi rotura

La integración usa la api **directo**; la e2e, **a través del front**. Verde + rojo = el front
usa mal la api.

**Rotura** ([PR #31](https://github.com/FranZago1/ingsoft3-tp01/pull/31), sin tocar `e2e/`): el
formulario manda `cancha` en vez de `canchaId`. Unitarios ✅, smoke ✅, integración ✅,
**e2e ❌**, `deploy-prod` no arrancó. **Se rompió el front**, y lo confirmé con el reporte: la
captura muestra «Faltan datos: canchaId…» y la traza, el `POST` con `{"cancha": …}` y un 400. Si
hubiera roto la api, la integración daba rojo y la e2e ni corría.

**El gate no ataja**: lo que las pruebas no recorren (admin, filtro, registro), datos o
configuración propios de PROD, concurrencia y carga, y bugs de zona horaria.

### Integración amplia y no estrecha

Contra la api de QA desplegada, no levantando la api y un Postgres en el job. **Gano**: prueba la
imagen que va a PROD, con la base, red y variables de verdad. **Pierdo**: llega tarde (después del
deploy), depende de que QA esté vivo y comparte la base. La elegí porque el problema es «en QA
anda, en PROD no», que la estrecha no ve.

### Cold start y tests flaky

Sin sleeps: el smoke despierta QA antes de las suites, timeouts de 60 s por test y 15 s por
aserción, `retries: 1` y `workers: 1` (comparten base). Un **flaky** pasa o falla con el mismo
código, y **entrena a ignorar el rojo**; el retry no lo esconde, porque el reporte lo marca.

### Límite conocido: QA es uno solo

Dos merges seguidos: la corrida B puede redesplegar QA mientras las suites de A lo usan. Lo
reconozco comparando la hora de *Events* de QA con la de los jobs de A; rechazo A y me quedo con
B. Mi regla: un merge por vez. En un equipo real, un entorno efímero por corrida. Si un test falla
a mitad, la limpieza va en un `finally`.

### Problemas encontrados

- **Docker Desktop sin red**: probé las suites en local sin Docker (Postgres de Homebrew + Node)
  y la publicidad de los paquetes con el manifest.
- **Hora del front y del back**: en local, api en UTC y front en hora argentina mostraban el
  turno 3 h corrido. En Render los dos están en UTC; queda como **bug latente** que mis pruebas no
  atajan.

### Uso de IA — TP7

**Con IA (Claude Code)**: `imgURL`, el `DELETE` y el botón, la accesibilidad, las dos suites, los
jobs y el gate, la rotura y su diagnóstico, los PRs, la release y la redacción. **A mano**: el
cambio de fuente en Render y las aprobaciones. **Verificado**: las seis pruebas y la rotura en
local antes del pipeline, el commit en `/api/health` y en *Events*, el reporte descargado, y
`git rev-list -n1 v7.0.0` contra *Deployments*.

---

## TP8 — Infraestructura como Código: el entorno `preprod`

Un tercer entorno, `preprod`, declarado en `infra/` y creado desde cero: un proyecto de Neon
propio (`reservapadel-preprod`, rol `app_preprod_owner`, base `app_preprod`) y dos servicios free
de Render (`reservapadel-api-preprod` y `reservapadel-front-preprod`) con la imagen del TP7.
**QA y PROD no están declarados ni se tocaron.**

### Riel y versiones

**Terraform 1.16.6** contra Neon y Render.

| Provider | Versión fijada | Para qué |
| --- | --- | --- |
| `kislerdm/neon` | `0.18.0` | proyecto, rol y base |
| `render-oss/render` | `1.9.1` | los dos servicios |
| `hashicorp/random` | `3.7.2` | el `JWT_SECRET` de preprod |

El `.terraform.lock.hcl` va commiteado. El estado vive en mi máquina
(`infra/terraform.tfstate`) y el `.gitignore` lo ignora junto con `.terraform/`, `*.tfvars` y los
planes guardados.

**Qué se deriva**:

- `DATABASE_URL` se **arma** en un `local` con el host de `neon_project`, el nombre de
  `neon_database` y la contraseña de `neon_role` (con `urlencode`), host directo y
  `sslmode=require`.
- `BACKEND_URL` del front sale de `render_web_service.api.url`.
- `JWT_SECRET` lo genera `random_password` (mi app no arranca sin él).
- `APP_COMMIT` **no** se declara: viene en la imagen y una variable lo pisaría.
- Las claves (`NEON_API_KEY`, `RENDER_API_KEY`, `RENDER_OWNER_ID`) las leen los providers del
  entorno, desde un `infra/.env` ignorado.
- La etiqueta de la imagen es fija en `variables.tf` (`sha-4b4f062…`).

**Entorno y no seis recursos**: `/api/health`, `/api/health/db` (la migración y el seed corrieron
contra **su** base), `/login` del front, y `/api/health/db` **a través del front**.

### Lo que medí

- **Crear**: 6 recursos en ~19 s (el servicio tarda unos minutos más en levantar).
- **Idempotencia**: el segundo `plan` dice «No changes».
- **Estado**: la contraseña está en `terraform.tfstate` en texto plano (por eso no va al repo).
- **Drift**: borré `app_preprod` por fuera → el plan dijo `Plan: 1 to add` → el `apply` la
  recreó. Una base creada a mano que el código no declara → el plan no la ve.
- **`prevent_destroy`**: el `destroy` se negó («Instance cannot be destroyed»).
- **Orden del destroy**: front → api → (jwt) → base → rol → proyecto, el grafo al revés.
- **QA y PROD intactos**: mismo commit y misma cantidad de canchas antes y después.

**Cuota**: con preprod vivo son siete servicios free compartiendo las 750 horas. Por eso preprod
queda **destruido** cuando no lo uso.

### Problemas encontrados

- **El `RENDER_OWNER_ID`**: lo saqué de la API de Render (`GET /v1/owners`): es un `tea-…`.
- **El plan guardado tiene secretos**: el `tfplan` no estaba ignorado y lleva las contraseñas.
  Lo borré y agregué `tfplan` y `*.tfplan` al `.gitignore`.
- **Un `destroy` sin la protección**: falló el paso que agregaba `prevent_destroy` y el
  `destroy` se llevó preprod. Lo recreé con `apply` y repetí la prueba. Es la diferencia entre un
  entorno desechable y uno con datos.

### Uso de IA — TP8

**Con asistencia de IA (Claude Code)**: el HCL de `infra/`, las corridas de
`plan`/`apply`/`destroy`, el drift y `prevent_destroy`, el PR, la release y la redacción.

**A mano**: generar las API keys de Neon y Render.

**Cómo lo verifiqué**: leyendo cada plan antes de aplicarlo (`6 to add, 0 to change,
0 to destroy`), con los cuatro chequeos de entorno después de cada `apply`, y comparando QA y
PROD antes y después.

---

## TP9 — DevSecOps + Observabilidad + Continuous Feedback

Activo en *Settings → Advanced Security*: **Dependabot** (alertas + actualizaciones de seguridad,
`.github/dependabot.yml` para npm en `/backend`, npm en `/frontend` y github-actions), **CodeQL**
por defecto y **push protection**. Monitor: **UptimeRobot** sobre
`https://reservapadel-api-prod.onrender.com/api/health`. **Sentry** en el back (`@sentry/node`) y
en el front. La tarjeta que salió de los datos es la **#64**.

### El PR de Dependabot que mergeé: #63

`next` **15.5.23 → 15.5.27** en `/frontend`. Me animé porque:

- **Es un patch**: el changelog no menciona breaking changes.
- **Es de seguridad**: corrige tres vulnerabilidades medias del App Router, y en el camino trae la
  15.5.24, que corrigió dos ejecuciones remotas de código críticas.
- **Su CI dio verde** (build, tests y coverage), y después del merge la cadena completa (QA,
  integración, e2e) volvió a pasar antes de PROD. Ese verde es todo el semestre diciendo «podés».

Los que **no** mergeé: de 26 PRs, 8 dieron rojo (TypeScript 7, Vitest 5, Tailwind 4, ESLint 10,
React). Todos son majors: el CI rojo dice «esto rompe».

### Lo que midió el monitor, y lo que midió Sentry

**La caída provocada** (UTC−3):

| Hora | Qué pasó |
|---|---|
| 18:02 | *Suspend* de la api de PROD en Render |
| 18:08 | Mail **DOWN** → **6 minutos** de detección |
| 18:08 | *Resume* |
| 18:13 | Mail **UP** |

Con chequeo cada 5 min, el peor caso es ~10. Sin monitor me enteraba cuando un usuario avisara.
El monitor quedó **pausado**: despierto todo el mes se come las 750 horas de Render.

**El uso real de PROD**:

- **Más usada y más lenta**: `GET /api/reservas`, de **20 ms a 141 ms** (la misma consulta, 7
  veces de diferencia). Es *Mis reservas* y el panel del admin.
- **El error**: en Issues, con ruta, archivo, línea y el **release** = el commit de la imagen
  (`e7c27a4`), que pongo con `APP_COMMIT`.
- **El front**: cargas de hasta ~2,7 s, el primer pedido después de que el servicio se durmió.

**Tarjeta #64**: investigar la traza de 141 ms (¿base o Express?) y, según eso, un índice en
`Reserva(usuarioId, inicio)`.

**Qué ve cada uno**: el monitor ve que la api contesta, pero no un 500 en una ruta, ni demoras,
ni el front. Sentry ve errores, demoras y uso desde adentro, pero si el proceso está muerto no
manda nada. Por eso van juntos.

### Decisiones de Sentry

- **DSN del back por variable** (`SENTRY_DSN`), **sólo en PROD**: tests, local y QA no mandan
  nada, así las e2e no ensucian el uso real.
- **DSN del front escrito en el código**: no es un secreto, sólo sirve para mandar datos, no para
  leerlos, y viaja igual en el JavaScript del navegador.
- **`instrument.ts` es el primer import de `index.ts`**: Sentry envuelve Express al cargarse; si
  Express ya estaba cargado, se pierden las demoras por ruta.
- **El endpoint de prueba del error** vivió un solo PR (#36) y se sacó en el de cierre (#65).

### CodeQL: lo que encontró y qué hice

- **4 × `actions/missing-workflow-permissions`** (`deploy-qa`, `integracion`, `e2e`,
  `deploy-prod`): no declaraban `permissions:`. No es explotable hoy (el default del repo es
  lectura), pero depende de un setting. **Arreglado**: `contents: read`.
- **`js/polynomial-redos`** en la regex de email. **Es explotable**: `a@` seguido de miles de
  puntos tarda el cuadrado del largo (215 ms con 20.000 caracteres; ~5 s con los 100 KB que acepta
  `express.json`), contra `/login` y sin sesión: un DoS con un solo cliente. **Arreglado**: tope
  de 254 caracteres antes de la regex y un test que manda el ataque y exige menos de 50 ms.
- **`js/missing-rate-limiting`** en `POST /api/auth/login`: es real. **No lo arreglé en este TP**
  (el rate limit por IP tiene un detalle con el `trust proxy` de Render); queda abierto a propósito.

### Problemas encontrados

- **Un deploy a PROD trabado 35 minutos**: `deploy-prod` no arrancaba porque una corrida del TP8,
  de 4 días antes, seguía esperando review y tenía tomado el grupo de `concurrency: deploy-prod`.
  La rechacé y la nueva arrancó. Es el riesgo anotado en el TP6, ahora medido; está como
  postmortem en `postmortem.md`.
- **«No aparece nada en Sentry»**: era lo anterior. PROD seguía en el commit viejo, sin Sentry.
- **Advanced Security se prendió a mano** desde *Settings*: por API quedó bloqueado por permisos.

### Uso de IA — TP9

**Con asistencia de IA (Claude Code)**: el `dependabot.yml`, el código de Sentry, el endpoint de
prueba y su retiro, el análisis de CodeQL y los arreglos (permisos y ReDoS con su test), el
diagnóstico del deploy trabado, la tarjeta #64, el `postmortem.md` y la redacción.

**A mano**: las cuentas de Sentry y UptimeRobot, `SENTRY_DSN` en Render, las protecciones en
*Settings*, el *Suspend*/*Resume* y pausar el monitor, los merges y aprobaciones, y usar PROD y
provocar el error.

**Cómo lo verifiqué**: el back en local con un DSN de prueba antes del PR; tests, `tsc`, ESLint
y `next build`; en PROD, el error en Issues con el release `e7c27a4`; las horas DOWN/UP en los
mails del monitor.
