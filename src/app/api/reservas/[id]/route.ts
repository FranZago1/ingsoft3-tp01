import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { puedeAcceder } from "@/lib/services/reservas";
import { noAutenticado, noEncontrado, sinPermiso } from "@/lib/http";

// GET /api/reservas/:id → detalle (solo dueño o admin).
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getCurrentUser();
  if (!user) return noAutenticado();

  const { id } = await params;
  const reserva = await prisma.reserva.findUnique({
    where: { id },
    include: { cancha: true, usuario: { select: { nombre: true, email: true } } },
  });
  if (!reserva) return noEncontrado();

  // Regla 6: acceso ajeno → 403.
  if (!puedeAcceder(user, reserva)) return sinPermiso();

  return NextResponse.json(reserva);
}
