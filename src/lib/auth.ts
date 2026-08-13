// Helper único de autenticación. Los route handlers protegidos lo usan.
// - Hash de passwords con bcrypt (bcryptjs).
// - JWT firmado con jsonwebtoken, guardado en cookie httpOnly.
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma";
import { getJwtSecret } from "./env";
import type { Rol } from "@prisma/client";

export const COOKIE_NAME = "token";
const EXPIRACION = "24h";

export type SessionUser = {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
};

type TokenPayload = {
  sub: string;
  rol: Rol;
};

export async function hashPassword(plano: string): Promise<string> {
  return bcrypt.hash(plano, 10);
}

export async function verifyPassword(
  plano: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plano, hash);
}

export function signToken(user: { id: string; rol: Rol }): string {
  const payload: TokenPayload = { sub: user.id, rol: user.rol };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: EXPIRACION });
}

function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as TokenPayload;
  } catch {
    return null;
  }
}

// Escribe la cookie httpOnly con el token (24 h).
export async function setSessionCookie(token: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24, // 24 h
  });
}

// Logout: borra la cookie.
export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

// Devuelve el usuario actual a partir de la cookie, o null si no hay sesión válida.
export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) return null;

  return { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
}
