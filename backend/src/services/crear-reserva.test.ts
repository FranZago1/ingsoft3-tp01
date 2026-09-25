import { describe, expect, it, vi } from "vitest";
import { crearReserva, type RepositorioReservas } from "./crear-reserva";
import type { ReservaDominio } from "./tipos";

// El impostor del repositorio. `vi.fn()` fabrica funciones que recuerdan cómo
// las llamaron: eso es lo que permite que el assert mire la INTERACCIÓN y no
// solo el valor devuelto. Ni base de datos, ni red, ni Prisma.
const repositorioFalso = (
  existentes: ReservaDominio[] = [],
  cancha: { id: string } | null = { id: "c1" }
) => ({
  buscarCancha: vi.fn().mockResolvedValue(cancha),
  reservasDelDia: vi.fn().mockResolvedValue(existentes),
  guardar: vi.fn().mockResolvedValue({ id: "reserva-nueva" }),
});

const pedido = {
  canchaId: "c1",
  fecha: "2026-09-25",
  horaInicio: "10:00",
  horaFin: "11:00",
};

// Dos horas antes de la reserva del pedido: no cae en el pasado.
const ahora = new Date(2026, 8, 25, 8, 0);

const enDominio = (inicio: Date, fin: Date): ReservaDominio => ({
  id: "existente",
  inicio,
  fin,
  estado: "pendiente",
  usuarioId: "otro",
  canchaId: "c1",
});

describe("crearReserva", () => {
  it("guarda la reserva una sola vez, pendiente y a nombre de quien la pide", async () => {
    const repo = repositorioFalso();

    const resultado = await crearReserva(pedido, "u1", repo, ahora);

    expect(resultado).toEqual({ ok: true, reserva: { id: "reserva-nueva" } });
    // El assert no mira lo que devolvió: mira CÓMO se usó la dependencia.
    // Si mañana alguien duplica el guardado, este test se pone rojo.
    expect(repo.guardar).toHaveBeenCalledTimes(1);
    expect(repo.guardar).toHaveBeenCalledWith({
      fecha: new Date(2026, 8, 25, 0, 0),
      inicio: new Date(2026, 8, 25, 10, 0),
      fin: new Date(2026, 8, 25, 11, 0),
      estado: "pendiente",
      usuarioId: "u1",
      canchaId: "c1",
    });
  });

  it("NO guarda nada cuando la reserva se solapa con otra", async () => {
    const repo = repositorioFalso([
      enDominio(new Date(2026, 8, 25, 10, 30), new Date(2026, 8, 25, 11, 30)),
    ]);

    const resultado = await crearReserva(pedido, "u1", repo, ahora);

    expect(resultado).toEqual({
      ok: false,
      motivo: "regla-violada",
      error: "Ya existe una reserva que se superpone en esa cancha y horario.",
    });
    // Lo que importa no es solo el mensaje: es que la regla frenó la escritura.
    expect(repo.guardar).not.toHaveBeenCalled();
  });

  it("no consulta las reservas del día si la cancha no existe", async () => {
    const repo = repositorioFalso([], null);

    const resultado = await crearReserva(pedido, "u1", repo, ahora);

    expect(resultado).toEqual({
      ok: false,
      motivo: "pedido-invalido",
      error: "La cancha no existe.",
    });
    expect(repo.reservasDelDia).not.toHaveBeenCalled();
    expect(repo.guardar).not.toHaveBeenCalled();
  });

  it("le pide al repositorio exactamente el día de la reserva", async () => {
    const repo = repositorioFalso();

    await crearReserva(pedido, "u1", repo, ahora);

    // Si mañana alguien cambia el rango consultado, la regla de solapamiento
    // se calcularía sobre el conjunto equivocado y nadie se enteraría.
    expect(repo.reservasDelDia).toHaveBeenCalledWith(
      "c1",
      new Date(2026, 8, 25, 0, 0),
      new Date(2026, 8, 26, 0, 0)
    );
  });

  it.each([
    ["falta la cancha", { ...pedido, canchaId: undefined }],
    ["falta la fecha", { ...pedido, fecha: undefined }],
    ["falta la hora de inicio", { ...pedido, horaInicio: "" }],
    ["falta la hora de fin", { ...pedido, horaFin: undefined }],
  ])("rechaza el pedido si %s, sin tocar la base", async (_caso, incompleto) => {
    const repo = repositorioFalso();

    const resultado = await crearReserva(incompleto, "u1", repo, ahora);

    expect(resultado).toEqual({
      ok: false,
      motivo: "pedido-invalido",
      error: "Faltan datos: canchaId, fecha, horaInicio, horaFin.",
    });
    expect(repo.buscarCancha).not.toHaveBeenCalled();
  });

  it("rechaza una hora con formato inválido", async () => {
    const repo = repositorioFalso();

    const resultado = await crearReserva(
      { ...pedido, horaInicio: "25:99" },
      "u1",
      repo,
      ahora
    );

    expect(resultado).toEqual({
      ok: false,
      motivo: "pedido-invalido",
      error: "Fecha u hora con formato inválido.",
    });
    expect(repo.guardar).not.toHaveBeenCalled();
  });

  it("distingue una regla violada de un pedido mal escrito", async () => {
    const repo = repositorioFalso();

    // Pedido perfectamente formado, pero de 30 minutos: es una regla, no un
    // error de sintaxis. El handler lo traduce a 422 y no a 400.
    const resultado = await crearReserva(
      { ...pedido, horaFin: "10:30" },
      "u1",
      repo,
      ahora
    );

    expect(resultado.ok).toBe(false);
    expect(resultado.ok === false && resultado.motivo).toBe("regla-violada");
  });

  it("rechaza una reserva en el pasado antes de consultar el solapamiento", async () => {
    const repo = repositorioFalso();
    const ahoraTarde = new Date(2026, 8, 25, 12, 0); // la reserva era a las 10

    const resultado = await crearReserva(pedido, "u1", repo, ahoraTarde);

    expect(resultado.ok === false && resultado.error).toBe(
      "No se pueden crear reservas en el pasado."
    );
    expect(repo.guardar).not.toHaveBeenCalled();
  });
});

// El tipo del repositorio falso tiene que seguir cumpliendo el contrato real:
// si mañana `RepositorioReservas` pide un método más, esto deja de compilar y
// el test avisa antes que la aplicación.
const _contrato: RepositorioReservas<{ id: string }> = repositorioFalso();
void _contrato;
