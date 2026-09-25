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

El TP4 dejó un pipeline que construye las dos imágenes en cada Pull Request y las exige
como *required checks* de `main`. Lo que no hacía era ejecutar una sola línea de
comportamiento: que compile no dice que ande. Esta sección cuenta cómo se agregó esa
capa y, sobre todo, **por qué un número que elegí yo ahora puede frenar un merge**.

### Qué lógica elegí testear, y por qué ésa

La pregunta que ordena la suite es **dónde duele un bug en esta app**. Y la respuesta no
es "en el login": es **una cancha reservada dos veces en el mismo horario**. Ese error no
tira una excepción, no rompe ninguna pantalla y nadie lo ve hasta que dos parejas se
presentan a la misma hora. Es un bug que el sistema no puede detectar solo, porque el
estado resultante es perfectamente válido para la base de datos.

Por eso la suite ataca primero `backend/src/services/reservas.ts`, y adentro:

| Regla | Qué protege | Por qué importa |
| --- | --- | --- |
| 1 · solapamiento | Dos reservas no pisadas en la misma cancha | El bug caro, el que se descubre en la cancha |
| 2 · horario | 08:00–23:00, entre 60 y 120 minutos | Todos sus límites son **bordes**: `<` contra `<=` |
| 3 · no pasado | No se reserva hacia atrás | Depende del reloj: sin inyectarlo no se puede testear |
| 4 · transiciones | `pendiente→confirmada→cancelada` | Una máquina de estados: lo que NO se puede hacer importa más |
| 5 · ventana de 2 h | Una confirmada no se cancela sobre la hora | Regla de negocio pura, invisible en el código de la UI |
| 6 · autorización | Cada uno ve lo suyo; el admin, todo | Un error acá es una fuga de datos |
| 7 · registro | Email válido, contraseña de 8+ | La única que el usuario ve fallar todos los días |

**El criterio que usé para saber si un test vale**: si invierto la regla que prueba, algo
se tiene que poner en rojo. Por eso casi todos los casos están escritos **sobre el
borde** y no en el medio: una reserva de 60 minutos exactos se acepta, una de 59 no;
cancelar exactamente 2 horas antes se puede, 1 h 59 no; dos reservas contiguas (10–11 y
11–12) **no** se solapan. Un test con una reserva de 90 minutos no protege nada — pasa
igual si alguien mueve el límite a 45 o a 200.

Lo que quedó **afuera** de la suite, a propósito: los componentes de React y las
pantallas. Testear la UI unitariamente requiere jsdom y Testing Library, y verifica que
un botón se pinte, no que una regla se cumpla. Esa verificación se hace de punta a punta
contra la app desplegada, y es el TP7.

### Números de la suite

| | Métodos de test | Casos ejecutados | Reglas cubiertas |
| --- | --- | --- | --- |
| Backend | 48 | 76 | 7 |
| Frontend | 39 | 57 | 5 (las que espeja del backend) |

📌 **Métodos y casos no son lo mismo, y el mínimo se cuenta en métodos.** Un `it.each`
con siete filas es **un** test, no siete: por eso la primera columna es la que importa.
Los 87 métodos se reparten sobre reglas distintas, no sobre siete datos de la misma.

### Mi stack no es el de la cátedra: qué herramienta cubre cada cosa

La guía está escrita sobre .NET + vitest. Esta app es Node/TypeScript de los dos lados
(Express + Prisma en el backend, Next.js en el frontend), así que cada fila de la tabla
«Tu stack, de un vistazo» se resolvió así:

| Lo que hay que lograr | Con qué lo hice |
| --- | --- |
| Dónde viven los tests | Al lado del código: `reservas.ts` → `reservas.test.ts` |
| Un test parametrizado | `it.each` de vitest (el equivalente del `[Theory]`/`[InlineData]`) |
| Que la dependencia entre desde afuera | Un parámetro de la función, tipado con un `type` propio |
| Fabricar el doble | `vi.fn()`, que viene con vitest: no hay que instalar un Moq |
| Medir la cobertura | `@vitest/coverage-v8` (provider V8) |
| **Un umbral que ROMPE el build** | `coverage.thresholds` del `vitest.config.ts` |
| **Qué ENTRA en la cuenta** | `coverage.include` / `coverage.exclude` del mismo archivo |
| Reporte legible | Reporters `html` (navegable) + `json-summary` (el que lee el pipeline) |
| Que las herramientas entren al contenedor | Una etapa `FROM build AS test`: la etapa `build` ya instala con `npm ci` **sin** `--omit=dev` |

