import type { NextConfig } from "next";
import path from "node:path";

// El frontend NO tiene lógica de negocio ni habla con la base: todo /api/*
// se reenvía al backend. Este rewrite cumple el mismo rol que el proxy nginx
// de una SPA, pero acá no hace falta nginx porque el front es SSR y ya tiene
// un server Node propio que puede proxear (ver decisiones.md).
const nextConfig: NextConfig = {
  // server.js autocontenido: imagen Docker mucho más chica.
  output: "standalone",

  // Anclamos la raíz del tracing a esta carpeta. Si no, Next la infiere
  // buscando lockfiles hacia arriba y puede elegir un directorio padre, lo que
  // cambia la estructura de .next/standalone y rompe el COPY del Dockerfile.
  outputFileTracingRoot: path.join(__dirname),

  async rewrites() {
    // BACKEND_URL la inyecta el compose (http://backend:8080). El default es
    // para desarrollo local con el backend nativo.
    const backend = process.env.BACKEND_URL ?? "http://localhost:8080";
    return [
      {
        source: "/api/:path*",
        destination: `${backend}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
