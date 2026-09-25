import { describe, expect, it } from "vitest";
import { sesionDeToken } from "./token";

const ahora = new Date(2026, 8, 25, 12, 0);
const enSegundos = (d: Date) => Math.floor(d.getTime() / 1000);

// Arma un JWT de mentira: tres partes separadas por punto, con el payload en
// base64url. No se firma nada porque esta función no verifica la firma — solo
// lee el payload para decidir qué muestra el nav.
const tokenCon = (payload: Record<string, unknown>) =>
  ["cabecera", Buffer.from(JSON.stringify(payload)).toString("base64url"), "firma"].join(".");

describe("sesionDeToken", () => {
  it("devuelve la sesión que viaja en el payload", () => {
    const token = tokenCon({
      sub: "u1",
      nombre: "Ana",
      email: "ana@club.com",
      rol: "admin",
    });

    expect(sesionDeToken(token, ahora)).toEqual({
      id: "u1",
      nombre: "Ana",
      email: "ana@club.com",
      rol: "admin",
    });
  });

  it.each([
    ["no hay cookie", undefined],
    ["la cookie está vacía", ""],
    ["no tiene las tres partes de un JWT", "solo.dos"],
    ["el payload no es JSON", "a.no-es-base64-valido!.c"],
  ])("devuelve null si %s", (_caso, token) => {
    expect(sesionDeToken(token, ahora)).toBeNull();
  });

  it("devuelve null si el token ya venció", () => {
    const vencido = tokenCon({
      sub: "u1",
      exp: enSegundos(new Date(2026, 8, 25, 11, 59)),
    });

    expect(sesionDeToken(vencido, ahora)).toBeNull();
  });

  it("acepta un token que vence en el futuro", () => {
    const vigente = tokenCon({
      sub: "u1",
      exp: enSegundos(new Date(2026, 8, 26, 12, 0)),
    });

    expect(sesionDeToken(vigente, ahora)?.id).toBe("u1");
  });

  it("acepta un token sin vencimiento", () => {
    // `exp` es opcional: si no viene, no hay nada que comparar.
    expect(sesionDeToken(tokenCon({ sub: "u1" }), ahora)?.id).toBe("u1");
  });

  it("devuelve null si el payload no identifica a nadie", () => {
    expect(sesionDeToken(tokenCon({ nombre: "Ana" }), ahora)).toBeNull();
  });

  it("trata como jugador cualquier rol que no sea admin", () => {
    // Esto NO es autorización: si alguien falsea la cookie y se pone
    // rol: "root", lo peor que consigue es ver un link de más. El backend
    // verifica la firma de verdad al hacer click.
    expect(sesionDeToken(tokenCon({ sub: "u1", rol: "root" }), ahora)?.rol).toBe(
      "jugador"
    );
  });

  it("completa con vacío el nombre y el email que no vinieron", () => {
    expect(sesionDeToken(tokenCon({ sub: "u1" }), ahora)).toEqual({
      id: "u1",
      nombre: "",
      email: "",
      rol: "jugador",
    });
  });
});