**Una sola herramienta para los dos lados** fue una decisión, no una casualidad: vitest
corre TypeScript sin configuración previa, y tener el mismo runner, el mismo `it.each` y
el mismo `vi.fn()` en el back y en el front significa una sola cosa que entender y una
sola que explicar.

### Los tres refactors: lo que hubo que abrir para poder testear

Ésta es la parte que más código de producción tocó, y la lección es la de la clase: **si
algo es difícil de testear, el problema suele ser el diseño, no el test.**

**1 · `backend/src/services/crear-reserva.ts` (nuevo) — el que hace posible el mock.**
Antes, el handler de `POST /api/reservas` tenía 56 líneas que mezclaban tres cosas:
parsear el pedido, aplicar reglas y hablar con Prisma. Prisma entraba por un `import`
estático, así que **no había forma de probar esa lógica sin una base levantada** — no era
difícil, era imposible. Ahora la lógica vive en un servicio que **recibe su repositorio
por parámetro**:

```ts
export type RepositorioReservas<T> = {
  buscarCancha(id: string): Promise<{ id: string } | null>;
  reservasDelDia(canchaId: string, desde: Date, hasta: Date): Promise<ReservaDominio[]>;
  guardar(datos: DatosNuevaReserva): Promise<T>;
};

export async function crearReserva<T>(pedido, usuarioId, repo: RepositorioReservas<T>, ahora: Date)
```

Quien lo construye decide qué le pasa: la aplicación real le pasa un repositorio armado
con Prisma (vive en `routes/reservas.ts`, que es donde corresponde), y el test le pasa
tres `vi.fn()`. El handler quedó en 14 líneas que solo eligen el código HTTP.

🔴 **Lo que cambió y lo que NO.** Ninguna regla se movió de lugar ni se relajó: las
validaciones siguen siendo las mismas funciones puras de antes, llamadas en el mismo
orden. Lo único que cambió es **de dónde viene la base**. Si el refactor hubiera perdido
una validación, el test con mock quedaría verde sobre un servicio que dejó de validar, y
eso es peor que no tener el test.

También se movieron a los servicios dos cosas que eran **reglas viviendo en la ruta**:
`rangoDelDia()` y la lista de estados aceptados (`esEstadoAceptado()`). Esto no es
cosmética: en la sección de exclusiones se saca `src/routes/**` de la cuenta de
cobertura, y sacar de la medición un archivo que todavía tiene reglas adentro es
exactamente la trampa que infla el porcentaje. **Primero se sacan las reglas, después se
excluye el archivo.**

**2 · `frontend/src/lib/http.ts` (nuevo) — el mock del frontend.**
`apiGet` empezaba con `await cookies()` de `next/headers` y llamaba a `fetch` adentro:
el mismo problema con otra cara. Se separó **cómo se lee una respuesta** (los tres
caminos: 200, error con cuerpo, y el backend que no contesta) de **quién la trae**:

```ts
export async function pedirJson<T>(url: string, cookieHeader: string, traer: Traer = fetch)
```

`api.ts` quedó en dos líneas: lee la cookie, arma la URL absoluta y delega.

**3 · `frontend/src/lib/token.ts` (nuevo).** `getSesion()` tenía comportamiento real
—parsear el payload del JWT, mirar el vencimiento, normalizar el rol— pegado a una línea
de `cookies()`. Se separó en una función pura `sesionDeToken(token, ahora)` con el reloj
inyectado, igual que en el backend. `sesion.ts` quedó como pegamento de tres líneas.

📌 **Y un paso que los tests no reclaman.** En los tres casos, después de abrir el código
hay que acordarse de **cablear la dependencia real**: si me olvido, la suite queda verde
—el test le pasa el doble a mano— y la aplicación queda rota. Por eso la verificación no
fue "los tests pasan", fue levantar la app con `docker compose up` y pegarle un `curl` al
endpoint que usa cada pieza.

### El umbral: 90 % de líneas y 90 % de ramas, en los dos lados

**El número, anclado en la medición real.** Con la suite completa y en verde, hoy mido:

