import express, { type Request, type Response, type NextFunction } from "express";
import * as Sentry from "@sentry/node";
import { healthRouter } from "./routes/health";
import { authRouter } from "./routes/auth";
import { reservasRouter } from "./routes/reservas";
import { canchasRouter } from "./routes/canchas";

// Arma la app de Express y monta los routers. NO llama a listen: eso lo hace
// index.ts. Así la app se puede montar en un test de integración sin abrir un
// puerto, y el arranque del proceso queda separado de la definición de rutas.
export function createApp() {
  const app = express();

  // Confiamos en el proxy (el rewrite de Next) para req.ip / X-Forwarded-*.
  app.set("trust proxy", true);
  app.use(express.json());

  app.use("/api/health", healthRouter);
  app.use("/api/auth", authRouter);
  app.use("/api/reservas", reservasRouter);
  app.use("/api/canchas", canchasRouter);

  // TP9 §3.5: endpoint de prueba para ver un error llegar a Sentry.
  // TEMPORAL: se saca antes de cerrar el práctico.
  app.get("/api/falla", () => {
    throw new Error("Falla de prueba del TP9");
  });

  // 404 con la misma forma { error } que el resto.
  app.use((_req, res) => {
    res.status(404).json({ error: "No existe." });
  });

  // TP9: Sentry ve la excepción antes que nuestro handler. Tiene que ir
  // después de las rutas y antes del handler propio, que es el que responde.
  // Sin DSN no manda nada.
  Sentry.setupExpressErrorHandler(app);

  // Cualquier excepción termina acá: se loguea el detalle en el servidor y al
  // cliente le llega un JSON, nunca el stack en HTML que devuelve Express.
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[error]", err);
    res.status(500).json({ error: "Error interno del servidor." });
  });

  return app;
}
