import type { ReservaDTO } from "./tipos";

// Huecos libres de una cancha en un día: lo que hoy el usuario tiene que
// deducir mirando el listado. Toma las reservas ya cargadas de la pantalla y
// devuelve los tramos en los que se puede reservar.
//
// (PR de demostración del TP5: entra SIN tests a propósito.)

const HORA_APERTURA = 8;
const HORA_CIERRE = 23;

export type Hueco = { desde: string; hasta: string; minutos: number };

const aMinutos = (hhmm: string): number => {
  const [h, m] = hhmm.split(":");
  return Number(h) * 60 + Number(m);
};

const aTexto = (minutos: number): string => {
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

export function huecosLibres(
  reservas: ReservaDTO[],
  fecha: string,
  canchaId: string
): Hueco[] {
  const ocupados = reservas
    .filter((r) => r.fecha === fecha)
    .filter((r) => r.canchaId === canchaId)
    .filter((r) => r.estado !== "cancelada")
    .map((r) => ({ desde: aMinutos(r.inicio), hasta: aMinutos(r.fin) }))
    .sort((a, b) => a.desde - b.desde);

  const huecos: Hueco[] = [];
  let cursor = HORA_APERTURA * 60;

  for (const tramo of ocupados) {
    if (tramo.desde > cursor) {
      huecos.push({
        desde: aTexto(cursor),
        hasta: aTexto(tramo.desde),
        minutos: tramo.desde - cursor,
      });
    }
    if (tramo.hasta > cursor) {
      cursor = tramo.hasta;
    }
  }

  if (cursor < HORA_CIERRE * 60) {
    huecos.push({
      desde: aTexto(cursor),
      hasta: aTexto(HORA_CIERRE * 60),
      minutos: HORA_CIERRE * 60 - cursor,
    });
  }

  // Un hueco de menos de 60 minutos no sirve: no alcanza para la reserva
  // más corta que el sistema acepta.
  return huecos.filter((h) => h.minutos >= 60);
}