| | Líneas | Ramas | Funciones | Base medida |
| --- | --- | --- | --- | --- |
| Backend | **100 %** (213/213) | **98,83 %** (85/86) | 100 % (18/18) | 213 líneas |
| Frontend | **100 %** (144/144) | **98,48 %** (65/66) | 100 % (13/13) | 144 líneas |

Puse **90** porque mido 100 y 98,8 y quiero que el umbral me frene cuando **me olvide de
testear algo**, no cuando agregue un `if` defensivo. Con 90 sobre una base de 144 líneas
en el frontend, hacen falta unas **17 líneas sin cubrir** para que el build se ponga
rojo: eso es "entró una función sin tests", que es justo lo que quiero que frene. Un 95
me frenaría con 8 líneas y me empujaría a escribir tests de relleno para volver al verde,
que es la peor consecuencia posible de un gate.

**Sobre qué métrica: las dos, línea y rama.** El umbral de líneas solo es el más generoso
de todos —es la métrica que este práctico llama la menos honesta—, porque ejecutar una
línea no dice que se hayan recorrido sus dos caminos. Declarar las dos significa que
frena la que quede corta. **El número de rama, que se pide aunque no fuera el umbral, es
98,83 % en el backend y 98,48 % en el frontend.**

🔴 **Y hay un detalle que conviene decir antes de que lo pregunten: 100 % de ramas es
inalcanzable acá, y a propósito.** La única rama sin cubrir de cada lado es una que
**ninguna entrada puede recorrer** (está explicado abajo, en el ejercicio del camino sin
cubrir). O sea que el techo real de esta suite es ~98,8 y ~98,5, no 100. Un umbral de 100
en ramas pondría el build en rojo para siempre por dos `if` que son guardas de tipos.

**Qué haría falta para subirlo a 95.** Nada del lado de los tests: ya estoy arriba. Lo
que haría falta es **ampliar lo que se mide**, y ahí el candidato honesto es
`src/auth.ts` (ver abajo). Subir el umbral sin ampliar la medición no exigiría más
calidad, solo dejaría menos margen.

### Qué dejé afuera de la cuenta, y por qué cada cosa

El criterio es el de la teoría: el umbral se aplica **sobre lo que tiene sentido
testear**. Y la forma de escribirlo importa: en el backend se **incluye todo `src`** y se
excluye a mano, en vez de listar lo que sí entra. Con `include` de una carpeta, un
archivo nuevo que me olvide de nombrar **nace invisible para el umbral**, y un control
que falla hacia el número alto no es un control.

**Backend** (`backend/vitest.config.ts`):

| Fuera de la cuenta | Por qué |
| --- | --- |
| `src/index.ts` | El arranque. No hay reglas ahí, y si está mal la app no levanta: me entero sin un test |
| `src/app.ts` | Cableado de Express: monta routers, no decide nada |
| `src/prisma.ts` | Infraestructura: instancia el cliente |
| `src/env.ts` | Configuración |
| `src/http.ts` | Mapeo de `Resultado` a código HTTP: una tabla, sin comportamiento |
| `src/routes/**` | Pegamento, **después del refactor**: parsean, delegan y responden |
| `src/auth.ts` | bcrypt, JWT y tipos de Express: librerías de terceros, no reglas mías |
| `src/services/tipos.ts` | Tipos, sin comportamiento |

🔴 **El caso discutible, y prefiero decirlo yo: `src/auth.ts`.** Está afuera porque es la
frontera con bcrypt y con `jsonwebtoken`, y testear eso es testear la librería. Pero
adentro hay una función que **sí** es comportamiento mío: `leerCookie()`, un parseo a
mano del header `Cookie`. Sacarla a una función pura y meterla en la cuenta es
exactamente lo que haría falta para subir el umbral con sentido, y es lo que haría si
siguiera trabajando en esto.

**Frontend** (`frontend/vitest.config.ts`): se incluye `src/lib/**` —la carpeta donde
vive la lógica— y quedan afuera `tipos.ts` (tipos sin comportamiento), y `api.ts` y
`sesion.ts`, que **después del refactor** son tres líneas de pegamento con `next/headers`
cada uno: su comportamiento se mudó a `http.ts` y `token.ts`, que sí se miden.

Las páginas y los componentes quedan afuera de `include` porque son UI. Eso **no** es
esconder lo que no testeé: es que la verificación correcta para una pantalla es de punta
a punta con todo levantado, y ésa es la del TP7.

