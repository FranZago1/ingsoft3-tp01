import { Router } from "express";
import { prisma } from "../prisma";

// SIN auth: los usan el HEALTHCHECK del Dockerfile, el depends_on del compose
// y el smoke test del pipeline (TP6).
export const healthRouter = Router();

// Qué commit está corriendo. En Render lo pone la plataforma
// (RENDER_GIT_COMMIT, el commit que construyó); en la imagen que publica el
// pipeline viene horneado como APP_COMMIT. El smoke lo compara con el commit
// que acaba de desplegar: sin esto, un smoke verde puede ser la versión VIEJA
// contestando mientras Render todavía construye la nueva.
function commitEnEjecucion(): string {
  return process.env.RENDER_GIT_COMMIT || process.env.APP_COMMIT || "desconocido";
}

// GET /api/health → { status, commit }
// No toca la base a propósito: es el chequeo de «el proceso está vivo» que el
// HEALTHCHECK corre cada 10 s, y no tiene que despertar a Neon cada vez.
healthRouter.get("/", (_req, res) => {
  res.json({ status: "ok", commit: commitEnEjecucion() });
});

// GET /api/health/db → { status, canchas }
// Éste SÍ toca la base, y contra una tabla real: un `SELECT 1` pasaría con la
// base vacía, y lo que el smoke necesita saber es que las migraciones y el
// seed corrieron contra la base de ESTE entorno.
healthRouter.get("/db", async (_req, res) => {
  try {
    const canchas = await prisma.cancha.count();
    res.json({ status: "ok", canchas });
  } catch (e) {
    console.error("[health/db]", e);
    res.status(503).json({ status: "error", error: "La base no responde." });
  }
});
