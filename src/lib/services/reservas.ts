// Reglas de negocio de reservas como funciones PURAS.
// No importan Next.js ni Prisma: reciben datos ya consultados. Testeables sin DB.
import {
  type EstadoReserva,
  type ReservaDominio,
  type Rol,
  type Resultado,
  OK,
  fallo,
} from "./tipos";

const DURACION_MIN = 60; // minutos
const DURACION_MAX = 120; // minutos
const HORA_APERTURA = 8; // 08:00
const HORA_CIERRE = 23; // 23:00

// Datos de una reserva a crear (ya parseados a Date).
export type NuevaReserva = {
  inicio: Date;
  fin: Date;
  canchaId: string;
};

// Regla 2: fin > inicio, duración 60–120 min, dentro de 08:00–23:00.
export function validarHorario(inicio: Date, fin: Date): Resultado {
  if (!(inicio instanceof Date) || isNaN(inicio.getTime())) {
    return fallo("Fecha/hora de inicio inválida.");
  }
  if (!(fin instanceof Date) || isNaN(fin.getTime())) {
    return fallo("Fecha/hora de fin inválida.");
  }
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
  // El fin puede ser hasta las 23:00 exactas.
  const finEnMinutos = fin.getHours() * 60 + fin.getMinutes();
  if (finEnMinutos > HORA_CIERRE * 60) {
    return fallo("La reserva no puede terminar después de las 23:00.");
  }
  if (inicio.getHours() >= HORA_CIERRE) {
    return fallo("La reserva no puede empezar a las 23:00 o después.");
  }

  return OK;
}

// Regla 3: no se permiten reservas en el pasado.
export function validarNoPasado(inicio: Date, ahora: Date): Resultado {
  if (inicio.getTime() < ahora.getTime()) {
    return fallo("No se pueden crear reservas en el pasado.");
  }
  return OK;
}

// Regla 1: sin solapamiento con otra reserva NO cancelada de la misma cancha.
// `existentes` son las reservas ya consultadas de esa cancha.
export function haySolapamiento(
  nueva: NuevaReserva,
  existentes: ReservaDominio[]
): boolean {
  return existentes.some((r) => {
    if (r.canchaId !== nueva.canchaId) return false;
    if (r.estado === "cancelada") return false;
    // Se solapan si inicio < finOtro y fin > inicioOtro.
    return nueva.inicio < r.fin && nueva.fin > r.inicio;
  });
}

// Valida todo lo necesario para crear una reserva. `ahora` inyectado para testear.
export function validarNuevaReserva(
  nueva: NuevaReserva,
  existentes: ReservaDominio[],
  ahora: Date
): Resultado {
  const horario = validarHorario(nueva.inicio, nueva.fin);
  if (!horario.ok) return horario;

  const pasado = validarNoPasado(nueva.inicio, ahora);
  if (!pasado.ok) return pasado;

  if (haySolapamiento(nueva, existentes)) {
    return fallo("Ya existe una reserva que se superpone en esa cancha y horario.");
  }
  return OK;
}

// Regla 4: transiciones válidas de estado.
const TRANSICIONES: Record<EstadoReserva, EstadoReserva[]> = {
  pendiente: ["confirmada", "cancelada"],
  confirmada: ["cancelada"],
  cancelada: [],
};

export function validarTransicion(
  actual: EstadoReserva,
  nuevo: EstadoReserva
): Resultado {
  if (!TRANSICIONES[actual].includes(nuevo)) {
    return fallo(`No se puede pasar de "${actual}" a "${nuevo}".`);
  }
  return OK;
}

// Estados a los que se puede transicionar desde `actual`.
// Lo usa la UI para mostrar solo las acciones válidas (comportamiento testeable).
export function transicionesDisponibles(actual: EstadoReserva): EstadoReserva[] {
  return TRANSICIONES[actual];
}

// Regla 5: una reserva confirmada solo se cancela hasta 2 h antes del inicio.
export function puedeCancelar(
  reserva: Pick<ReservaDominio, "estado" | "inicio">,
  ahora: Date
): Resultado {
  if (reserva.estado === "confirmada") {
    const dosHorasMs = 2 * 60 * 60 * 1000;
    if (reserva.inicio.getTime() - ahora.getTime() < dosHorasMs) {
      return fallo(
        "Una reserva confirmada solo se puede cancelar hasta 2 horas antes del inicio."
      );
    }
  }
  return OK;
}

// Aplica una transición de estado validando reglas 4 y 5.
export function cambiarEstado(
  reserva: Pick<ReservaDominio, "estado" | "inicio">,
  nuevo: EstadoReserva,
  ahora: Date
): Resultado {
  const transicion = validarTransicion(reserva.estado, nuevo);
  if (!transicion.ok) return transicion;

  if (nuevo === "cancelada") {
    const cancelable = puedeCancelar(reserva, ahora);
    if (!cancelable.ok) return cancelable;
  }
  return OK;
}

// Regla 6: autorización. Un jugador solo ve/modifica SUS reservas; el admin todas.
export function puedeAcceder(
  usuario: { id: string; rol: Rol },
  reserva: Pick<ReservaDominio, "usuarioId">
): boolean {
  return usuario.rol === "admin" || usuario.id === reserva.usuarioId;
}
