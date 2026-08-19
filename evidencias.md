# Evidencias — Ingeniería de Software 3

Las pruebas de cada TP: capturas, salidas de terminal y lo que hay que mirar en
cada una. Documento único, una sección por TP.

---

## TP1 — Ramas protegidas, pull requests y conflictos

### 1. Push directo a main rechazado
![1](img/01-pushRechazado.png)
La captura muestra el experimento completo en una sola sesión de terminal: primero se modifica README.md con un echo "test", después git commit -am "test: intento de push directo" crea el commit 30c3a19 sin problema —Git local no sabe nada de reglas de GitHub— y recién en el git push aparece el conflicto.

Vale la pena leer el orden de los mensajes. Todo lo que va de Enumerating objects hasta Writing objects: 100% (3/3), 314 bytes es trabajo que sí se completó: la autenticación pasó, los permisos de escritura existen, los objetos llegaron al servidor. El freno viene después, cuando GitHub evalúa la política de la rama antes de mover la referencia:

remote: error: GH006: Protected branch update failed for refs/heads/main.
remote: - Changes must be made through a pull request.
 ! [remote rejected] main -> main (protected branch hook declined)

Es decir: no falló el push por falta de acceso, falló porque main tiene una regla que exige pull request, y esa regla se aplica incluso al dueño del repositorio, que es quien está empujando. Eso es exactamente lo que se buscaba al activar Do not allow bypassing the above settings: si el administrador pudiera pasar por arriba, la protección sería decorativa.

El commit rechazado quedó solo en la máquina local; se limpió con git reset --hard HEAD~1 y el remoto nunca lo vio.

### 2. El PR de la rama B no se puede mergear: conflicto

![2](img/02-conflictoEnPr.png)

PR #2 (feature/titulo-a). En la interfaz aparecen el indicador rojo Merge conflicts en la esquina superior derecha, el aviso This branch has conflicts that must be resolved señalando a README.md como el único archivo en disputa, y el botón Squash and merge bloqueado.

Lo interesante está en la secuencia temporal: apenas un minuto antes, GitHub marcaba este mismo PR como mergeable. Ambas ramas partieron del mismo commit de main y tocaron la misma línea, pero mientras ninguna de las dos había sido incorporada, no existía colisión alguna. El conflicto no aparece en el momento de escribir el cambio: aparece recién cuando se lo quiere integrar contra un main que ya avanzó.

### 3. Los marcadores del conflicto

![3](img/03-marcadoresConflicto.png)

Arriba de ======= está la versión de la rama actual (feature/titulo-b); abajo, la que ya vive en main tras el merge del PR #2. Sobre el bloque, GitHub ofrece los tres atajos de siempre —Accept current change | Accept incoming change | Accept both changes— y en la esquina superior derecha se lee 1 conflict en rojo: mientras quede un solo marcador en el archivo, no hay forma de darlo por resuelto.

Y lo que no está en conflicto es igual de informativo: las líneas 6 a 8 —la sección ## instalación con el git clone, que venía del PR #1— aparecen limpias, fuera del bloque marcado. Ninguna de las dos ramas las tocó, así que Git las fusionó solo, sin preguntar. El conflicto es quirúrgico: cae sobre la línea disputada, no sobre el archivo entero.

### 4. La release v1.0.0 publicada

![4](img/04-releasePublicada.png)

Release v1.0.0 con el badge Latest, apuntando al tag v1.0.0 y al commit 98f72da — la punta de main después de mergear los tres PRs. Las notas dicen qué incluye la versión escritas para que las lea una persona, e incluyen la justificación de por qué el número es 1.0.0 y no 0.1.0.

El tag se creó anotado desde la máquina (git tag -a v1.0.0 -m "..." + git push origin v1.0.0) y la release se publicó sobre ese tag ya existente. Un tag anotado es un objeto de Git con autor, fecha y mensaje propios; un tag liviano sería solo un puntero sin metadatos. Para marcar una entrega, el anotado es el que corresponde.

### 5. El `README.md` del ejercicio de conflicto

Desde el TP2 el `README.md` de la raíz documenta la aplicación. El archivo tal como
quedó al cerrar el TP1 —o sea, el resultado de haber resuelto el conflicto eligiendo
la "versión A", más la sección `## instalación` que Git fusionó sola porque ninguna
de las dos ramas la tocó— era este, y se conserva acá:

