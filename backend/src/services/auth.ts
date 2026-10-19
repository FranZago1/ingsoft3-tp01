// Reglas de negocio de autenticación/registro como funciones PURAS.
import { type Resultado, OK, fallo } from "./tipos";

// Validación simple de email.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Ningún email real pasa de 254 caracteres (RFC 5321). El tope va ANTES de la
// regex a propósito: CodeQL (js/polynomial-redos) marcó que, con un dominio
// hecho de puntos, la regex tarda el cuadrado del largo. Medido: 20.000
// caracteres → 215 ms; los 100 KB que acepta express.json → ~5 s de event
// loop bloqueado por pedido, desde /login y sin estar logueado.
const EMAIL_MAX = 254;

export function emailValido(email: string): boolean {
  return email.length <= EMAIL_MAX && EMAIL_RE.test(email);
}

// Regla 7: email válido y password de mínimo 8 caracteres.
// La unicidad del email se verifica contra la DB en el route handler.
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
