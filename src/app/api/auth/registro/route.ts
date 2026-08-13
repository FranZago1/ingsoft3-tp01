import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword, signToken, setSessionCookie } from "@/lib/auth";
import { validarRegistro } from "@/lib/services/auth";
import { pedidoInvalido, reglaViolada } from "@/lib/http";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return pedidoInvalido("Body inválido.");

  const { nombre, email, password } = body;

  // Regla 7: validación pura (email válido, password >= 8, nombre presente).
  const validacion = validarRegistro({ nombre, email, password });
  if (!validacion.ok) return reglaViolada(validacion.error);

  // Unicidad de email contra la DB.
  const existente = await prisma.user.findUnique({ where: { email } });
  if (existente) return reglaViolada("Ya existe un usuario con ese email.");

  const user = await prisma.user.create({
    data: {
      nombre,
      email,
      password: await hashPassword(password),
      rol: "jugador",
    },
  });

  const token = signToken(user);
  await setSessionCookie(token);

  return NextResponse.json(
    { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol },
    { status: 201 }
  );
}
