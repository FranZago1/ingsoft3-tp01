import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    coverage: {
      provider: "v8",
      // `json-summary` deja el coverage-summary.json que lee el pipeline para
      // armar la tabla del Summary. Sin él, ese paso falla.
      reporter: ["text", "html", "lcov", "json-summary"],

      // QUÉ ENTRA EN LA CUENTA: la carpeta donde vive la lógica. Las páginas y
      // los componentes quedan afuera a propósito —son UI, y se verifican de
      // punta a punta en el TP7—; adentro de src/lib quedan afuera los tipos
      // (no tienen comportamiento) y los dos archivos que son solo pegamento
      // con next/headers. El porqué de cada uno está en decisiones.md.
      include: ["src/lib/**"],
      exclude: [
        "src/lib/tipos.ts", // tipos sin comportamiento
        "src/lib/api.ts", // pegamento: lee la cookie y delega en http.ts
        "src/lib/sesion.ts", // pegamento: lee la cookie y delega en token.ts
        "**/*.test.ts",
      ],

      // El umbral, sobre las DOS métricas.
      thresholds: { lines: 90, branches: 90 },
    },
  },
});
