import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { puedeAcceder, cambiarEstado } from "@/lib/services/reservas";
import type { EstadoReserva } from "@/lib/services/tipos";
import {
  noAutenticado,
  noEncontrado,
  sinPermiso,
  pedidoInvalido,
  reglaViolada,
} from "@/lib/http";

const ESTADOS_VALIDOS: EstadoReserva[] = ["confirmada", "cancelada"];

// PATCH /api/reservas/:id/estado  { estado: "confirmada" | "cancelada" }
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return noAutenticado();

  const { id } = await params;
  const body = await req.json().catch(() => null);
  const nuevo = body?.estado as EstadoReserva | undefined;

  if (!nuevo || !ESTADOS_VALIDOS.includes(nuevo)) {
    return pedidoInvalido('estado debe ser "confirmada" o "cancelada".');
  }

  const reserva = await prisma.reserva.findUnique({ where: { id } });
  if (!reserva) return noEncontrado();

  // Regla 6: acceso ajeno → 403.
  if (!puedeAcceder(user, reserva)) return sinPermiso();

  // Reglas 4 y 5: transición válida + cancelación de confirmada hasta 2h antes.
  const resultado = cambiarEstado(reserva, nuevo, new Date());
  if (!resultado.ok) return reglaViolada(resultado.error);

  const actualizada = await prisma.reserva.update({
    where: { id },
    data: { estado: nuevo },
  });

  return NextResponse.json(actualizada);
}
