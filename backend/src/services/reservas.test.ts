import { describe, expect, it } from "vitest";
import {
  cambiarEstado,
  esEstadoAceptado,
  haySolapamiento,
  puedeAcceder,
  puedeCancelar,
  rangoDelDia,
  transicionesDisponibles,
  validarHorario,
  validarNoPasado,
  validarNuevaReserva,
  validarTransicion,
} from "./reservas";
import type { EstadoReserva, ReservaDominio } from "./tipos";

// Las fechas se construyen SIEMPRE con componentes locales, nunca con un ISO
// terminado en "Z": las reglas miran getHours() (hora local, ver decisiones.md)
// y el contenedor del pipeline corre en UTC mientras esta máquina está en UTC-3.
// Con ISO, estos tests pasarían acá y fallarían en la corrida.
const DIA = [2026, 8, 25] as const; // 25/09/2026
const alas = (hora: number, minutos = 0) =>
  new Date(DIA[0], DIA[1], DIA[2], hora, minutos);

const reserva = (
  campos: Partial<ReservaDominio> & Pick<ReservaDominio, "inicio" | "fin">
): ReservaDominio => ({
  id: "r1",
  estado: "pendiente",
  usuarioId: "u1",
  canchaId: "c1",
  ...campos,
});

describe("validarHorario (regla 2: 08:00–23:00, entre 60 y 120 minutos)", () => {
  it.each([
    ["el fin es anterior al inicio", alas(11), alas(10)],
    ["el fin es igual al inicio", alas(10), alas(10)],
    ["dura 59 minutos", alas(10), alas(10, 59)],
    ["dura 121 minutos", alas(10), alas(12, 1)],
    ["empieza antes de las 08:00", alas(7), alas(8, 30)],
    ["termina después de las 23:00", alas(22), alas(23, 30)],
    ["empieza a las 23:00", alas(23), alas(23, 59)],
  ])("rechaza una reserva que %s", (_caso, inicio, fin) => {
    const resultado = validarHorario(inicio, fin);

    expect(resultado.ok).toBe(false);
  });

  it.each([
    ["dura exactamente 60 minutos", alas(10), alas(11)],
    ["abre justo a las 08:00", alas(8), alas(9)],
    ["cierra justo a las 23:00 durando 120 minutos", alas(21), alas(23)],
  ])("acepta el borde: %s", (_caso, inicio, fin) => {
    const resultado = validarHorario(inicio, fin);

    expect(resultado).toEqual({ ok: true });
  });

  it("al rechazar por duración, el mensaje dice cuál es el máximo", () => {
    const resultado = validarHorario(alas(10), alas(12, 30));

    expect(resultado.ok).toBe(false);
    // Un rechazo que no explica el límite obliga al usuario a adivinarlo.
    expect(resultado.ok === false && resultado.error).toContain("120");
  });

  it("rechaza una fecha inválida antes de mirar la duración", () => {
    const resultado = validarHorario(new Date("no-es-una-fecha"), alas(11));

    expect(resultado).toEqual({
      ok: false,
      error: "Fecha/hora de inicio inválida.",
    });
  });

  it("rechaza una reserva que cruza la medianoche", () => {
    // Este caso salió del reporte de cobertura: era la única entrada capaz de
    // llegar al control de "no puede empezar a las 23:00". Dura 60 minutos
    // exactos y su hora de fin es 00:00, que comparada como hora de RELOJ es
    // menor que las 23:00 — así que el control del cierre no la ve pasar.
    const inicio = new Date(2026, 8, 25, 23, 0);
    const fin = new Date(2026, 8, 26, 0, 0);

    expect(validarHorario(inicio, fin)).toEqual({
      ok: false,
      error: "La reserva no puede empezar a las 23:00 o después.",
    });
  });

  it("rechaza un fin inválido con su propio mensaje", () => {
    const resultado = validarHorario(alas(10), new Date("tampoco"));

    expect(resultado).toEqual({
      ok: false,
      error: "Fecha/hora de fin inválida.",
    });
  });
});

