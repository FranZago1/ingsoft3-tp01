import { describe, expect, it, vi } from "vitest";
import { pedirJson, type Traer } from "./http";

// El doble del traedor. `vi.fn()` fabrica la función impostora: no sale a la
// red, contesta lo que le digamos, y recuerda cómo la llamaron. Antes de sacar
// esta lógica de `apiGet` no había por dónde meterlo: la función se fabricaba
// su dependencia adentro (ver decisiones.md).
const respuesta = (status: number, cuerpo: unknown): Response =>
  ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => cuerpo,
  }) as Response;

describe("pedirJson", () => {
  it("devuelve los datos cuando la API contesta bien", async () => {
    const traer = vi.fn().mockResolvedValue(respuesta(200, [{ id: "c1" }]));

    const r = await pedirJson<{ id: string }[]>("/api/canchas", "", traer);

    expect(r).toEqual({ status: 200, data: [{ id: "c1" }], error: null });
  });

  it("reenvía la cookie de sesión y no cachea la respuesta", async () => {
    const traer: Traer = vi.fn().mockResolvedValue(respuesta(200, []));

    await pedirJson("http://backend:8080/api/reservas", "token=abc", traer);

    // Éste es el assert que mira la INTERACCIÓN y no el valor devuelto: si
    // mañana alguien deja de reenviar la cookie, el usuario ve su listado
    // vacío en vez de un error, y este test se pone rojo antes que eso pase.
    expect(traer).toHaveBeenCalledWith("http://backend:8080/api/reservas", {
      headers: { cookie: "token=abc" },
      cache: "no-store",
    });
  });

  it("no manda el header de cookie si no hay sesión", async () => {
    const traer: Traer = vi.fn().mockResolvedValue(respuesta(200, []));

    await pedirJson("/api/canchas", "", traer);

    expect(traer).toHaveBeenCalledWith("/api/canchas", {
      headers: {},
      cache: "no-store",
    });
  });

  it("propaga el mensaje de error que mandó la API", async () => {
    const traer = vi
      .fn()
      .mockResolvedValue(respuesta(403, { error: "No tenés permiso." }));

    const r = await pedirJson("/api/reservas?todas=true", "", traer);

    expect(r).toEqual({ status: 403, data: null, error: "No tenés permiso." });
  });

  it("usa un mensaje genérico si el error no trae cuerpo", async () => {
    const traer = vi.fn().mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => {
        throw new Error("no es JSON");
      },
    } as unknown as Response);

    const r = await pedirJson("/api/reservas", "", traer);

    expect(r).toEqual({
      status: 500,
      data: null,
      error: "Error al consultar la API.",
    });
  });

  it("devuelve 503 cuando el backend no contesta", async () => {
    // El caso de error del lado del front: la API no está caída con un código,
    // directamente no hay con quién hablar. La pantalla tiene que poder
    // distinguirlo de un 500 para decir algo útil.
    const traer = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    const r = await pedirJson("/api/reservas", "", traer);

    expect(r).toEqual({
      status: 503,
      data: null,
      error: "No se pudo contactar al backend.",
    });
  });

  it("no intenta leer el cuerpo si la conexión falló", async () => {
    const traer = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));

    await pedirJson("/api/reservas", "", traer);

    expect(traer).toHaveBeenCalledTimes(1);
  });
});
