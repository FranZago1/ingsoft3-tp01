# decisiones.md — ReservaPadel

Este documento explica el **porqué** de cada decisión técnica, en lenguaje simple.
Es material de estudio para la defensa oral: está escrito para una persona, no como
changelog. Si en la defensa preguntan "¿por qué X?", la respuesta está acá.

Por ahora cubre **la aplicación**. Las decisiones de contenedores, CI y despliegue se
agregan cuando se hagan esos TPs, cada una en su propia sección.

---

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
la materia. **El foco no es la app: es cómo se entrega la app.**

---

## Arquitectura

### ¿Por qué dos servicios y no un Next.js fullstack?

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

### ¿Por qué rewrites de Next y no nginx?

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

### ¿Cómo hacen las páginas SSR para pedirle datos al backend?

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

### ¿Por qué las reglas de negocio están separadas de Express?

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

### ¿Por qué `app.ts` está separado de `index.ts`?

`app.ts` arma la aplicación de Express y la devuelve; `index.ts` es el único que llama a
`listen()`. Así un test de integración futuro puede montar la app **sin ocupar un
puerto** ni dejar procesos colgados. Es una línea de separación que no cuesta nada y
habilita una categoría entera de tests.

### ¿Por qué se duplican las validaciones en el frontend?

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
invalidar un token antes de que expire. Se acepta porque la expiración es corta (24 h) y
no hay refresh tokens.

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

Porque toda la app corre hoy sobre **http**, sin TLS. Una cookie marcada `Secure` solo
viaja por HTTPS: algunos navegadores (Safari, entre ellos) la descartan directamente
sobre http, y el login quedaría roto.

Estaba atado a `NODE_ENV === "production"`, lo cual es una trampa: cualquier despliegue
que use `NODE_ENV=production` sobre http rompe el login sin avisar. Se dejó explícito en
`false` con un comentario. **En un despliegue real con HTTPS delante esto va en `true`**,
y es lo primero que hay que cambiar.

### ¿Por qué bcrypt para las contraseñas?

Nunca se guarda la contraseña en texto plano. bcrypt es un hash **lento y con salt
incorporado**, diseñado contra fuerza bruta: aunque se filtre la base, romper los hashes
es caro. Un hash genérico rápido (MD5/SHA) sería inseguro justamente por ser rápido.

### ¿Por qué `bcryptjs` y no el paquete nativo `bcrypt`?

Mismo algoritmo, pero `bcryptjs` es **JavaScript puro, sin binarios nativos**. El paquete
`bcrypt` se compila con node-gyp (python, make, g++), lo que lo vuelve más lento y más
frágil de instalar, sobre todo en imágenes base mínimas donde no hay binarios prearmados.
`bcryptjs` no necesita toolchain: instalar es siempre igual de rápido y reproducible.

### ¿Por qué no se usó `cookie-parser`?

Leer una cookie del header es un `split` de cuatro líneas (`backend/src/auth.ts`, función
`leerCookie`). Sumar una dependencia para eso agranda el árbol de paquetes y la
superficie a auditar sin ganar nada. Menos dependencias es menos que puede romperse y
menos advisories que revisar.

### ¿Por qué `JWT_SECRET` es obligatoria y la app falla sin ella?

Si el secret no está, firmar y verificar tokens no tiene sentido y sería un agujero de
seguridad silencioso. Preferimos **fallar temprano y ruidosamente**: `assertEnv()` se
ejecuta en `index.ts` **antes** del `listen()`, así que el proceso muere con un mensaje
claro en vez de quedar levantado y explotar recién en el primer login.

---

## Configuración

### ¿Por qué todo por variables de entorno?

El **mismo código** tiene que correr en local, en QA y en producción sin recompilar ni
tocar nada, apuntando a bases distintas. `DATABASE_URL` es la única fuente de conexión
(prohibido duplicarla o hardcodearla). Cambiar de entorno = cambiar variables.

### ¿Por qué la password de Postgres entra por `${DB_PASSWORD}` desde un `.env`?

Porque **los secretos no se commitean**. El `.env` está en `.gitignore`; lo que sí se
versiona es `.env.example`, que documenta qué variables hacen falta y con qué forma, con
valores de ejemplo. La sintaxis `${DB_PASSWORD:?mensaje}` hace que levantar la base falle
al instante con un mensaje entendible si la variable no está, en vez de arrancar Postgres
con una password vacía.

### La app trabaja en hora local, y eso hay que saberlo

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

## Dependencias y seguridad

### ¿Por qué se actualizó Next de 15.1.6 a 15.5.23?

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

## Problemas encontrados durante la implementación

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

## Uso de IA

**Declaración obligatoria.** Este proyecto fue desarrollado con asistencia de **Claude
Code** (Anthropic). Ocultarlo o minimizarlo no sería defendible, así que se detalla qué
hizo la IA y —más importante— **cómo se verificó cada cosa**.

### Qué se hizo con asistencia de IA

| Parte | Rol de la IA | Cómo se verificó |
| --- | --- | --- |
| Reestructuración a dos proyectos | Movió los archivos y adaptó los handlers de Next a Express | `npm run build` y `tsc --noEmit` en ambos; `grep -ri prisma frontend/src` sin resultados |
| Reglas de negocio (`services/`) | Escritas con asistencia, **movidas sin cambios** en la reestructuración | 18 casos probados por HTTP contra la app levantada |
| Auth (bcrypt, JWT, cookie) | Portada de `next/headers` a `req`/`res` de Express | Login, logout, 401 sin cookie, 403 ajeno, `Set-Cookie` inspeccionado con `curl -i` |
| Pantallas | Adaptadas para consumir la API en vez de Prisma | Renderizadas y verificadas con la app corriendo |
| Este documento | Redactado con asistencia | Revisado y contrastado contra el código real |

### Hallazgos de la IA que hubo que evaluar (no aceptar a ciegas)

Tres de los problemas de la lista de arriba (zona horaria, cookie `Secure`,
`outputFileTracingRoot`) los detectó la IA, pero **ninguno se aceptó sin comprobarlo**:
la zona horaria se verificó viendo que una reserva de las 15:00 se guarda como `18:00Z`,
que es 15:00 en UTC−3, y el resto se comprobó levantando la app y ejercitando el flujo
real.

### Qué NO hizo la IA

No tomó las decisiones de alcance ni de arquitectura: qué pantallas hay, cuáles son las
7 reglas, dos servicios en vez de uno, y los criterios de entrega salieron de la consigna
de la cátedra.

### Postura

La IA se usó como un par que escribe rápido y propone; **la verificación fue siempre por
evidencia ejecutable** (builds, `curl` contra la app real), nunca "quedó lindo, va".