describe("haySolapamiento (regla 1: una cancha, un turno)", () => {
  const nueva = { inicio: alas(10), fin: alas(11), canchaId: "c1" };

  it("no considera solapadas a dos reservas contiguas", () => {
    // 09:00–10:00 termina justo cuando la nueva empieza: la cancha queda libre.
    const existentes = [reserva({ inicio: alas(9), fin: alas(10) })];

    expect(haySolapamiento(nueva, existentes)).toBe(false);
  });

  it("detecta un solapamiento parcial", () => {
    const existentes = [reserva({ inicio: alas(10, 30), fin: alas(11, 30) })];

    expect(haySolapamiento(nueva, existentes)).toBe(true);
  });

  it("una reserva cancelada libera el horario", () => {
    const existentes = [
      reserva({ inicio: alas(10), fin: alas(11), estado: "cancelada" }),
    ];

    expect(haySolapamiento(nueva, existentes)).toBe(false);
  });

  it("una reserva de otra cancha en el mismo horario no estorba", () => {
    const existentes = [
      reserva({ inicio: alas(10), fin: alas(11), canchaId: "c2" }),
    ];

    expect(haySolapamiento(nueva, existentes)).toBe(false);
  });
});

describe("validarNoPasado (regla 3)", () => {
  it("acepta una reserva que empieza exactamente ahora", () => {
    const ahora = alas(10);

    expect(validarNoPasado(alas(10), ahora)).toEqual({ ok: true });
  });

  it("rechaza una reserva que empezó un minuto antes de ahora", () => {
    const ahora = alas(10);

    expect(validarNoPasado(alas(9, 59), ahora)).toEqual({
      ok: false,
      error: "No se pueden crear reservas en el pasado.",
    });
  });
});

describe("validarNuevaReserva (el orden en que se aplican las reglas)", () => {
  const ahora = alas(8);

  it("informa el horario inválido aunque además se solape", () => {
    // Las dos reglas fallan a la vez: la que se reporta es la del horario.
    const existentes = [reserva({ inicio: alas(10), fin: alas(11) })];

    const resultado = validarNuevaReserva(
      { inicio: alas(10), fin: alas(10, 30), canchaId: "c1" },
      existentes,
      ahora
    );

    expect(resultado.ok === false && resultado.error).toContain("60 minutos");
  });

  it("informa el solapamiento cuando el horario es válido", () => {
    const existentes = [reserva({ inicio: alas(10), fin: alas(11) })];

    const resultado = validarNuevaReserva(
      { inicio: alas(10), fin: alas(11), canchaId: "c1" },
      existentes,
      ahora
    );

    expect(resultado).toEqual({
      ok: false,
      error: "Ya existe una reserva que se superpone en esa cancha y horario.",
    });
  });

  it("acepta una reserva válida sobre una cancha libre", () => {
    expect(
      validarNuevaReserva(
        { inicio: alas(10), fin: alas(11), canchaId: "c1" },
        [],
        ahora
      )
    ).toEqual({ ok: true });
  });
});

describe("validarTransicion (regla 4: máquina de estados)", () => {
  it.each([
    ["pendiente", "confirmada", true],
    ["pendiente", "cancelada", true],
    ["confirmada", "cancelada", true],
    ["confirmada", "pendiente", false],
    ["cancelada", "confirmada", false],
    ["cancelada", "cancelada", false],
    ["pendiente", "pendiente", false],
  ] as [EstadoReserva, EstadoReserva, boolean][])(
    "de %s a %s → %s",
    (actual, nuevo, esperado) => {
      expect(validarTransicion(actual, nuevo).ok).toBe(esperado);
    }
  );

  it("cancelada es un estado terminal: no ofrece ninguna transición", () => {
    expect(transicionesDisponibles("cancelada")).toEqual([]);
  });

  it("el mensaje de una transición inválida nombra los dos estados", () => {
    const resultado = validarTransicion("cancelada", "confirmada");

    expect(resultado.ok === false && resultado.error).toBe(
      'No se puede pasar de "cancelada" a "confirmada".'
    );
  });
});

