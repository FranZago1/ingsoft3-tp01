// Reglas de negocio de autenticación/registro como funciones PURAS.
import { type Resultado, OK, fallo } from "./tipos";

// Validación simple de email.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function emailValido(email: string): boolean {
  return EMAIL_RE.test(email);
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