### Por qué una cobertura alta no garantiza calidad

La cobertura mide **ejecución**, no **verificación**. Con mi propio código:

```ts
it("valida el horario", () => {
  validarHorario(alas(10), alas(11));   // se ejecutó entero… y no comprueba nada
});
```

Ese test recorre `validarHorario` de punta a punta, suma cobertura de líneas y de varias
ramas, y **no mata un solo mutante**: si mañana alguien cambia `60` por `45`, sigue verde.
Un porcentaje alto conseguido así es falsa confianza medida con precisión.

**Y el segundo ejemplo, que es más incómodo porque es real y está en mi suite.** Los
tests de `pedirJson` están al 100 % y verifican que un error de la API se propaga leyendo
`cuerpo.error`. Si mañana el backend cambiara su contrato de errores de `{ error }` a
`{ message }`, **mi cobertura seguiría en 100 % y mis tests seguirían en verde**, porque
mi doble sigue contestando la forma vieja. El frontend se rompería igual en producción.
Esto no es un defecto del test: es su límite. Un unit test prueba **mi** código, no la
conexión entre las dos piezas — eso es el TP7.

De ahí la lectura práctica: **una cobertura baja sí es señal confiable** de problema (hay
código que nadie ejercita), pero **una cobertura alta no es señal confiable** de calidad.
Sirve como detector de agujeros y como tendencia, no como trofeo.

### El ejercicio del camino sin cubrir

El reporte de cobertura me marcó cuatro ramas que ningún test recorría. Dos resultaron
agujeros de verdad y las cubrí; dos son inalcanzables. Van las cuatro, porque la
diferencia entre unas y otras es el punto del ejercicio.

**La que elijo como respuesta, porque es la más interesante: `backend/src/services/crear-reserva.ts:90`.**

1. **Qué línea es.** `if (!rango) return pedidoInvalido("El parámetro fecha es inválido.");`
   El reporte la marca en naranja: la línea se ejecuta siempre, pero solo por el camino
   `false`.
2. **Qué entrada la recorrería.** **Ninguna.** Para llegar a la línea 90 hay que haber
   pasado, cuatro líneas antes, el control de que `new Date(`${fecha}T${horaInicio}:00`)`
   sea una fecha válida. Si ese string parsea, entonces `new Date(`${fecha}T00:00:00`)`
   —que es lo único que hace `rangoDelDia`— también parsea, así que nunca devuelve `null`
   en este punto. Probé con `"25/09/2026"`, con `""` y con `"2026-13-45"`: las tres caen
   en el control anterior, con otro mensaje.
3. **Qué decidí: no agregar el test.** La rama no existe porque haya un caso de negocio
   sin cubrir, existe porque `rangoDelDia` devuelve `{...} | null` y TypeScript **obliga**
   a estrechar el tipo antes de usar `rango.desde`. Es una guarda del compilador, no un
   camino. Y tampoco corresponde borrarla: sin ella el código no compila. Lo honesto es
   dejarla y saber que ese 1,17 % que le falta a las ramas del backend **es esto**, y no
   una regla sin probar.

**La misma situación, del lado del frontend: `src/lib/validacion.ts:107`**, el `?? []` de
`transicionesDisponibles`. Es la rama que la guía advierte que "ninguna línea declara":
no hay un `if` a la vista, la abre el operador. Ninguna entrada la recorre mientras el
parámetro sea un `EstadoReserva`, porque las tres claves están en el objeto. Tampoco la
agregué.

**Y las dos que SÍ eran agujeros**, que es lo que el ejercicio vale la pena:

- `services/reservas.ts` — la rama «la reserva no puede empezar a las 23:00» no la
  recorría nadie. Buscando qué entrada la alcanzaba apareció el caso: **una reserva de
  23:00 a 00:00**, que dura 60 minutos exactos y cuya hora de fin (`00:00`), comparada
  como hora de reloj, es *menor* que las 23:00 — así que se cuela por el control del
  cierre y la frena el otro. Le escribí el test. Sin abrir el reporte no se me hubiera
  ocurrido que una reserva puede cruzar la medianoche.
- `services/reservas.ts` — dentro de `cambiarEstado`, la rama que corta cuando la ventana
  de 2 horas no se cumple. Yo tenía probada la regla 4 por un lado y la regla 5 por el
  otro, pero **nunca su encadenamiento**: la cobertura me mostró que la composición no
  estaba verificada. Le escribí el test.

