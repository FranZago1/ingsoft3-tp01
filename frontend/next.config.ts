import type { NextConfig } from "next";
import path from "node:path";

// El frontend NO tiene lógica de negocio ni habla con la base: todo /api/*
// se reenvía al backend. Ese reenvío cumple el mismo rol que el proxy nginx
// de una SPA, pero acá no hace falta nginx porque el front es SSR y ya tiene
// un server Node propio que puede proxear (ver decisiones.md).
//
// OJO: el reenvío NO está acá, está en src/middleware.ts. El `rewrites()` de
// este archivo se resuelve en tiempo de BUILD —el destino queda horneado en
// .next/routes-manifest.json— y eso ataría la imagen a un backend fijo. El
// middleware lee BACKEND_URL en cada pedido. El motivo largo está en
// src/middleware.ts y en decisiones.md.
const nextConfig: NextConfig = {
  // Empaqueta el server de Next y SOLO las dependencias que realmente usa en
  // .next/standalone, con un server.js listo para `node server.js`. Es lo que
  // permite que la imagen final no lleve node_modules entero ni el código
  // fuente: sin esto, la etapa final tendría que ser un `npm ci` completo.
  output: "standalone",

  // Anclamos la raíz del proyecto a esta carpeta. Si no, Next la infiere
  // buscando lockfiles hacia arriba y puede elegir un directorio padre (por
  // ejemplo el home del usuario), lo que ensucia el build con advertencias.
  outputFileTracingRoot: path.join(__dirname),
};

export default nextConfig;
