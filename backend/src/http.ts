import type { Response } from "express";

// Mapeo único de errores a HTTP. Todos responden con la misma forma:
// { error: "mensaje legible" }. Así el frontend siempre sabe qué leer.

// 400: el request está mal formado (falta un campo, JSON roto).
export const pedidoInvalido = (res: Response, mensaje: string) =>
  res.status(400).json({ error: mensaje });

// 401: no hay sesión.
export const noAutenticado = (res: Response) =>
  res.status(401).json({ error: "No autenticado." });

// 403: hay sesión, pero el recurso es de otro.
export const sinPermiso = (res: Response) =>
  res.status(403).json({ error: "No tenés permiso para esto." });

// 404: no existe.
export const noEncontrado = (res: Response) =>
  res.status(404).json({ error: "No existe." });

// 422: el request es válido pero incumple una regla de negocio.
export const reglaViolada = (res: Response, mensaje: string) =>
  res.status(422).json({ error: mensaje });
