import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Salida standalone desde el día uno: genera un server.js autocontenido
  // con solo las dependencias necesarias, ideal para una imagen Docker chica.
  output: "standalone",
};

export default nextConfig;
