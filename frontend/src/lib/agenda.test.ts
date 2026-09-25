import { describe, expect, it } from "vitest";
import { huecosLibres } from "./agenda";
import type { EstadoReserva, ReservaDTO } from "./tipos";

const FECHA = "2026-09-25";

// Los huecos se calculan sobre las reservas YA formateadas que la pantalla
// tiene cargadas, así que acá no hay Date: las horas son strings "HH:mm".
const reserva = (
  inicio: string,
  fin: string,
  extra: Partial<ReservaDTO> = {}
): ReservaDTO => ({
  id: `${inicio}-${fin}`,
  canchaId: "c1",
  canchaNombre: "Cancha 1",
  fecha: FECHA,
  inicio,
  fin,
  estado: "pendiente" as EstadoReserva,
  ...extra,
});

const huecos = (reservas: ReservaDTO[]) => huecosLibres(reservas, FECHA, "c1");

describe("huecosLibres", () => {
  it("con la cancha vacía devuelve todo el horario de apertura", () => {
    expect(huecos([])).toEqual([
      { desde: "08:00", hasta: "23:00", minutos: 900 },
    ]);
  });

  it("una reserva en el medio parte el día en dos huecos", () => {
    expect(huecos([reserva("10:00", "11:00")])).toEqual([
      { desde: "08:00", hasta: "10:00", minutos: 120 },
      { desde: "11:00", hasta: "23:00", minutos: 720 },
    ]);
  });

  it("una reserva que arranca con la apertura no deja hueco antes", () => {
    expect(huecos([reserva("08:00", "09:30")])).toEqual([
      { desde: "09:30", hasta: "23:00", minutos: 810 },
    ]);
  });

  it("una reserva que llega hasta el cierre no deja hueco después", () => {
    expect(huecos([reserva("21:00", "23:00")])).toEqual([
      { desde: "08:00", hasta: "21:00", minutos: 780 },
    ]);
  });

  it("no cuenta las reservas de otra fecha", () => {
    const otroDia = reserva("10:00", "11:00", { fecha: "2026-09-26" });

    expect(huecos([otroDia])).toEqual([
      { desde: "08:00", hasta: "23:00", minutos: 900 },
    ]);
  });

  it("no cuenta las reservas de otra cancha", () => {
    const otraCancha = reserva("10:00", "11:00", { canchaId: "c2" });

    expect(huecos([otraCancha])).toEqual([
      { desde: "08:00", hasta: "23:00", minutos: 900 },
    ]);
  });

  it("una reserva cancelada libera su horario", () => {
    const cancelada = reserva("10:00", "11:00", { estado: "cancelada" });

    expect(huecos([cancelada])).toEqual([
      { desde: "08:00", hasta: "23:00", minutos: 900 },
    ]);
  });

  it("dos reservas superpuestas ocupan un solo tramo", () => {
    // La segunda está contenida en la primera: no puede mover el corte hacia
    // atrás ni abrir un hueco que no existe.
    const largas = [reserva("10:00", "12:00"), reserva("10:30", "11:30")];

    expect(huecos(largas)).toEqual([
      { desde: "08:00", hasta: "10:00", minutos: 120 },
      { desde: "12:00", hasta: "23:00", minutos: 660 },
    ]);
  });

  it("descarta un hueco más corto que la reserva mínima", () => {
    // Entre las 09:00 y las 09:30 la cancha está libre, pero media hora no
    // alcanza para reservar: mostrarla sería ofrecer algo que el sistema
    // después rechaza.
    const pegadas = [reserva("08:00", "09:00"), reserva("09:30", "11:00")];

    expect(huecos(pegadas)).toEqual([
      { desde: "11:00", hasta: "23:00", minutos: 720 },
    ]);
  });
});
