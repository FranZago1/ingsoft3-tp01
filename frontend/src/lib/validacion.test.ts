import { describe, expect, it } from "vitest";
import {
  emailValido,
  transicionesDisponibles,
  validarHorario,
  validarLogin,
  validarNoPasado,
  validarRegistro,
} from "./validacion";

// Igual que en el backend: fechas con componentes LOCALES, nunca ISO con "Z".
// Estas reglas miran getHours(), y el contenedor del pipeline corre en UTC.
const alas = (hora: number, minutos = 0) =>
  new Date(2026, 8, 25, hora, minutos);

const registroValido = {
  nombre: "Ana",
  email: "ana@club.com",
  password: "12345678",
};

describe("validarRegistro (espeja la regla 7 del backend)", () => {
  it.each([
    ["sin arroba", "anaclub.com"],
    ["sin dominio", "ana@"],
    ["sin punto en el dominio", "ana@club"],
    ["con un espacio", "ana @club.com"],
    ["vacío", ""],
  ])("rechaza un email %s", (_caso, email) => {
    expect(validarRegistro({ ...registroValido, email })).toEqual({
      ok: false,
      error: "El email no es válido.",
    });
  });

  it("acepta un registro bien formado", () => {
    expect(validarRegistro(registroValido)).toEqual({ ok: true });
  });

  it("al rechazar una contraseña corta, el mensaje dice el mínimo", () => {
    const resultado = validarRegistro({
      ...registroValido,
      password: "1234567",
    });

    expect(resultado.ok).toBe(false);
    expect(resultado.ok === false && resultado.error).toContain("8");
  });

  it("rechaza un nombre que son solo espacios", () => {
    expect(validarRegistro({ ...registroValido, nombre: "   " })).toEqual({
      ok: false,
      error: "El nombre es obligatorio.",
    });
  });
});

describe("validarLogin", () => {
  it("rechaza una contraseña vacía", () => {
    expect(validarLogin({ email: "ana@club.com", password: "" })).toEqual({
      ok: false,
      error: "La contraseña es obligatoria.",
    });
  });

  it("rechaza un email mal formado", () => {
    expect(validarLogin({ email: "ana", password: "12345678" })).toEqual({
      ok: false,
      error: "El email no es válido.",
    });
  });

  it("acepta credenciales bien formadas", () => {
    expect(validarLogin({ email: "ana@club.com", password: "x" })).toEqual({
      ok: true,
    });
  });
});

describe("emailValido", () => {
  it.each(["ana@club.com", "a.b@c.com.ar", "ana+padel@club.com"])(
    "acepta %s",
    (email) => {
      expect(emailValido(email)).toBe(true);
    }
  );
});

describe("validarHorario (espeja la regla 2)", () => {
  it.each([
    ["el fin es anterior al inicio", alas(11), alas(10)],
    ["dura 59 minutos", alas(10), alas(10, 59)],
    ["dura 121 minutos", alas(10), alas(12, 1)],
    ["empieza antes de las 08:00", alas(7), alas(8, 30)],
    ["empieza a las 23:00", alas(23), alas(23, 30)],
    ["termina después de las 23:00", alas(22), alas(23, 30)],
  ])("rechaza una reserva que %s", (_caso, inicio, fin) => {
    expect(validarHorario(inicio, fin).ok).toBe(false);
  });

  it.each([
    ["dura exactamente 60 minutos", alas(10), alas(11)],
    ["abre justo a las 08:00", alas(8), alas(9)],
    ["cierra justo a las 23:00", alas(21), alas(23)],
  ])("acepta el borde: %s", (_caso, inicio, fin) => {
    expect(validarHorario(inicio, fin)).toEqual({ ok: true });
  });

  it("rechaza una reserva que cruza la medianoche", () => {
    // Salió del reporte de cobertura, igual que en el backend: es la única
    // entrada que llega al control de "no puede empezar a las 23:00", porque
    // cualquier otra reserva de 23:00 en adelante cae antes por duración.
    const inicio = new Date(2026, 8, 25, 23, 0);
    const fin = new Date(2026, 8, 26, 0, 0);

    expect(validarHorario(inicio, fin)).toEqual({
      ok: false,
      error: "La reserva no puede empezar a las 23:00 o después.",
    });
  });

  it("al rechazar por duración, el mensaje dice cuál es el máximo", () => {
    const resultado = validarHorario(alas(10), alas(12, 30));

    expect(resultado.ok === false && resultado.error).toContain("120");
  });

  it("rechaza una fecha inválida con su propio mensaje", () => {
    expect(validarHorario(new Date("no-es-fecha"), alas(11))).toEqual({
      ok: false,
      error: "Fecha/hora de inicio inválida.",
    });
  });

  it("rechaza un fin inválido con su propio mensaje", () => {
    expect(validarHorario(alas(10), new Date("tampoco"))).toEqual({
      ok: false,
      error: "Fecha/hora de fin inválida.",
    });
  });
});

describe("validarNoPasado (espeja la regla 3)", () => {
  it("acepta una reserva que empieza exactamente ahora", () => {
    expect(validarNoPasado(alas(10), alas(10))).toEqual({ ok: true });
  });

  it("rechaza una reserva que empezó un minuto antes", () => {
    expect(validarNoPasado(alas(9, 59), alas(10))).toEqual({
      ok: false,
      error: "No se pueden crear reservas en el pasado.",
    });
  });
});

describe("transicionesDisponibles (qué botones muestra la UI)", () => {
  it.each([
    ["pendiente", ["confirmada", "cancelada"]],
    ["confirmada", ["cancelada"]],
    ["cancelada", []],
  ] as const)("desde %s ofrece %s", (estado, esperado) => {
    expect(transicionesDisponibles(estado)).toEqual(esperado);
  });
});
