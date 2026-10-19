import * as Sentry from "@sentry/react";

// TP9 §3.5: Sentry en el navegador. Next corre este archivo en el cliente
// antes de hidratar la página: es el equivalente del Sentry.init en main.jsx
// de una SPA. El server de Next no se instrumenta: acá no hay lógica, todo
// /api/* se reenvía al backend, que tiene su propio Sentry.
//
// El DSN va escrito a propósito: el de un front no es un secreto. Sólo sirve
// para MANDAR datos a este proyecto, no para leerlos, y de todos modos viaja
// en el JavaScript que baja cualquier navegador.
Sentry.init({
  dsn: "https://52e4f0f0495e18688cf6e56af290c90a@o4512284830728192.ingest.us.sentry.io/4512284876800001",
  // La imagen es la misma en QA y PROD: el sitio dice de qué entorno vino.
  environment: window.location.hostname,
  // En la máquina de desarrollo no se manda nada.
  enabled: window.location.hostname !== "localhost",
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 1.0,
});