### Cómo corre en el pipeline

Los tests corren **adentro del contenedor**, en una etapa nueva del Dockerfile
(`FROM build AS test`), y no como un paso de Node en el workflow. Es la misma decisión
del TP4: el pipeline no sabe cómo se compila ni cómo se testea esta app, se lo sigue
pidiendo al Dockerfile. La etapa parte de `build` porque ahí ya está todo lo que hace
falta —Node, el código y las devDependencies, porque `npm ci` corre **sin**
`--omit=dev`— y no reinstala nada.

🔴 **La etapa va en el MEDIO, entre `build` y `runner`.** Si quedara última, un
`docker build` sin `--target` publicaría el contenedor de tests como imagen de
producción, y nada se pondría rojo.

Y es `ENTRYPOINT`, no `RUN`: así los tests no corren al construir la imagen sino cuando
el pipeline la arranca, y el reporte sale por un volumen montado — el mismo mecanismo que
el proyecto ya usaba.

**Lo que se agregó al `ci.yml` son cuatro pasos por job, y ningún job nuevo.** Eso último
es deliberado y es lo que hace que no haya que tocar la protección de `main`: los tests
corren dentro de `build-backend` y `build-frontend`, que **ya son required checks desde
el TP4**. El día que el umbral ponga uno en rojo, el merge se bloquea solo.

