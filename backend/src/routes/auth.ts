import { Router } from "express";
import { prisma } from "../prisma";
import {
  hashPassword,
  verifyPassword,
  signToken,
  setSessionCookie,
  clearSessionCookie,
} from "../auth";
import { validarRegistro, validarLogin } from "../services/auth";
import { pedidoInvalido, reglaViolada } from "../http";

// Handlers finitos: parsean, llaman al servicio, mapean a HTTP. Cero lógica
// de negocio (esa vive en ../services/auth.ts y no sabe de Express).
export const authRouter = Router();

// POST /api/auth/registro
authRouter.post("/registro", async (req, res, next) => {
  try {
    const { nombre, email, password } = req.body ?? {};

    // Regla 7: nombre presente, email válido, password de mínimo 8 caracteres.
    const validacion = validarRegistro({ nombre, email, password });
    if (!validacion.ok) return reglaViolada(res, validacion.error);

    // La otra mitad de la regla 7 (email único) necesita la base.
    const existente = await prisma.user.findUnique({ where: { email } });
    if (existente) return reglaViolada(res, "Ya existe un usuario con ese email.");

    // Todo el que se registra es jugador. No hay alta de admins por la API:
    // el único admin lo crea el seed.
    const user = await prisma.user.create({
      data: {
        nombre,
        email,
        password: await hashPassword(password),
        rol: "jugador",
      },
    });

    setSessionCookie(res, signToken(user));

    return res.status(201).json({
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
    });
  } catch (e) {
    return next(e);
  }
});

// POST /api/auth/login
authRouter.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body ?? {};

    const validacion = validarLogin({ email, password });
    if (!validacion.ok) return pedidoInvalido(res, validacion.error);

    const user = await prisma.user.findUnique({ where: { email } });
    // Mismo mensaje si el email no existe o si la password está mal: no le
    // decimos a un atacante qué emails están registrados.
    if (!user || !(await verifyPassword(password, user.password))) {
      return res.status(401).json({ error: "Email o contraseña incorrectos." });
    }

    setSessionCookie(res, signToken(user));

    return res.json({
      id: user.id,
      nombre: user.nombre,
      email: user.email,
      rol: user.rol,
    });
  } catch (e) {
    return next(e);
  }
});

// POST /api/auth/logout → borrar la cookie. Sin refresh tokens, sin lista de
// revocación: el token vence solo a las 24 h.
authRouter.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});
