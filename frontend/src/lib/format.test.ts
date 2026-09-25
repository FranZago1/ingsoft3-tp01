import { describe, expect, it } from "vitest";
import { aReservaDTO, soloFecha, soloHora } from "./format";
import type { ReservaAPI } from "./tipos";

// Local, no ISO: `soloFecha` y `soloHora` leen la hora local a propósito
// (la app trabaja en hora local, ver decisiones.md).
const el = (
  anio: number,
  mes: number,
  dia: number,
  hora = 0,
  minutos = 0
) => new Date(anio, mes - 1, dia, hora, minutos);

describe("soloFecha", () => {
  it("rellena mes y día con el cero de la izquierda", () => {
    // El formato tiene que ser el que compara un <input type="date">: si el 9
    // saliera sin cero, el filtro del listado dejaría de encontrar nada.
    expect(soloFecha(el(2026, 9, 5))).toBe("2026-09-05");
  });

  it("no toca los números de dos dígitos", () => {
    expect(soloFecha(el(2026, 12, 25))).toBe("2026-12-25");
  });
});

describe("soloHora", () => {
  it("rellena hora y minutos con el cero de la izquierda", () => {
    expect(soloHora(el(2026, 9, 25, 8, 5))).toBe("08:05");
  });

  it("muestra la medianoche como 00:00", () => {
    expect(soloHora(el(2026, 9, 25, 0, 0))).toBe("00:00");
  });
});

describe("aReservaDTO", () => {
  const reserva: ReservaAPI = {
    id: "r1",
    fecha: new Date(2026, 8, 25).toISOString(),
    inicio: new Date(2026, 8, 25, 10, 0).toISOString(),
    fin: new Date(2026, 8, 25, 11, 30).toISOString(),
    estado: "pendiente",
    usuarioId: "u1",
    canchaId: "c1",
    cancha: { id: "c1", nombre: "Cancha 1" },
    usuario: { nombre: "Ana", email: "ana@club.com" },
  };

  it("aplana la reserva separando la fecha de las horas", () => {
    expect(aReservaDTO(reserva)).toEqual({
      id: "r1",
      canchaId: "c1",
      canchaNombre: "Cancha 1",
      fecha: "2026-09-25",
      inicio: "10:00",
      fin: "11:30",
      estado: "pendiente",
      usuarioEmail: undefined,
    });
  });

  it("oculta el email del dueño salvo que se lo pidan", () => {
    // La vista de un jugador no tiene por qué mostrar de quién es cada reserva.
    expect(aReservaDTO(reserva).usuarioEmail).toBeUndefined();
  });

  it("incluye el email cuando lo pide la vista de admin", () => {
    expect(aReservaDTO(reserva, true).usuarioEmail).toBe("ana@club.com");
  });
});
