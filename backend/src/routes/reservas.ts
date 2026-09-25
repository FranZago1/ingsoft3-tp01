import { Router } from "express";
import type { Prisma, Reserva } from "@prisma/client";
import { prisma } from "../prisma";
import { requireAuth, usuarioDe } from "../auth";
import {
  puedeAcceder,
  cambiarEstado,
  esEstadoAceptado,
  rangoDelDia,
} from "../services/reservas";
import { crearReserva } from "../services/crear-reserva";
import type { RepositorioReservas } from "../services/crear-reserva";
import type { ReservaDominio } from "../services/tipos";
import {
  pedidoInvalido,
  sinPermiso,
  noEncontrado,
  reglaViolada,
} from "../http";

export const reservasRouter = Router();

// Todas las rutas de reservas necesitan sesión.
reservasRouter.use(requireAuth);

// Traduce una Reserva de Prisma al tipo de dominio del servicio. Es el límite
// entre "lo que sabe la base" y "lo que sabe la regla de negocio".
function aDominio(r: Reserva): ReservaDominio {
  return {
    id: r.id,
    inicio: r.inicio,
    fin: r.fin,
    estado: r.estado,
    usuarioId: r.usuarioId,
    canchaId: r.canchaId,
  };
}

const INCLUDE_DETALLE = {
  cancha: true,
  usuario: { select: { nombre: true, email: true } },
} as const;

// El repositorio que usa la APLICACIÓN REAL. Es la otra mitad de la inyección
// del servicio `crearReserva`: acá vive Prisma, y del otro lado no.
// El tipo devuelto por `guardar` es el que la ruta necesita para responder.
type ReservaConDetalle = Awaited<
  ReturnType<typeof prisma.reserva.findUniqueOrThrow>
>;

const repositorioPrisma: RepositorioReservas<ReservaConDetalle> = {
  buscarCancha: (id) => prisma.cancha.findUnique({ where: { id } }),
  reservasDelDia: async (canchaId, desde, hasta) => {
    const reservas = await prisma.reserva.findMany({
      where: { canchaId, inicio: { gte: desde, lt: hasta } },
    });
    return reservas.map(aDominio);
  },
  guardar: (datos) =>
    prisma.reserva.create({ data: datos, include: INCLUDE_DETALLE }),
};

// GET /api/reservas?fecha=&canchaId=  → las propias.
// GET /api/reservas?todas=true        → todas, solo para admin.
reservasRouter.get("/", async (req, res, next) => {
  try {
    const usuario = usuarioDe(res);
    const fecha = typeof req.query.fecha === "string" ? req.query.fecha : "";
    const canchaId =
      typeof req.query.canchaId === "string" ? req.query.canchaId : "";
    const todas = req.query.todas === "true";

    // Regla 6: pedir "todas" sin ser admin es pedir datos ajenos → 403.
    if (todas && usuario.rol !== "admin") return sinPermiso(res);

    const where: Prisma.ReservaWhereInput = {};
    if (!todas) where.usuarioId = usuario.id;
    if (canchaId) where.canchaId = canchaId;
    if (fecha) {
      const rango = rangoDelDia(fecha);
      if (!rango) return pedidoInvalido(res, "El parámetro fecha es inválido.");
      where.inicio = { gte: rango.desde, lt: rango.hasta };
    }

    const reservas = await prisma.reserva.findMany({
      where,
      orderBy: { inicio: "asc" },
      include: INCLUDE_DETALLE,
    });

    return res.json(reservas);
  } catch (e) {
    return next(e);
  }
});

// GET /api/reservas/:id → detalle. Solo el dueño o un admin.
reservasRouter.get("/:id", async (req, res, next) => {
  try {
    const usuario = usuarioDe(res);
    const reserva = await prisma.reserva.findUnique({
      where: { id: req.params.id },
      include: INCLUDE_DETALLE,
    });
    if (!reserva) return noEncontrado(res);

    // Regla 6.
    if (!puedeAcceder(usuario, reserva)) return sinPermiso(res);

    return res.json(reserva);
  } catch (e) {
    return next(e);
  }
});

// POST /api/reservas → crea una reserva propia, siempre en estado "pendiente".
reservasRouter.post("/", async (req, res, next) => {
  try {
    const usuario = usuarioDe(res);

    // Toda la decisión vive en el servicio; acá solo se elige el código HTTP.
    const resultado = await crearReserva(
      req.body ?? {},
      usuario.id,
      repositorioPrisma,
      new Date()
    );

    if (!resultado.ok) {
      return resultado.motivo === "pedido-invalido"
        ? pedidoInvalido(res, resultado.error)
        : reglaViolada(res, resultado.error);
    }

    return res.status(201).json(resultado.reserva);
  } catch (e) {
    return next(e);
  }
});

// PATCH /api/reservas/:id/estado  { estado: "confirmada" | "cancelada" }
reservasRouter.patch("/:id/estado", async (req, res, next) => {
  try {
    const usuario = usuarioDe(res);
    const nuevo = req.body?.estado;

    if (!esEstadoAceptado(nuevo)) {
      return pedidoInvalido(res, 'estado debe ser "confirmada" o "cancelada".');
    }

    const reserva = await prisma.reserva.findUnique({
      where: { id: req.params.id },
    });
    if (!reserva) return noEncontrado(res);

    // Regla 6.
    if (!puedeAcceder(usuario, reserva)) return sinPermiso(res);

    // Reglas 4 (transición válida) y 5 (confirmada: cancelable hasta 2 h antes).
    const resultado = cambiarEstado(reserva, nuevo, new Date());
    if (!resultado.ok) return reglaViolada(res, resultado.error);

    const actualizada = await prisma.reserva.update({
      where: { id: reserva.id },
      data: { estado: nuevo },
      include: INCLUDE_DETALLE,
    });

    return res.json(actualizada);
  } catch (e) {
    return next(e);
  }
});
