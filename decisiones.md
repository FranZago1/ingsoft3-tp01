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

El proyecto lo lleva **una sola persona**, así que el límite tiene que responder a
cuántas cosas puede tener realmente en curso: más de dos significa que ninguna avanza,
solo se acumulan a medio hacer.

No es 1 porque el flujo tiene bloqueos legítimos que no dependen de mí: un PR esperando
que termine el CI, una imagen construyéndose. Con límite 1 quedaría formalmente
impedido de empezar nada mientras espero. Con 2 hay margen para eso y no para el
multitasking.

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

### Uso de IA — TP3

**Qué se hizo con asistencia de IA (Claude Code).** La creación de labels, épica,
historia, tareas y bug por `gh`, el armado de la jerarquía con `--add-sub-issue`, el
esqueleto del workflow de CI con su PR, y la redacción de esta sección.

**Qué es mío y hay que poder defender.** Las dos decisiones que el TP pide justificar
—duración del sprint y límite de WIP— y el diagnóstico de la historia mal escrita.
Ninguna de las tres sale de la guía: son criterio propio.

**Cómo se verificó.** La jerarquía se comprobó consultando `subIssuesSummary` por API
(la épica reporta 1 sub-issue y la historia 2), no mirando la pantalla; la visibilidad
pública del proyecto, leyendo el campo `public` del propio Project; y el enlace del PR
con su issue, con `closingIssuesReferences`, que confirma que el PR apunta a `main` y
cierra el issue #9 y no otro.
