// Suite E2E (TP7): un navegador de verdad usando el front de QA, que le habla a
// la api de QA, que le habla a su base. Nada de page.route ni mocks: si el
// navegador no le pega a la api, no es end-to-end.
//
// Cada flujo interactúa (llena, clickea), afirma sobre el dato que ÉL MISMO
// produjo (su turno único) y limpia lo que crea, comprobándolo. Ningún sleep:
// las aserciones esperan solas hasta su tope (playwright.config.js).
import { expect, test } from "@playwright/test";
import { JUGADOR, turnoUnico } from "./datos.js";

async function ingresar(page) {
  await page.goto("/login");
  await page.getByLabel("Email").fill(JUGADOR.email);
  await page.getByLabel("Contraseña").fill(JUGADOR.password);
  await page.getByRole("button", { name: "Ingresar" }).click();
  await expect(page).toHaveURL(/\/reservas$/);
}

// Llena el formulario de nueva reserva como lo haría una persona.
async function pedirTurno(page, turno) {
  await page.goto("/reservas/nueva");
  await page.getByLabel("Cancha").selectOption({ label: "Cancha 1" });
  await page.getByLabel("Fecha").fill(turno.fecha);
  await page.getByLabel("Hora inicio").fill(turno.horaInicio);
  await page.getByLabel("Hora fin").fill(turno.horaFin);
  await page.getByRole("button", { name: "Reservar" }).click();
}

// La fila de la lista «Mis reservas» que corresponde a ESTE turno.
const filaDe = (page, turno) =>
  page.getByRole("link", { name: `${turno.fecha} ${turno.horaInicio}–${turno.horaFin}` });

// Borra desde la pantalla de detalle y comprueba que la lista ya no la tiene.
async function borrarDesdeDetalle(page, turno) {
  await page.getByRole("button", { name: "Borrar reserva" }).click();
  await expect(page).toHaveURL(/\/reservas$/);
  await expect(filaDe(page, turno)).toHaveCount(0);
}

test.beforeEach(async ({ page }) => {
  await ingresar(page);
});

test("reservar un turno lo muestra en mis reservas, y borrarlo lo saca", async ({ page }) => {
  const turno = turnoUnico();
  await pedirTurno(page, turno);

  // El alta lleva al detalle de la reserva recién creada.
  await expect(page).toHaveURL(/\/reservas\/[^/]+$/);
  await expect(page.getByText(`${turno.horaInicio}–${turno.horaFin}`)).toBeVisible();

  // Y en la lista está, con su turno.
  await page.goto("/reservas");
  await expect(filaDe(page, turno)).toBeVisible();

  await filaDe(page, turno).click();
  await borrarDesdeDetalle(page, turno);
});

test("un turno ocupado muestra el error y no crea una segunda reserva", async ({ page }) => {
  const turno = turnoUnico();
  // Alguien ya tiene ese turno. Se arma por la api (a través del front, con la
  // sesión del navegador): lo que se prueba es la pantalla, no el alta.
  const canchas = await (await page.request.get("/api/canchas")).json();
  const cancha1 = canchas.find((c) => c.nombre === "Cancha 1");
  const previa = await page.request.post("/api/reservas", {
    data: { canchaId: cancha1.id, ...turno },
  });
  expect(previa.status()).toBe(201);
  const idPrevia = (await previa.json()).id;

  try {
    await pedirTurno(page, turno);

    // El usuario ve el error del backend, y se queda en el formulario.
    await expect(page.getByRole("alert").filter({ hasText: "superpone" })).toBeVisible();
    await expect(page).toHaveURL(/\/reservas\/nueva$/);

    // En su lista, ese turno aparece UNA vez: la de antes.
    await page.goto("/reservas");
    await expect(filaDe(page, turno)).toHaveCount(1);
  } finally {
    const r = await page.request.delete(`/api/reservas/${idPrevia}`);
    expect(r.status()).toBe(204);
  }
  await page.reload();
  await expect(filaDe(page, turno)).toHaveCount(0);
});

// El tercero, el de todos los días: el jugador que no puede ir cancela su turno.
// Si mañana no anda, escribe él (no puede liberar la cancha) y el club (la
// cancha figura ocupada y nadie la usa).
test("cancelar mi reserva la deja cancelada, sin opción de volver a cancelarla", async ({ page }) => {
  const turno = turnoUnico();
  await pedirTurno(page, turno);
  await expect(page).toHaveURL(/\/reservas\/[^/]+$/);

  await page.getByRole("button", { name: "Cancelar" }).click();
  await expect(page.getByText("cancelada", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Cancelar" })).toHaveCount(0);

  // La lista también la muestra cancelada (la leyó de la base, no del estado de la pantalla).
  await page.goto("/reservas");
  await expect(filaDe(page, turno)).toContainText("cancelada");

  await filaDe(page, turno).click();
  await borrarDesdeDetalle(page, turno);
});
