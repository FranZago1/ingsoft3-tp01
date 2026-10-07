// Suite de INTEGRACIÓN (TP7): le habla a la api de QA ya desplegada, con su
// Postgres de verdad atrás. Sin navegador (el fixture `request` es un cliente
// HTTP) y sin ningún doble en el medio: si el código le manda a la base algo
// que Postgres rechaza, acá se ve; un unitario con doble daría verde.
import { expect, test } from "@playwright/test";
import { JUGADOR, turnoUnico } from "./datos.js";

// La api tiene su propia dirección: NO es la del front. Sin barra al final.
const API = process.env.API_BASE_URL || "http://localhost:8080";

// Todas las rutas de reservas piden sesión. El login deja la cookie en el
// contexto de `request`, que la reenvía sola en los pedidos que siguen.
test.beforeEach(async ({ request }) => {
  const login = await request.post(`${API}/api/auth/login`, { data: JUGADOR });
  expect(login.status()).toBe(200);
});

async function primeraCancha(request) {
  const r = await request.get(`${API}/api/canchas`);
  expect(r.status()).toBe(200);
  const canchas = await r.json();
  expect(canchas.length).toBeGreaterThan(0);
  return canchas[0].id;
}

// Las reservas del jugador en ese día, leídas DE LA BASE (no de un doble).
async function reservasDelDia(request, fecha) {
  const r = await request.get(`${API}/api/reservas?fecha=${fecha}`);
  expect(r.status()).toBe(200);
  return await r.json();
}

async function borrar(request, id) {
  const r = await request.delete(`${API}/api/reservas/${id}`);
  expect(r.status()).toBe(204);
}

test("el alta guarda en la base de verdad, y el borrado la saca", async ({ request }) => {
  const canchaId = await primeraCancha(request);
  const turno = turnoUnico();

  const alta = await request.post(`${API}/api/reservas`, { data: { canchaId, ...turno } });
  expect(alta.status()).toBe(201);
  const creada = await alta.json();
  expect(creada.estado).toBe("pendiente");

  // La BASE la devuelve: por id, y en la lista del día.
  const detalle = await request.get(`${API}/api/reservas/${creada.id}`);
  expect(detalle.status()).toBe(200);
  expect((await detalle.json()).canchaId).toBe(canchaId);
  expect((await reservasDelDia(request, turno.fecha)).map((r) => r.id)).toContain(creada.id);

  await borrar(request, creada.id);

  // Y el borrado, comprobado.
  const despues = await request.get(`${API}/api/reservas/${creada.id}`);
  expect(despues.status()).toBe(404);
  expect((await reservasDelDia(request, turno.fecha)).map((r) => r.id)).not.toContain(creada.id);
});

test("un pedido sin cancha lo rechaza la api con 400, y no crea nada", async ({ request }) => {
  const turno = turnoUnico();

  const alta = await request.post(`${API}/api/reservas`, { data: { canchaId: "", ...turno } });
  expect(alta.status()).toBe(400);
  expect((await alta.json()).error).toContain("Faltan datos");

  // Ese día, el jugador no tiene nada: de verdad no se guardó.
  expect(await reservasDelDia(request, turno.fecha)).toHaveLength(0);
});

// La tercera: cancelar una reserva LIBERA el turno para otro. Es la regla del
// solapamiento, que vive en una consulta a Postgres (las reservas de esa cancha
// ese día, menos las canceladas). Si se rompe, escribe el que quería jugar y la
// app le dice «ocupado» con la cancha vacía.
test("una reserva cancelada libera el turno, y una activa lo bloquea", async ({ request }) => {
  const canchaId = await primeraCancha(request);
  const turno = turnoUnico();
  const creadas = [];

  try {
    const primera = await request.post(`${API}/api/reservas`, { data: { canchaId, ...turno } });
    expect(primera.status()).toBe(201);
    creadas.push((await primera.json()).id);

    // Mismo turno, misma cancha: la base dice que está ocupado.
    const ocupado = await request.post(`${API}/api/reservas`, { data: { canchaId, ...turno } });
    expect(ocupado.status()).toBe(422);
    expect((await ocupado.json()).error).toContain("superpone");

    const cancelar = await request.patch(`${API}/api/reservas/${creadas[0]}/estado`, {
      data: { estado: "cancelada" },
    });
    expect(cancelar.status()).toBe(200);
    expect((await cancelar.json()).estado).toBe("cancelada");

    // Cancelada, el turno vuelve a estar libre.
    const otra = await request.post(`${API}/api/reservas`, { data: { canchaId, ...turno } });
    expect(otra.status()).toBe(201);
    creadas.push((await otra.json()).id);
  } finally {
    // Limpia aunque una aserción de arriba haya fallado: QA es uno solo y lo
    // comparten todas las corridas.
    for (const id of creadas) await borrar(request, id);
  }
  expect(await reservasDelDia(request, turno.fecha)).toHaveLength(0);
});
