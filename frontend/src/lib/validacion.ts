// Validaciones PURAS que usa la UI: deshabilitar botones, mostrar mensajes y
// decidir qué acciones se ven. Sin React, sin fetch, sin DOM → testeables solas.
//
// Sí, esto duplica parte de backend/src/services/. Es deliberado: cada servicio
// es una imagen Docker independiente que se construye desde su propia carpeta,
// y montar un paquete compartido exigiría herramientas de monorepo que este
// proyecto no tiene. La AUTORIDAD sigue siendo el backend: valida todo de nuevo
// y devuelve 422 si algo no cierra. Esto de acá es solo experiencia de usuario
// (no esperar un viaje al servidor para saber que faltan datos). Ver decisiones.md.
import type { EstadoReserva } from "./tipos";

export type Resultado = { ok: true } | { ok: false; error: string };

const OK: Resultado = { ok: true };
const fallo = (error: string): Resultado => ({ ok: false, error });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailValido(email: string): boolean {
  return EMAIL_RE.test(email);
}

// Espeja la regla 7 del backend.
export function validarRegistro(datos: {
  nombre: string;
  email: string;
  password: string;
}): Resultado {
  if (!datos.nombre || datos.nombre.trim().length === 0) {
    return fallo("El nombre es obligatorio.");
  }
  if (!emailValido(datos.email)) {
    return fallo("El email no es válido.");
  }
  if (!datos.password || datos.password.length < 8) {
    return fallo("La contraseña debe tener al menos 8 caracteres.");
  }
  return OK;
}

export function validarLogin(datos: {
  email: string;
  password: string;
}): Resultado {
  if (!emailValido(datos.email)) {
    return fallo("El email no es válido.");
  }
  if (!datos.password || datos.password.length === 0) {
    return fallo("La contraseña es obligatoria.");
  }
  return OK;
}

const DURACION_MIN = 60; // minutos
const DURACION_MAX = 120; // minutos
const HORA_APERTURA = 8; // 08:00
const HORA_CIERRE = 23; // 23:00

// Espeja la regla 2 del backend.
export function validarHorario(inicio: Date, fin: Date): Resultado {
  if (isNaN(inicio.getTime())) return fallo("Fecha/hora de inicio inválida.");
  if (isNaN(fin.getTime())) return fallo("Fecha/hora de fin inválida.");

  if (fin <= inicio) {
    return fallo("La hora de fin debe ser posterior a la de inicio.");
  }

  const duracionMin = (fin.getTime() - inicio.getTime()) / 60000;
  if (duracionMin < DURACION_MIN) {
    return fallo("La reserva debe durar al menos 60 minutos.");
  }
  if (duracionMin > DURACION_MAX) {
    return fallo("La reserva no puede durar más de 120 minutos.");
  }

  if (inicio.getHours() < HORA_APERTURA) {
    return fallo("La reserva no puede empezar antes de las 08:00.");
  }
  if (inicio.getHours() >= HORA_CIERRE) {
    return fallo("La reserva no puede empezar a las 23:00 o después.");
  }
  const finEnMinutos = fin.getHours() * 60 + fin.getMinutes();
  if (finEnMinutos > HORA_CIERRE * 60) {
    return fallo("La reserva no puede terminar después de las 23:00.");
  }

  return OK;
}

// Espeja la regla 3 del backend.
export function validarNoPasado(inicio: Date, ahora: Date): Resultado {
  if (inicio.getTime() < ahora.getTime()) {
    return fallo("No se pueden crear reservas en el pasado.");
  }
  return OK;
}

// Espeja la regla 4: a qué estados se puede pasar desde `actual`.
// La UI del detalle muestra SOLO estas acciones.
const TRANSICIONES: Record<EstadoReserva, EstadoReserva[]> = {
  pendiente: ["confirmada", "cancelada"],
  confirmada: ["cancelada"],
  cancelada: [],
};

export function transicionesDisponibles(actual: EstadoReserva): EstadoReserva[] {
  return TRANSICIONES[actual] ?? [];
}
