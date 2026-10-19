import * as Sentry from "@sentry/node";

// TP9: Sentry tiene que arrancar ANTES de que se cargue Express. Mide los
// pedidos «envolviendo» los módulos cuando se importan; si Express ya estaba
// cargado, los errores llegan igual pero las demoras y el uso por ruta no.
// Por eso es el primer import de index.ts, y por eso vive en su propio archivo.
//
// El DSN llega por el entorno y sólo está en el servicio de PROD de Render.
// Sin SENTRY_DSN (local, tests, QA) Sentry.init no manda nada y la app anda
// igual.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.SENTRY_ENVIRONMENT || "production",
  release: process.env.APP_COMMIT,   // el commit horneado en la imagen: qué versión falló
  tracesSampleRate: 1.0,             // medir todos los pedidos: con este tráfico sobra cuota
});