```markdown
# Proyecto IngSoft3 - versión A

## instalación
git clone https://github.com/FranZago1/ingsoft3-tp01.git
```

El historial lo respalda: `58c95ca` (PR #2) dejó el título en "versión A" y `98f72da`
(PR #3) es el merge donde se resolvió el conflicto a mano. La captura del punto 3
muestra ese mismo archivo con los marcadores todavía puestos.

---

## TP2 — Contenedores

Todas las salidas de abajo son reales, capturadas en la máquina de desarrollo (macOS,
Apple Silicon) durante el TP. Están recortadas donde el output era largo, pero no
editadas.

### 1. `docker compose up -d` desde cero y el sistema funcionando end-to-end

Arranque completo. Lo que hay que mirar es el **orden**: la base no solo arranca, se
espera a que esté sana; y el frontend espera a que el backend esté sano.

```
$ docker compose up -d --build
 Container reservapadel-db-1        Created
 Container reservapadel-backend-1   Created
 Container reservapadel-frontend-1  Created
 Container reservapadel-db-1        Starting
 Container reservapadel-db-1        Started
 Container reservapadel-db-1        Waiting
 Container reservapadel-db-1        Healthy          ← healthcheck de pg_isready
 Container reservapadel-backend-1   Starting
 Container reservapadel-backend-1   Started
 Container reservapadel-backend-1   Waiting
 Container reservapadel-backend-1   Healthy          ← healthcheck contra /api/health
 Container reservapadel-frontend-1  Starting
 Container reservapadel-frontend-1  Started
```

Estado de los tres servicios. La base **no publica puerto**: solo se la alcanza desde
la red interna.

```
$ docker compose ps
SERVICE    STATUS                    PORTS
backend    Up 20 seconds (healthy)   0.0.0.0:8080->8080/tcp
db         Up 26 seconds (healthy)   5432/tcp
frontend   Up 15 seconds (healthy)   0.0.0.0:3000->3000/tcp
```

El sistema andando de punta a punta. El login se hace **contra el puerto 3000**, o
sea recorriendo el camino real del navegador: frontend → middleware → backend → base.

```
$ curl -i -X POST http://localhost:3000/api/auth/login \
    -H 'Content-Type: application/json' \
    -d '{"email":"jugador@club.com","password":"jugador1234"}'
HTTP/1.1 200 OK
x-middleware-rewrite: http://backend:8080/api/auth/login      ← el proxy, resuelto en runtime
{"id":"cmt0hcraq0004vizhpbd3uvi2","nombre":"Jugador","email":"jugador@club.com","rol":"jugador"}

$ curl -b cookies.txt http://localhost:3000/api/canchas | jq -c 'map(.nombre)'
["Cancha 1","Cancha 2","Cancha 3"]
```

El header `x-middleware-rewrite` es la prueba de que el reenvío se resolvió contra el
nombre de servicio `backend` leyendo `BACKEND_URL` **en runtime**, y no contra un
destino horneado en el build (ver `decisiones.md`, sección del middleware).

La página SSR `/reservas` también renderiza con datos, lo que ejercita el otro camino
—server→server, sin pasar por el middleware—:

```
$ curl -b cookies.txt http://localhost:3000/reservas | grep -o 'Cancha [0-9]' | sort -u
Cancha 1
Cancha 2
Cancha 3
```

📷 *Captura sugerida para la defensa: la app en el navegador en `http://localhost:3000`,
logueada, mostrando el listado de reservas.*

### 2. Prueba de persistencia

Se creó una reserva "marcadora" además de la del seed, para poder distinguir los datos
generados por el seed de los datos creados por un usuario.

**Estado inicial** — dos reservas:

```
$ docker compose exec db psql -U padel -d padel -t -c 'select id, estado from "Reserva" order by id;'
 cmt0hepxm0001p0bkt7m5boyd | pendiente     ← creada desde la app
 seed-reserva-1            | pendiente     ← la del seed
```

**`down` (sin `-v`) + `up`** — el volumen sobrevive y los datos también:

```
$ docker compose down
 Container reservapadel-db-1  Removed
 Network reservapadel_default  Removed

$ docker volume ls | grep db_data
local     reservapadel_db_data          ← el volumen NO se borró

$ docker compose up -d && curl -s localhost:8080/api/health
{"status":"ok"}

$ docker compose exec db psql -U padel -d padel -t -c 'select id from "Reserva" order by id;'
 cmt0hepxm0001p0bkt7m5boyd     ← SIGUE
 seed-reserva-1
```

**`down -v` + `up`** — el volumen se borra y los datos se pierden:

```
$ docker compose down -v
 Volume reservapadel_db_data  Removing
 Volume reservapadel_db_data  Removed

$ docker volume ls | grep db_data
(sin resultados: el volumen ya no existe)

$ docker compose up -d && curl -s localhost:8080/api/health
{"status":"ok"}

$ docker compose exec db psql -U padel -d padel -t -c 'select id from "Reserva" order by id;'
 seed-reserva-1                ← la marcadora DESAPARECIÓ

$ docker volume inspect reservapadel_db_data --format '{{.CreatedAt}}'
2026-08-19T19:28:57Z           ← volumen recreado desde cero
```

**Cómo se lee este resultado.** En una app sin seed, después de `down -v` la lista
queda vacía. Acá no: queda `seed-reserva-1`. No es que el volumen no se haya borrado
—el `docker volume ls` intermedio lo confirma, y el volumen recreado tiene timestamp
nuevo—; es que el entrypoint del backend corre `prisma migrate deploy` y un seed
idempotente en cada arranque, así que sobre una base virgen reconstruye el esquema y
la línea base. **La prueba del borrado es que desapareció la reserva marcadora**, que
el seed no genera.

Y la app quedó usable inmediatamente después del borrado total, sin ningún comando
manual:

```
$ curl -o /dev/null -w '%{http_code}' -X POST http://localhost:3000/api/auth/login ...
200
$ curl -b cookies.txt http://localhost:3000/api/canchas | jq -c 'map(.nombre)'
["Cancha 1","Cancha 2","Cancha 3"]
```

### 3. Comparación de tamaños: imagen final vs imagen de build

Las etapas intermedias se etiquetaron a propósito (`docker build --target build -t …`)
para poder medirlas; en un build normal no quedan con nombre.

```
$ docker images
REPOSITORY                TAG            SIZE
mi-frontend               build-stage    1.13GB
mi-backend                build-stage    592MB
postgres                  15-alpine      408MB
mi-backend                dev            378MB
mi-frontend               dev            301MB
node                      20-alpine      194MB
```

| Imagen | La que **compila** | La que se **publica** | Reducción |
| --- | --- | --- | --- |
| Backend | 592 MB | **378 MB** | −214 MB (−36%) |
| Frontend | 1.13 GB | **301 MB** | −856 MB (−73%) |

El frontend se achica mucho más porque `output: "standalone"` traza qué módulos usa
realmente la app y descarta el resto de `node_modules`. El backend arrastra los
motores nativos de Prisma (~121 MB), que son necesarios en runtime porque el
entrypoint corre las migraciones.

La prueba de que el multi-stage hizo lo que dice —que no viaja el código fuente ni el
compilador a la imagen final—:

```
$ docker exec reservapadel-backend-1 ls /app
dist  docker-entrypoint.sh  node_modules  package.json  prisma
$ docker exec reservapadel-backend-1 ls /app/src
ls: /app/src: No such file or directory

$ docker exec reservapadel-frontend-1 ls /app
node_modules  package.json  public  server.js
```

Y que ninguno corre como root:

```
$ docker exec reservapadel-backend-1 whoami
node
$ docker exec reservapadel-frontend-1 whoami
node
```

⚠️ **Nota de medición.** `docker images` informa las imágenes **descargadas** por su
tamaño comprimido y las **construidas localmente** por su tamaño en disco, así que
mezclar unas con otras da una comparación falsa (una imagen recién bajada puede
figurar con menos MB que su propia imagen base). La tabla de arriba se tomó con las
cinco imágenes construidas localmente, después de borrar las bajadas del registry.

### 4. Imágenes publicadas en el registry

Publicación en ghcr.io con tag semver:

```
$ docker buildx build --provenance=false --sbom=false \
    -t ghcr.io/franzago1/reservapadel-backend:v0.1.0 --push ./backend
 pushing manifest for ghcr.io/franzago1/reservapadel-backend:v0.1.0@sha256:eaf04583cbe4… done

$ docker buildx build --provenance=false --sbom=false \
    -t ghcr.io/franzago1/reservapadel-frontend:v0.1.0 --push ./frontend
 pushing manifest for ghcr.io/franzago1/reservapadel-frontend:v0.1.0@sha256:20839f726db9… done
```

**Visibilidad pública, comprobada sin credenciales.** Que la página de GitHub diga
"Public" no prueba nada: la prueba es pedirle el manifest a ghcr sin estar logueado.

```
$ TOKEN=$(curl -s "https://ghcr.io/token?scope=repository:franzago1/reservapadel-backend:pull&service=ghcr.io" | jq -r .token)
$ curl -o /dev/null -w '%{http_code}\n' -H "Authorization: Bearer $TOKEN" \
    https://ghcr.io/v2/franzago1/reservapadel-backend/manifests/v0.1.0
200

  reservapadel-backend    HTTP 200  PÚBLICO
  reservapadel-frontend   HTTP 200  PÚBLICO
```

**`docker-compose.registry.yml` probado de verdad.** Antes de la prueba se borraron
las capas de los tres lugares donde se esconden, y se cerró la sesión del registry:

```
$ docker compose down --rmi local        # las imágenes que construyó compose
 Image reservapadel-frontend:latest  Removed
 Image reservapadel-backend:latest   Removed

$ docker rmi ghcr.io/franzago1/reservapadel-backend:v0.1.0 … mi-backend:dev mi-frontend:dev …
Deleted: sha256:2eb3f95b2a99…
Deleted: sha256:635d7370b5fc…

$ docker builder prune -af               # el cache de construcción
Total: 23.05GB                           ← el escondite que nadie ve venir

$ docker logout ghcr.io
Removing login credentials for ghcr.io
```

Y recién ahí, deslogueado y sin ninguna imagen local, se levantó el sistema desde el
registry. **Se ve la descarga capa por capa**, no `Already exists`:

```
$ docker compose -f docker-compose.registry.yml up -d
 4f4fb700ef54 Pull complete
 05aa106723b1 Pull complete
 822e61edb9e5 Pull complete
 78f8a67253b6 Pull complete
 a7bf7ab147c2 Pull complete
 a56d45c59e73 Pull complete
 backend Pulled
 Container reservapadel-db-1        Healthy
 Container reservapadel-backend-1   Healthy
 Container reservapadel-frontend-1  Started
```

La columna IMAGE confirma que está corriendo lo publicado, no algo construido local:

```
$ docker compose -f docker-compose.registry.yml ps
SERVICE    IMAGE                                            STATUS
backend    ghcr.io/franzago1/reservapadel-backend:v0.1.0    Up (healthy)
db         postgres:15-alpine                               Up (healthy)
frontend   ghcr.io/franzago1/reservapadel-frontend:v0.1.0   Up (healthy)
```

Y la app funciona end-to-end sobre esas imágenes, conservando los datos del volumen:

```
$ curl -s localhost:8080/api/health
{"status":"ok"}
$ curl -o /dev/null -w '%{http_code}\n' -X POST http://localhost:3000/api/auth/login …
200
$ curl -b cookies.txt http://localhost:3000/api/canchas | jq -c 'map(.nombre)'
["Cancha 1","Cancha 2","Cancha 3"]
```

📷 *Captura pendiente: la pestaña **Packages** del perfil de GitHub mostrando los dos
packages con la etiqueta `Public` y el tag `v0.1.0`.*

### 5. Problema encontrado al publicar (queda documentado porque cuesta diagnosticar)

El primer intento de `docker push` subió **todas** las capas y falló al final:

```
$ docker push ghcr.io/franzago1/reservapadel-backend:v0.1.0
bda5d7ef971f: Pushed
a56d45c59e73: Pushed
error from registry: unknown
```

No era el token ni los permisos: buildx adjunta un *attestation manifest* (provenance)
y ghcr rechaza ese índice. Se resolvió con `--provenance=false --sbom=false` y
publicando con `docker buildx build --push`. El detalle que confunde es que las capas
dicen `Pushed` y el error aparece recién al subir el índice.
