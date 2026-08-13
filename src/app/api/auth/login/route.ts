import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signToken, setSessionCookie } from "@/lib/auth";
import { validarLogin } from "@/lib/services/auth";
import { pedidoInvalido } from "@/lib/http";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body) return pedidoInvalido("Body inválido.");

  const { email, password } = body;

  const validacion = validarLogin({ email, password });
  if (!validacion.ok) return pedidoInvalido(validacion.error);

  const user = await prisma.user.findUnique({ where: { email } });
  // Mensaje genérico para no filtrar si el email existe o no.
  if (!user || !(await verifyPassword(password, user.password))) {
    return NextResponse.json(
      { error: "Email o contraseña incorrectos." },
      { status: 401 }
    );
  }

  const token = signToken(user);
  await setSessionCookie(token);

  return NextResponse.json({
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    rol: user.rol,
  });
}
