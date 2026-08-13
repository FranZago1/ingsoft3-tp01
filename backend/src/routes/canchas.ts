import { Router } from "express";
import { prisma } from "../prisma";
import { requireAuth } from "../auth";

// GET /api/canchas → lista de canchas (pobla el select de "nueva reserva").
// No hay ABM de canchas: solo lectura, y las carga el seed.
export const canchasRouter = Router();

canchasRouter.get("/", requireAuth, async (_req, res, next) => {
  try {
    const canchas = await prisma.cancha.findMany({ orderBy: { nombre: "asc" } });
    res.json(canchas);
  } catch (e) {
    next(e);
  }
});