describe("puedeCancelar y cambiarEstado (regla 5: ventana de 2 horas)", () => {
  const ahora = alas(10);

  it("una confirmada se puede cancelar exactamente 2 horas antes", () => {
    const r = { estado: "confirmada" as const, inicio: alas(12) };

    expect(puedeCancelar(r, ahora)).toEqual({ ok: true });
  });

  it("una confirmada NO se puede cancelar 1 hora y 59 minutos antes", () => {
    const r = { estado: "confirmada" as const, inicio: alas(11, 59) };

    const resultado = puedeCancelar(r, ahora);

    expect(resultado.ok).toBe(false);
    expect(resultado.ok === false && resultado.error).toContain("2 horas");
  });

  it("una pendiente se cancela aunque falten 5 minutos", () => {
    // La ventana de 2 h protege solo a las confirmadas.
    const r = { estado: "pendiente" as const, inicio: alas(10, 5) };

    expect(cambiarEstado(r, "cancelada", ahora)).toEqual({ ok: true });
  });

  it("cambiarEstado frena la cancelación tardía de una confirmada", () => {
    // La transición confirmada→cancelada es válida (regla 4) y aun así no se
    // puede: la ventana de 2 h (regla 5) la frena. Es la composición de las dos,
    // y sin este test cada regla estaba probada por separado pero su
    // encadenamiento no: el reporte de cobertura lo marcó.
    const r = { estado: "confirmada" as const, inicio: alas(11) };

    const resultado = cambiarEstado(r, "cancelada", ahora);

    expect(resultado.ok).toBe(false);
    expect(resultado.ok === false && resultado.error).toContain("2 horas");
  });

  it("confirmar no pasa por la ventana de cancelación", () => {
    const r = { estado: "pendiente" as const, inicio: alas(10, 5) };

    expect(cambiarEstado(r, "confirmada", ahora)).toEqual({ ok: true });
  });

  it("cambiarEstado corta en la transición antes de mirar la ventana", () => {
    const r = { estado: "cancelada" as const, inicio: alas(20) };

    expect(cambiarEstado(r, "cancelada", ahora).ok).toBe(false);
  });
});

describe("puedeAcceder (regla 6: cada uno ve lo suyo)", () => {
  const ajena = { usuarioId: "otro" };

  it("un admin accede a una reserva ajena", () => {
    expect(puedeAcceder({ id: "u1", rol: "admin" }, ajena)).toBe(true);
  });

  it("un jugador no accede a una reserva ajena", () => {
    expect(puedeAcceder({ id: "u1", rol: "jugador" }, ajena)).toBe(false);
  });

  it("un jugador accede a la suya", () => {
    expect(puedeAcceder({ id: "u1", rol: "jugador" }, { usuarioId: "u1" })).toBe(
      true
    );
  });
});

describe("esEstadoAceptado y rangoDelDia", () => {
  it.each([
    ["confirmada", true],
    ["cancelada", true],
    ["pendiente", false],
    ["borrada", false],
    [undefined, false],
  ])("esEstadoAceptado(%s) → %s", (valor, esperado) => {
    expect(esEstadoAceptado(valor)).toBe(esperado);
  });

  it("el rango de un día va de su medianoche a la del día siguiente", () => {
    const rango = rangoDelDia("2026-09-25");

    expect(rango).toEqual({
      desde: new Date(2026, 8, 25, 0, 0),
      hasta: new Date(2026, 8, 26, 0, 0),
    });
  });

  it("devuelve null si la fecha no se puede interpretar", () => {
    expect(rangoDelDia("25/09/2026")).toBeNull();
  });
});
