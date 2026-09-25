import { describe, expect, it } from "vitest";
import { emailValido, validarLogin, validarRegistro } from "./auth";

const registroValido = {
  nombre: "Ana",
  email: "ana@club.com",
  password: "12345678",
};

describe("validarRegistro (regla 7)", () => {
  it.each([
    ["sin arroba", "anaclub.com"],
    ["sin dominio", "ana@"],
    ["sin nombre de usuario", "@club.com"],
    ["sin punto en el dominio", "ana@club"],
    ["con un espacio", "ana @club.com"],
    ["vacío", ""],
  ])("rechaza un email %s", (_caso, email) => {
    const resultado = validarRegistro({ ...registroValido, email });

    expect(resultado).toEqual({ ok: false, error: "El email no es válido." });
  });

  it("acepta un registro bien formado", () => {
    expect(validarRegistro(registroValido)).toEqual({ ok: true });
  });

  it("al rechazar una contraseña corta, el mensaje dice el mínimo", () => {
    // 7 caracteres: uno menos que el tope. El borde es lo que hay que fijar.
    const resultado = validarRegistro({
      ...registroValido,
      password: "1234567",
    });

    expect(resultado.ok).toBe(false);
    expect(resultado.ok === false && resultado.error).toContain("8");
  });

  it("acepta una contraseña de exactamente 8 caracteres", () => {
    expect(
      validarRegistro({ ...registroValido, password: "12345678" })
    ).toEqual({ ok: true });
  });

  it("rechaza un nombre que son solo espacios", () => {
    const resultado = validarRegistro({ ...registroValido, nombre: "   " });

    expect(resultado).toEqual({
      ok: false,
      error: "El nombre es obligatorio.",
    });
  });

  it("el nombre se valida antes que el email", () => {
    // Los dos están mal: el mensaje que vuelve es el del nombre.
    const resultado = validarRegistro({
      nombre: "",
      email: "roto",
      password: "12345678",
    });

    expect(resultado.ok === false && resultado.error).toContain("nombre");
  });
});

describe("validarLogin", () => {
  it("rechaza una contraseña vacía con su propio mensaje", () => {
    const resultado = validarLogin({ email: "ana@club.com", password: "" });

    expect(resultado).toEqual({
      ok: false,
      error: "La contraseña es obligatoria.",
    });
  });

  it("no exige los 8 caracteres del registro", () => {
    // Al entrar no se revalida la política: una cuenta vieja tiene que poder
    // loguearse aunque su contraseña ya no cumpla el mínimo de hoy.
    expect(validarLogin({ email: "ana@club.com", password: "1" })).toEqual({
      ok: true,
    });
  });

  it("rechaza un email mal formado", () => {
    expect(validarLogin({ email: "ana", password: "12345678" })).toEqual({
      ok: false,
      error: "El email no es válido.",
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
