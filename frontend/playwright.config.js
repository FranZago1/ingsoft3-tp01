// Playwright corre las DOS suites del TP7, cada una contra el entorno
// desplegado (QA), nunca contra un doble:
//   e2e/api.spec.js       integración: pedidos HTTP a la api, sin navegador
//   e2e/reservas.spec.js  e2e: un navegador de verdad usando el front
// Cada job del pipeline corre la suya por nombre de archivo.
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  // Tope de CADA test. Generoso por el free tier de Render: un servicio
  // dormido tarda en despertar. En el pipeline el smoke de deploy-qa ya lo
  // despertó; corriendo a mano contra un QA dormido, despertalo antes.
  timeout: 60_000,
  // Tope de CADA aserción (no hereda el de arriba; el default es 5 s). Las
  // aserciones esperan solas hasta acá: ningún sleep en los specs.
  expect: { timeout: 15_000 },
  // Las suites comparten la base de QA y el usuario jugador: en serie, para
  // que dos tests nunca se pisen entre sí.
  workers: 1,
  use: {
    // El FRONT. La api tiene la suya, API_BASE_URL, que lee api.spec.js.
    baseURL: process.env.E2E_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry", // la traza se graba en el retry de un fallo
    screenshot: "only-on-failure",
  },
  // Un retry absorbe una demora suelta de la red. Un test que pasa recién en
  // el retry sale «flaky» en el reporte, con la corrida verde: hay que mirarlo.
  retries: 1,
  reporter: [["html", { open: "never" }], ["list"]],
});