El resultado se publica de dos formas, porque un número que nadie ve no cambia
decisiones: una tabla de líneas/ramas/funciones en el **Summary** de la corrida, y el
reporte HTML navegable como **artefacto descargable**. Se ve en cualquier corrida verde —por
ejemplo [`actions/runs/36200285102`](https://github.com/FranZago1/ingsoft3-tp01/actions/runs/36200285102),
la que introdujo todo esto ([Pull Request #21](https://github.com/FranZago1/ingsoft3-tp01/pull/21))—:
ahí están las dos tablas en el Summary y los artefactos `coverage-backend` y
`coverage-frontend` para bajar. Los dos pasos llevan
`if: ${{ !cancelled() }}` para que el reporte exista **también cuando los tests
fallaron**, que es justo cuando uno lo quiere mirar.

📌 **Dos frenos en el paso del Summary, y hacen falta los dos.** El `test -f` cubre que el
archivo no esté. El `if (!t.lines.total)` cubre el caso silencioso: si el `include`
estuviera mal escrito y no matcheara ningún archivo, el `coverage-summary.json` **igual
se escribe**, con los totales en cero — y con cero archivos medidos **el umbral ni se
evalúa**. Sin ese segundo freno, un `include` roto publica una tabla vacía y el job queda
en verde sin haber exigido nada.

### El Pull Request bloqueado: la evidencia de que el freno existe

Son **dos** Pull Requests, y cada uno prueba una cosa distinta. El primero *cuenta* la
secuencia completa; el segundo la *prueba*, porque queda frenado y a la vista.

#### El primero: rojo → los tests que faltaban → verde → merge

**[Pull Request #22 — Huecos libres de una cancha en un día](https://github.com/FranZago1/ingsoft3-tp01/pull/22)**

Agregué `huecosLibres()` en `frontend/src/lib/agenda.ts`: calcula los tramos en los que
una cancha se puede reservar. Es código que la app necesita de verdad —hoy el usuario
tiene que deducir los horarios libres mirando el listado— y entró **sin un solo test**.

**[La corrida roja: `actions/runs/36200604544`](https://github.com/FranZago1/ingsoft3-tp01/actions/runs/36200604544)**

Y acá está el punto de todo el práctico. El log del paso dice, textual:

```
Test Files  4 passed (4)
     Tests  57 passed (57)
All files      |   76.19 |     98.5 |     100 |   76.19 |
 agenda.ts     |       0 |      100 |     100 |       0 | 9-64
ERROR: Coverage for lines (76.19%) does not meet global threshold (90%)
```

**No hay ningún error.** La imagen se construyó, el código compila, `tsc --noEmit` y el
linter pasaron, y los **57 tests terminaron en verde**. El check `build-frontend` se puso
rojo igual.

- **Qué check**: `build-frontend`, que figura como *Required* desde el TP4.
- **En qué métrica**: **líneas**, 76,19 % contra el umbral de 90. Las 35 líneas de
  `agenda.ts` que ningún test recorría arrastraron el total del frontend desde 100 %.
- **Por qué**: porque `agenda.ts` cae dentro del `include` de la cobertura, así que entró
  a la cuenta **solo**, sin que yo tuviera que declararlo. Es exactamente el
  comportamiento que buscaba al elegir `include` amplio con exclusiones explícitas.

🔴 **Y un detalle que no esperaba, que vale como respuesta de defensa: las ramas casi no
se movieron** (98,5 %, contra 98,48 % antes). En **vitest 3**, una función que ningún test
llama **no suma ramas sin cubrir** — sus caminos ni se cuentan. O sea que si mi umbral
estuviera puesto **solo sobre ramas**, este Pull Request habría pasado en verde con una
función entera sin probar. Ésa es la razón concreta, y no teórica, por la que el umbral
está sobre las dos métricas.

**Que el freno era real lo comprobé intentando mergear, no mirando una pantalla**:

```
$ gh pr merge 22 --squash
X Pull request #22 is not mergeable: the base branch policy prohibits the merge.
```

con `mergeStateStatus=BLOCKED` y `build-frontend: FAILURE` en el rollup de checks.

**Qué escribí para arreglarlo.** Nueve tests, y el número no lo inventé: es **uno por
cada camino que la función declara**. Los conté leyendo los `if` y los `filter` del
código, no mirando qué pintaba de naranja el reporte —

los tres filtros (otra fecha, otra cancha, cancelada), el hueco contra la apertura, el
hueco contra el cierre, el del medio, dos reservas superpuestas que tienen que ocupar un
solo tramo, y un hueco de 30 minutos que hay que **descartar** porque no alcanza para la
reserva más corta que el sistema acepta. Ese último es el que más me gusta: ofrecer un
hueco que después el backend rechaza sería peor que no ofrecer nada.

Con eso el frontend volvió a **100 % de líneas y 98,73 % de ramas**, el check pasó a verde
y el Pull Request se mergeó. La conversación del #22 tiene la secuencia entera.

#### El segundo: el que queda abierto y en rojo

**[Pull Request #23 — Ocupación por cancha para el panel del admin](https://github.com/FranZago1/ingsoft3-tp01/pull/23)**

Chiquito, de **un archivo**: `backend/src/services/estadisticas.ts`, con el mismo problema
**sin arreglar**. Compila, pasa el linter y los 76 tests que ya existían siguen pasando;
la cobertura de líneas del backend cae de 100 % a **83,52 %** y el check `build-backend`
queda en rojo.

**Queda abierto hasta la defensa, a propósito.** La pantalla de configuración de los
required checks solo la ve quien administra el repositorio, y lo que dice ahí no prueba
que el freno funcione. Un Pull Request frenado y visible sí, y quien corrige lo puede
comprobar por su cuenta sin depender de una captura mía.

#### Por qué este freno es distinto del del TP4

En el TP4 la condición era *«la imagen se construye»*. Lo único que podía frenarte era
que algo **no compilara**: la máquina diciendo «esto no anda». Hoy no hay nada roto —todo
compila, todos los tests pasan— y el merge está bloqueado igual por **un número que elegí
yo**. Es la primera vez en la materia que lo que decide si un cambio entra es un criterio
de calidad y no la corrección sintáctica.

🔴 **Y qué clase de error deja pasar igual**, que es la otra mitad de la respuesta. Este
gate mide **cuánto código se ejecutó**, no **si lo que hace está bien**. Deja pasar sin
inmutarse:

- Un test sin `assert`, que ejecuta y no comprueba (sube la cobertura, no verifica nada).
- Una regla **bien cubierta y mal entendida**: si yo entendí que la ventana de cancelación
  eran 2 horas y en realidad el club quería 24, mis tests congelan el error y quedan en
  verde para siempre. Ese dato no está en el repositorio: está en lo que dijo el cliente.
- Que el backend cambie su contrato de errores: mis tests de `pedirJson` siguen verdes
  porque mi doble contesta la forma vieja.
- Cualquier problema que viva en el **pegamento excluido** de la cuenta.

Con esto `main` queda con **tres guardianes**, y cada uno atrapa lo que los otros no ven:
el Pull Request obligatorio (TP1), el build verde (TP4) y ahora los tests con su umbral
(TP5). El único que puede detectar que el **requisito** se entendió mal es el primero,
porque para eso hay que saber qué se quiso pedir. El cuarto —el análisis estático— llega
en el TP9.

### Problemas encontrados

**1. `vitest` 4 y 5 no se pueden instalar con el npm de esta máquina.** `npm i -D vitest`
moría con `npm error Cannot read properties of null (reading 'edgesOut')`, un stack trace
de `arborist` que no menciona ningún paquete. No es del proyecto: es un bug de npm 10.9.2
resolviendo el conjunto de *peers opcionales* de vitest 5 (`@vitest/browser-playwright`),
y lo busca **aunque le pidas explícitamente la 4**. Antes de eso, el intento con la 5 había
fallado distinto y con razón: `vitest@5` exige `@types/node ≥ 22` y este proyecto usa la
20, que es la que corresponde al `node:20-alpine` de las imágenes. Lo verifiqué
consultando los `peerDependencies` de cada major con `npm view` en vez de ir probando.
**Cómo lo resolví**: vitest 3.2.7, que soporta `@types/node@^20`. Lo que **no** hice fue
`--force` ni `--legacy-peer-deps`: los dos habrían dejado un `package-lock.json` roto que
el `npm ci` del contenedor reproduce igual de roto. Y de paso el primer intento fallido
dejó el árbol de `node_modules` a medias, así que hubo que restaurarlo con `npm ci` antes
de seguir.

**2. `tsc` se llevaba los tests a la imagen de producción.** La etapa `build` del
Dockerfile corre `npx tsc`, y el `tsconfig.json` incluía `src/**/*.ts` — o sea que los
`*.test.ts` terminaban compilados adentro de `dist/`, y de ahí a la imagen final. No da
ningún error: simplemente la imagen que se publica lleva código de tests adentro. Se
arregla agregándolos al `exclude`. **Pero eso abrió un segundo agujero que no era
evidente**: excluidos del `tsconfig.json`, los tests dejaban de ser typechequeados por
nadie, porque vitest **ejecuta** TypeScript pero no lo verifica. Un test con un tipo mal
puesto pasaría sin que nada avise. Por eso hay un `tsconfig.test.json` que existe solo
para eso, y `npm run typecheck` corre los dos.

**3. La zona horaria: el problema que habría aparecido recién en el pipeline.** Las reglas
de esta app usan `getHours()`, o sea **hora local** (está documentado más arriba, en la
sección de la aplicación). Mi máquina está en UTC−3 y el contenedor del pipeline corre en
**UTC**. Si hubiera escrito las fechas de los tests como ISO con `Z`
—`new Date("2026-09-25T10:00:00Z")`—, la misma reserva sería de las 10 acá y de las 7 en
el runner: los tests de apertura pasarían en mi máquina y fallarían en la corrida, con un
mensaje que no menciona en ningún momento la palabra «timezone». **La regla que adopté**:
en los tests las fechas se construyen siempre con **componentes locales**
(`new Date(2026, 8, 25, 10, 0)`), que significan la misma hora de reloj en cualquier lado.
Está escrito como comentario en cada archivo de tests para que no se pierda.

**4. El Docker local era demasiado lento para usarlo como bucle de verificación.** Cada
`docker build --target test` del backend pasaba de diez minutos en esta máquina, y dos
builds en paralelo dejaban al daemon sin responder ni a `docker ps`. **Cómo lo resolví**:
separar lo que se puede verificar sin Docker de lo que no. Sin contenedor comprobé que la
suite pasa, que `COVERAGE_DIR` redirige el reporte, que el `coverage-summary.json` tiene
la forma que el paso del Summary espera, y —lo más importante— **que el umbral rompe de
verdad**, corriendo vitest con un umbral imposible y mirando el código de salida:

```
umbral IMPOSIBLE  → exit=1     (con los 76 tests en verde)
umbral real (90)  → exit=0
```

Lo único que quedaba sin verificar era si la etapa `test` del Dockerfile construye y corre,
y eso lo confirmó la primera corrida, que es además el entorno que importa.

**5. Elegir el umbral antes de medir habría sido inventarlo.** La tentación era poner 80
—el número del ejemplo de la guía— y escribir la suite para superarlo. Lo hice al revés:
escribí la suite mirando las reglas, medí, y recién con 100 y 98,8 en la mano elegí 90.
La diferencia no es cosmética: un 80 sobre una medición de 100 habría dejado que entraran
**28 líneas sin tests** antes de frenar, casi una función entera. El número sale de la
medición, no del ejemplo.

**6. Excluir la ruta antes de vaciarla habría inflado el número.** Iba a sacar
`src/routes/**` de la cobertura porque «son handlers». Pero adentro todavía vivían
`rangoDelDia()`, la construcción de las fechas y la lista de estados aceptados, que son
**reglas**. Excluir ese archivo con las reglas adentro habría subido el porcentaje sin
que nada estuviera más probado — la trampa exacta que el práctico no acepta. El orden
correcto, y el que seguí, es: **primero se sacan las reglas al servicio, después se
excluye el archivo.**

### Uso de IA — TP5

**Qué se hizo con asistencia de IA (Claude Code).** La sesión se usó de punta a punta:
para leer el enunciado y mapearlo contra este stack, para escribir la suite de tests, los
tres refactors de inyección de dependencias, las etapas `test` de los dos Dockerfiles, los
pasos del `ci.yml` y la redacción de esta sección.

**Qué se decidió a mano, y no se delegó.**

- **Qué lógica testear.** La respuesta a «dónde duele un bug en esta app» —la reserva
  doble— es de negocio, no técnica, y define toda la suite.
- **El umbral: 90, sobre líneas y ramas.** La herramienta puede medir; cuánto margen es
  razonable antes de frenar es un criterio que hay que poder defender.
- **Qué entra y qué sale de la cuenta de cobertura**, y en particular la decisión de
  declarar en voz alta el caso discutible (`src/auth.ts`) en vez de dejarlo pasar.
- **Cuántos tests escribir para arreglar el #22**: uno por camino declarado, contados
  leyendo el código.

**Cómo se verificó.** Nada de lo que afirma esta sección sale de lo que la herramienta
dijo haber hecho:

- Que el umbral **frene de verdad**, corriendo vitest con un umbral por encima de la
  medición y leyendo el **código de salida** (`exit=1`), no el mensaje en pantalla.
- Que el gate **bloquee de verdad**, intentando mergear el #22 por línea de comandos y
  recibiendo el rechazo de GitHub (`the base branch policy prohibits the merge`), igual
  que se había hecho en el TP4.
- Que los tests corran **adentro del contenedor** y no solo en la máquina, leyendo del log
  de la corrida las líneas `Tests 57 passed` y la tabla de cobertura del paso
  `Correr los tests del frontend con coverage`.
- Que los números del contenedor **coincidan** con los locales: 100 / 98,83 en el backend
  y 100 / 98,48 en el frontend, iguales de los dos lados.
- Que las ramas sin cubrir fueran realmente inalcanzables, **probando entradas concretas**
  (`"25/09/2026"`, `""`, `"2026-13-45"`) y viendo que las tres caen en el control anterior.
- Que la versión de cada action existiera, consultando los tags por la API de GitHub antes
  de pushear.
- Que la etapa `test` no quedara última en ningún Dockerfile, leyendo el orden de los
  `FROM` de los dos archivos.
- Que el refactor no rompiera la aplicación real: los tests pasan igual si el cableado
  quedó mal, porque le pasan el doble a mano.

**Sobre los tests que escribió la IA, que es lo que este práctico pide poder defender.**
Cada assert de la suite comprueba una regla concreta y casi todos están puestos **sobre un
borde**: el `toContain("120")` del mensaje de duración existe porque un rechazo que no
explica el límite obliga al usuario a adivinarlo; el `not.toHaveBeenCalled()` de
`crear-reserva.test.ts` no mira un valor devuelto sino que **la regla frenó la escritura**;
el `toHaveBeenCalledWith` de `http.test.ts` comprueba que la cookie de sesión se reenvía,
porque si algún día deja de hacerlo el usuario ve su listado vacío en vez de un error.

**Y qué NO está cubierto, que es la otra mitad de la pregunta**: la concurrencia. Dos
pedidos simultáneos para el mismo horario pasan los dos la validación de solapamiento y
crean dos reservas superpuestas, porque la consulta y el `create` no están en una
transacción y la base no tiene una restricción que lo impida. **Ningún unit test puede
atrapar eso** —es una carrera entre dos procesos, no una regla mal escrita— y mi cobertura
del 100 % no dice absolutamente nada al respecto. Es el mejor ejemplo propio de por qué el
número no es un certificado de que el código funciona.
