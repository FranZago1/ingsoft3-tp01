import { Router } from "express";

// GET /api/health → { status: "ok" }
// SIN auth: lo usan el HEALTHCHECK del Dockerfile y el depends_on del compose.
export const healthRouter = Router();

healthRouter.get("/", (_req, res) => {
  res.json({ status: "ok" });
});
