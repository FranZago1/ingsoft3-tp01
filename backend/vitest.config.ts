import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      // `json-summary` no es decorativo: deja un coverage-summary.json con los
      // totales, y es el archivo que el pipeline lee para armar la tabla del
      // Summary. Sin él, ese paso falla.
      reporter: ["text", "html", "lcov", "json-summary"],

      // QUÉ ENTRA EN LA CUENTA. Se incluye todo `src` y se excluye a mano lo
      // que no tiene reglas: así un archivo nuevo entra solo a la medición. Al
      // revés —listar lo que sí entra— lo que uno se olvide de nombrar nace
      // invisible para el umbral, y un control que falla hacia el número alto
      // no es un control. El porqué de cada exclusión está en decisiones.md.
      include: ["src/**"],
      exclude: [
        "src/index.ts", // el arranque: si está mal, la app no levanta
        "src/app.ts", // cableado de Express, sin reglas
        "src/prisma.ts", // infraestructura
        "src/env.ts", // configuración
        "src/http.ts", // mapeo Resultado → código HTTP
        "src/auth.ts", // bcrypt, JWT y cookies: librerías de terceros
        "src/routes/**", // pegamento: parsea, delega, responde
        "src/services/tipos.ts", // tipos sin comportamiento
        "**/*.test.ts",
      ],

      // El umbral. Va sobre las DOS métricas: línea sola es la más generosa,
      // y las ramas son las que de verdad dicen si los caminos se recorrieron.
      thresholds: { lines: 90, branches: 90 },
    },
  },
});
