// Tipos de dominio propios de la capa de servicios.
// Se definen acá (con los mismos valores string que los enums de Prisma) para
// que los servicios sean 100% independientes de Prisma y testeables sin DB.

export type EstadoReserva = "pendiente" | "confirmada" | "cancelada";
export type Rol = "admin" | "jugador";

export type ReservaDominio = {
  id: string;
  inicio: Date;
  fin: Date;
  estado: EstadoReserva;
  usuarioId: string;
  canchaId: string;
};

// Resultado uniforme de una validación de regla de negocio.
export type Resultado = { ok: true } | { ok: false; error: string };

export const OK: Resultado = { ok: true };
export function fallo(error: string): Resultado {
  return { ok: false, error };
}
