import { Router } from "express";
import type { Prisma, Reserva } from "@prisma/client";
import { prisma } from "../prisma";
import { requireAuth, usuarioDe } from "../auth";
import { validarNuevaReserva, puedeAcceder, cambiarEstado } from "../services/reservas";
import type { EstadoReserva, ReservaDominio } from "../services/tipos";
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

// Rango [día 00:00, día+1 00:00) para filtrar por fecha. Devuelve null si el
// string no es una fecha válida.
function rangoDelDia(fecha: string): { desde: Date; hasta: Date } | null {
  const desde = new Date(`${fecha}T00:00:00`);
  if (isNaN(desde.getTime())) return null;
  const hasta = new Date(desde);
  hasta.setDate(hasta.getDate() + 1);
  return { desde, hasta };
}

const INCLUDE_DETALLE = {
  cancha: true,
  usuario: { select: { nombre: true, email: true } },
} as const;

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
    const { canchaId, fecha, horaInicio, horaFin } = req.body ?? {};

    if (!canchaId || !fecha || !horaInicio || !horaFin) {
      return pedidoInvalido(
        res,
        "Faltan datos: canchaId, fecha, horaInicio, horaFin."
      );
    }

    const inicio = new Date(`${fecha}T${horaInicio}:00`);
    const fin = new Date(`${fecha}T${horaFin}:00`);
    if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
      return pedidoInvalido(res, "Fecha u hora con formato inválido.");
    }

    const cancha = await prisma.cancha.findUnique({ where: { id: canchaId } });
    if (!cancha) return pedidoInvalido(res, "La cancha no existe.");

    const rango = rangoDelDia(fecha);
    if (!rango) return pedidoInvalido(res, "El parámetro fecha es inválido.");

    // Traemos las reservas de esa cancha ese día y la regla de solapamiento la
    // decide el servicio puro. La consulta la hace la ruta; la regla, el servicio.
    // Alcanza con el día porque el horario permitido (08:00–23:00) y la duración
    // máxima (120 min) hacen imposible que una reserva cruce la medianoche.
    const existentes = await prisma.reserva.findMany({
      where: { canchaId, inicio: { gte: rango.desde, lt: rango.hasta } },
    });

    // Reglas 1, 2 y 3 juntas. `ahora` se inyecta para poder testear sin reloj real.
    const validacion = validarNuevaReserva(
      { inicio, fin, canchaId },
      existentes.map(aDominio),
      new Date()
    );
    if (!validacion.ok) return reglaViolada(res, validacion.error);

    const reserva = await prisma.reserva.create({
      data: {
        fecha: rango.desde,
        inicio,
        fin,
        estado: "pendiente",
        usuarioId: usuario.id,
        canchaId,
      },
      include: INCLUDE_DETALLE,
    });

    return res.status(201).json(reserva);
  } catch (e) {
    return next(e);
  }
});

const ESTADOS_ACEPTADOS: EstadoReserva[] = ["confirmada", "cancelada"];

// PATCH /api/reservas/:id/estado  { estado: "confirmada" | "cancelada" }
reservasRouter.patch("/:id/estado", async (req, res, next) => {
  try {
    const usuario = usuarioDe(res);
    const nuevo = req.body?.estado as EstadoReserva | undefined;

    if (!nuevo || !ESTADOS_ACEPTADOS.includes(nuevo)) {
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
