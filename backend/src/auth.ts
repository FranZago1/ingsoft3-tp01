// Helper ÚNICO de autenticación del backend. Todo lo que sea password, token o
// sesión pasa por acá; las rutas no saben de bcrypt ni de jsonwebtoken.
// - Passwords: hash con bcrypt (bcryptjs).
// - Sesión: JWT firmado con jsonwebtoken, guardado en una cookie httpOnly de 24 h.
import type { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "./prisma";
import { getJwtSecret } from "./env";
import { noAutenticado } from "./http";
import type { Rol } from "@prisma/client";

export const COOKIE_NAME = "token";
const EXPIRACION = "24h";
const MAX_AGE_MS = 24 * 60 * 60 * 1000;
const BCRYPT_ROUNDS = 10;

export type SessionUser = {
  id: string;
  nombre: string;
  email: string;
  rol: Rol;
};

// El payload lleva nombre y email además del id y el rol. No es un dato
// sensible (la cookie es httpOnly y el token va firmado) y le permite al layout
// SSR del frontend saber quién está logueado SIN un endpoint /me, que el
// alcance del proyecto no contempla. La autorización real nunca sale de acá:
// el backend verifica la firma y relee el usuario de la base en cada request.
type TokenPayload = {
  sub: string;
  rol: Rol;
  nombre: string;
  email: string;
};

export async function hashPassword(plano: string): Promise<string> {
  return bcrypt.hash(plano, BCRYPT_ROUNDS);
}

export async function verifyPassword(
  plano: string,
  hash: string
): Promise<boolean> {
  return bcrypt.compare(plano, hash);
}

export function signToken(user: {
  id: string;
  rol: Rol;
  nombre: string;
  email: string;
}): string {
  const payload: TokenPayload = {
    sub: user.id,
    rol: user.rol,
    nombre: user.nombre,
    email: user.email,
  };
  return jwt.sign(payload, getJwtSecret(), { expiresIn: EXPIRACION });
}

function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as TokenPayload;
  } catch {
    // Token vencido, firmado con otro secret o manipulado: no hay sesión.
    return null;
  }
}

// Parseo manual del header Cookie. Son cuatro líneas y nos evita sumar
// `cookie-parser`, una dependencia que el alcance del proyecto no contempla.
function leerCookie(req: Request, nombre: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const parte of header.split(";")) {
    const i = parte.indexOf("=");
    if (i === -1) continue;
    if (parte.slice(0, i).trim() === nombre) {
      return decodeURIComponent(parte.slice(i + 1).trim());
    }
  }
  return undefined;
}

// Escribe la cookie de sesión.
// `secure` va en false a propósito: el criterio de aceptación del TP es
// http://localhost:3000 sin TLS, y una cookie Secure sobre http es descartada
// por el navegador. Con HTTPS delante esto iría en true (ver decisiones.md).
export function setSessionCookie(res: Response, token: string): void {
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true, // inaccesible desde JavaScript → un XSS no se lleva el token
    sameSite: "lax", // mitiga CSRF básico
    secure: false,
    path: "/",
    maxAge: MAX_AGE_MS,
  });
}

// Logout = borrar la cookie (el JWT no se puede invalidar server-side).
export function clearSessionCookie(res: Response): void {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

// Devuelve el usuario actual a partir de la cookie, o null si no hay sesión.
// Va a la base para que un usuario borrado no siga teniendo sesión válida.
export async function getCurrentUser(req: Request): Promise<SessionUser | null> {
  const token = leerCookie(req, COOKIE_NAME);
  if (!token) return null;

  const payload = verifyToken(token);
  if (!payload) return null;

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) return null;

  return { id: user.id, nombre: user.nombre, email: user.email, rol: user.rol };
}

// El usuario autenticado queda en res.locals para el handler que sigue.
export function usuarioDe(res: Response): SessionUser {
  return res.locals.usuario as SessionUser;
}

// Middleware: corta con 401 si no hay sesión. Las rutas protegidas lo montan
// primero y después asumen que hay usuario.
export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const usuario = await getCurrentUser(req);
  if (!usuario) {
    noAutenticado(res);
    return;
  }
  res.locals.usuario = usuario;
  next();
}
