// Lo que comparten las dos suites: con quién se entra y cómo se fabrica un
// dato que ninguna otra corrida pueda usar.

// El jugador que crea el seed del backend (documentado en el README). El seed
// corre en cada arranque del contenedor, así que en QA siempre existe.
export const JUGADOR = { email: "jugador@club.com", password: "jugador1234" };

// Una reserva no tiene título: lo que la identifica es cancha + fecha + hora.
// Así que el «nombre que no se repite» es el TURNO, y se fabrica con la hora
// adentro: los segundos desde 1970 eligen el día (entre 1 y 11 años desde hoy,
// así nunca es pasado y no choca con una reserva real) y la hora. Dos corridas tendrían que arrancar en el mismo segundo
// para pedir el mismo turno.
export function turnoUnico() {
  const s = Math.floor(Date.now() / 1000);
  const dia = new Date();
  dia.setUTCDate(dia.getUTCDate() + 365 + (s % 3650));
  const hora = 8 + (Math.floor(s / 3650) % 14); // 08 a 21: termina a las 22 como mucho
  const hh = (h) => String(h).padStart(2, "0");
  return {
    fecha: dia.toISOString().slice(0, 10),
    horaInicio: `${hh(hora)}:00`,
    horaFin: `${hh(hora + 1)}:00`,
  };
}
