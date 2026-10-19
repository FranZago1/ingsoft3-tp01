# Postmortem: un deploy a PROD trabado 35 minutos por una aprobación olvidada — 2026-10-19

> Blameless: describe qué permitió el sistema, no quién se equivocó. Horas en UTC-3.

## Resumen

El cambio que agregaba Sentry (#36) pasó QA, integración y e2e a las 18:05:52. No llegó a PROD
hasta las 18:41:38. Durante **35 minutos** `deploy-prod` quedó esperando detrás de la corrida
CI #47 (merge del TP8, 15/10). Esa corrida seguía pidiendo aprobación hacía 4 días y tenía tomado
el grupo `concurrency: deploy-prod`. Se resolvió rechazándola.

## Impacto

- **Usuarios**: ninguno. PROD siguió sirviendo la versión anterior (`4b4f062`), sana.
- **Equipo**: un cambio verificado tardó 35 minutos de más en llegar. Mientras tanto Sentry no
  recibía nada, y eso se leyó como una falla de configuración de Sentry («no aparece nada»).
- **Riesgo latente**, el peor: la corrida vieja **seguía aprobable**. Aprobarla, sea por error o
  creyendo que era la nueva, habría desplegado en PROD un commit de hace 4 días, retrocediendo
  cambios ya en producción.

## Timeline

| Hora | Evento |
|---|---|
| 15/10 14:48 | Merge del TP8 → CI #47. `deploy-prod` queda esperando review; nadie la aprueba ni la rechaza |
| 19/10 18:00 | Merge de #36 → la corrida nueva arranca |
| 18:05:52 | e2e en verde contra QA. `deploy-prod` queda en *pending*, sin pedir review |
| 18:06–18:40 | Se «aprueba» el deploy, pero la API de GitHub muestra la corrida nueva sin aprobaciones |
| 18:06–18:40 | **Detección**: Sentry vacío; `/api/health` de PROD informa el commit viejo y `/api/falla` da 404 |
| 18:06–18:40 | **Diagnóstico**: la página de la corrida dice «waiting for deploy-prod (CI #47) to complete». La API muestra CI #47 en `waiting` desde el 15/10 |
| 18:40:20 | **Mitigación**: CI #47 rechazada |
| 18:40:48 | `deploy-prod` de la corrida nueva arranca y pide review; se aprueba |
| 18:41:38 | **Resolución**: smoke en verde, PROD corre `e7c27a4` |

## Causa raíz

¿Por qué no se desplegó? Porque `deploy-prod` esperaba el grupo de concurrencia.

¿Por qué el grupo estaba tomado? Porque una corrida que espera review de environment **ocupa el
grupo** mientras espera. Con `cancel-in-progress: false`, la nueva se encola detrás en vez de
reemplazarla.

¿Por qué había una corrida esperando hacía 4 días? Porque el proceso del TP6 para corridas viejas
era «la rechazo a mano»: una **promesa**, no un mecanismo. Ningún gate ni ninguna alerta avisa
que hay una aprobación pendiente.

¿Por qué tardamos en verlo? Porque el síntoma apareció en otro lado: «Sentry no recibe nada».
Nada del pipeline decía «PROD no tiene este commit», salvo mirar `/api/health` a mano.

**Causa raíz de sistema**: el pipeline permite que una corrida de deploy vieja quede viva, aprobable
y bloqueando a las nuevas sin plazo, y no hay ninguna señal que lo muestre.

## Acciones

| Acción | Dueño | Tipo |
|---|---|---|
| `deploy-prod` con `cancel-in-progress: true`. Una corrida nueva cancela a la vieja que espera review: ya no bloquea y **ya no se puede aprobar por error** | yo | prevención (cambio al pipeline) |
| Un *wait timer* / vencimiento corto en el environment `production`, para que una review pendiente no viva días | yo | prevención |
| Al final de cada sesión de trabajo, `gh run list --status waiting` en mi checklist de cierre de TP | yo | detección |
| En la defensa y en `decisiones.md`: «PROD no tiene mi cambio» se diagnostica primero con `/api/health` (qué commit corre), antes de sospechar de la herramienta nueva | yo | diagnóstico |

## Aprendizajes

- Una corrida que espera aprobación **no está quieta**: retiene recursos (el grupo de concurrencia)
  y sigue siendo una acción posible sobre PROD.
- El `commit` en `/api/health` (TP6) fue lo que cortó el diagnóstico en dos: no era Sentry, era que
  la versión nueva no había llegado. Una sola línea de observabilidad pagó su costo.
- El riesgo estaba escrito en `decisiones.md` desde el TP6, con su mitigación manual. Escribir un
  riesgo no lo mitiga: lo mitiga un cambio al sistema.
