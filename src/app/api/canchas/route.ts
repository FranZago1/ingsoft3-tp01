import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { noAutenticado } from "@/lib/http";

// Lista de canchas (para poblar el select del formulario de nueva reserva).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return noAutenticado();

  const canchas = await prisma.cancha.findMany({ orderBy: { nombre: "asc" } });
  return NextResponse.json(canchas);
}
