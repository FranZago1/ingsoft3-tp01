import { NextResponse } from "next/server";

// Helpers chicos para mapear resultados a HTTP de forma consistente.
export const noAutenticado = () =>
  NextResponse.json({ error: "No autenticado." }, { status: 401 });

export const sinPermiso = () =>
  NextResponse.json({ error: "No tenés permiso para esto." }, { status: 403 });

export const noEncontrado = () =>
  NextResponse.json({ error: "No existe." }, { status: 404 });

// 422: regla de negocio incumplida.
export const reglaViolada = (mensaje: string) =>
  NextResponse.json({ error: mensaje }, { status: 422 });

// 400: request mal formado.
export const pedidoInvalido = (mensaje: string) =>
  NextResponse.json({ error: mensaje }, { status: 400 });
