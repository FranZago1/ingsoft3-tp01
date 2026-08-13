import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { validarNuevaReserva } from "@/lib/services/reservas";
import type { ReservaDominio } from "@/lib/services/tipos";
import { noAutenticado, pedidoInvalido, reglaViolada } from "@/lib/http";
import type { Reserva } from "@prisma/client";

// Mapea una Reserva de Prisma al tipo de dominio del servicio.
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

// GET /api/reservas?fecha=&canchaId=  → propias.
// Si admin y ?todas=true → todas.
export async function GET(req: Request) {
  const user = await getCurrentUser();
  if (!user) return noAutenticado();

  const { searchParams } = new URL(req.url);
  const fecha = searchParams.get("fecha");
  const canchaId = searchParams.get("canchaId");
  const todas = searchParams.get("todas") === "true";

  const where: Record<string, unknown> = {};

  // Autorización: un jugador solo ve las suyas. Admin con ?todas=true ve todas.
  if (!(todas && user.rol === "admin")) {
    where.usuarioId = user.id;
  }

  if (canchaId) where.canchaId = canchaId;
  if (fecha) {
    // Filtra por día: [fecha 00:00, fecha+1 00:00).
    const desde = new Date(`${fecha}T00:00:00`);
    const hasta = new Date(desde);
    hasta.setDate(hasta.getDate() + 1);
    if (!isNaN(desde.getTime())) {
      where.inicio = { gte: desde, lt: hasta };
    }
  }

  const reservas = await prisma.reserva.findMany({
    where,
    orderBy: { inicio: "asc" },
    include: { cancha: true, usuario: { select: { nombre: true, email: true } } },
  });

  return NextResponse.json(reservas);
}

// POST /api/reservas → crea una reserva propia (estado pendiente).
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return noAutenticado();

  const body = await req.json().catch(() => null);
  if (!body) return pedidoInvalido("Body inválido.");

  const { canchaId, fecha, horaInicio, horaFin } = body;
  if (!canchaId || !fecha || !horaInicio || !horaFin) {
    return pedidoInvalido("Faltan datos: canchaId, fecha, horaInicio, horaFin.");
  }

  const inicio = new Date(`${fecha}T${horaInicio}:00`);
  const fin = new Date(`${fecha}T${horaFin}:00`);
  if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
    return pedidoInvalido("Fecha u hora con formato inválido.");
  }

  const cancha = await prisma.cancha.findUnique({ where: { id: canchaId } });
  if (!cancha) return pedidoInvalido("La cancha no existe.");

  // Reservas ya existentes de esa cancha (datos ya consultados → servicio puro).
  const existentes = await prisma.reserva.findMany({ where: { canchaId } });

  const validacion = validarNuevaReserva(
    { inicio, fin, canchaId },
    existentes.map(aDominio),
    new Date()
  );
  if (!validacion.ok) return reglaViolada(validacion.error);

  const fechaDia = new Date(`${fecha}T00:00:00`);
  const reserva = await prisma.reserva.create({
    data: {
      fecha: fechaDia,
      inicio,
      fin,
      estado: "pendiente",
      usuarioId: user.id,
      canchaId,
    },
  });

  return NextResponse.json(reserva, { status: 201 });
}
