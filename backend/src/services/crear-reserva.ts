// Orquesta la creación de una reserva: parsea el pedido, aplica las reglas y
// manda a guardar. NO sabe de Prisma ni de Express.
//
// La diferencia con el resto de los servicios es que éste necesita hablar con
// la base. En vez de importarla, la RECIBE: quien lo construye decide qué le
// pasa. La aplicación real le pasa un repositorio hecho con Prisma; el test le
// pasa dobles. Ésa es la abertura que hace testeable esta lógica sin una base
// levantada, y antes de este refactor no existía: estaba adentro del handler.
import { rangoDelDia, validarNuevaReserva } from "./reservas";
import { type EstadoReserva, type ReservaDominio } from "./tipos";

// Lo que llega del cuerpo del pedido, sin validar todavía.
export type PedidoDeReserva = {
  canchaId?: unknown;
  fecha?: unknown;
  horaInicio?: unknown;
  horaFin?: unknown;
};

// Lo que se persiste. El estado es literal: toda reserva nace "pendiente".
export type DatosNuevaReserva = {
  fecha: Date;
  inicio: Date;
  fin: Date;
  estado: EstadoReserva;
  usuarioId: string;
  canchaId: string;
};

// El contrato con la base: qué se le puede pedir, no cómo lo hace.
// Está en términos del dominio (Date, ReservaDominio), no de Prisma.
export type RepositorioReservas<T> = {
  buscarCancha(id: string): Promise<{ id: string } | null>;
  reservasDelDia(
    canchaId: string,
    desde: Date,
    hasta: Date
  ): Promise<ReservaDominio[]>;
  guardar(datos: DatosNuevaReserva): Promise<T>;
};

// Se distingue "el pedido está mal escrito" (400) de "el pedido está bien
// escrito pero viola una regla de negocio" (422). El handler traduce ese
// motivo a un código HTTP: acá no hay un solo número de estado.
export type MotivoDeFallo = "pedido-invalido" | "regla-violada";

export type ResultadoCreacion<T> =
  | { ok: true; reserva: T }
  | { ok: false; error: string; motivo: MotivoDeFallo };

const pedidoInvalido = <T>(error: string): ResultadoCreacion<T> => ({
  ok: false,
  error,
  motivo: "pedido-invalido",
});

const reglaViolada = <T>(error: string): ResultadoCreacion<T> => ({
  ok: false,
  error,
  motivo: "regla-violada",
});

const esTexto = (v: unknown): v is string =>
  typeof v === "string" && v.length > 0;

export async function crearReserva<T>(
  pedido: PedidoDeReserva,
  usuarioId: string,
  repo: RepositorioReservas<T>,
  ahora: Date
): Promise<ResultadoCreacion<T>> {
  const { canchaId, fecha, horaInicio, horaFin } = pedido;

  if (
    !esTexto(canchaId) ||
    !esTexto(fecha) ||
    !esTexto(horaInicio) ||
    !esTexto(horaFin)
  ) {
    return pedidoInvalido("Faltan datos: canchaId, fecha, horaInicio, horaFin.");
  }

  const inicio = new Date(`${fecha}T${horaInicio}:00`);
  const fin = new Date(`${fecha}T${horaFin}:00`);
  if (isNaN(inicio.getTime()) || isNaN(fin.getTime())) {
    return pedidoInvalido("Fecha u hora con formato inválido.");
  }

  const rango = rangoDelDia(fecha);
  if (!rango) return pedidoInvalido("El parámetro fecha es inválido.");

  const cancha = await repo.buscarCancha(canchaId);
  if (!cancha) return pedidoInvalido("La cancha no existe.");

  // Se traen las reservas de esa cancha ese día y la regla de solapamiento la
  // decide el servicio puro: la consulta es del repositorio, la regla no.
  const existentes = await repo.reservasDelDia(
    canchaId,
    rango.desde,
    rango.hasta
  );

  // Reglas 1, 2 y 3 juntas. `ahora` entra por parámetro: sin reloj real.
  const validacion = validarNuevaReserva(
    { inicio, fin, canchaId },
    existentes,
    ahora
  );
  if (!validacion.ok) return reglaViolada(validacion.error);

  // Dos reglas que no se delegan al cliente: la reserva nace "pendiente" y
  // siempre a nombre de quien pide. No se puede reservar para otro.
  const reserva = await repo.guardar({
    fecha: rango.desde,
    inicio,
    fin,
    estado: "pendiente",
    usuarioId,
    canchaId,
  });

  return { ok: true, reserva };
}
