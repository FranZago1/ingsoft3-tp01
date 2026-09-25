import type { EstadoReserva, ReservaDominio } from "./tipos";

// Ocupación de las canchas en un período, para el panel del admin: cuántas
// horas se reservaron de cada una y qué proporción del horario disponible
// representa eso.
//
// (Segundo PR de demostración del TP5: entra SIN tests, a propósito, y queda
// abierto y en rojo.)

const HORAS_POR_DIA = 15; // de 08:00 a 23:00

export type OcupacionDeCancha = {
  canchaId: string;
  horasReservadas: number;
  porcentaje: number;
  canceladas: number;
};

function horasDe(reserva: ReservaDominio): number {
  const ms = reserva.fin.getTime() - reserva.inicio.getTime();
  return ms / 3600000;
}

function cuentaParaLaOcupacion(estado: EstadoReserva): boolean {
  if (estado === "cancelada") {
    return false;
  }
  return true;
}

export function ocupacionPorCancha(
  reservas: ReservaDominio[],
  dias: number
): OcupacionDeCancha[] {
  if (dias <= 0) {
    return [];
  }

  const porCancha = new Map<string, OcupacionDeCancha>();

  for (const reserva of reservas) {
    let fila = porCancha.get(reserva.canchaId);
    if (!fila) {
      fila = {
        canchaId: reserva.canchaId,
        horasReservadas: 0,
        porcentaje: 0,
        canceladas: 0,
      };
      porCancha.set(reserva.canchaId, fila);
    }

    if (cuentaParaLaOcupacion(reserva.estado)) {
      fila.horasReservadas += horasDe(reserva);
    } else {
      fila.canceladas += 1;
    }
  }

  const disponibles = HORAS_POR_DIA * dias;

  for (const fila of porCancha.values()) {
    fila.porcentaje = Math.round((fila.horasReservadas / disponibles) * 100);
  }

  return [...porCancha.values()].sort((a, b) => b.porcentaje - a.porcentaje);
}
