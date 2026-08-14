import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { apiGet } from "@/lib/api";
import { getSesion } from "@/lib/sesion";
import { soloFecha, soloHora } from "@/lib/format";
import type { ReservaAPI } from "@/lib/tipos";
import AccionesReserva from "@/components/AccionesReserva";

export const dynamic = "force-dynamic";

export default async function DetalleReservaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sesion = await getSesion();
  const { status, data: reserva } = await apiGet<ReservaAPI>(
    `/api/reservas/${id}`
  );

  if (status === 401) redirect("/login");
  // Regla 6: la reserva es de otro. El backend ya dijo 403; no la mostramos.
  if (status === 403) redirect("/reservas");
  if (status === 404 || !reserva) notFound();

  const inicio = new Date(reserva.inicio);
  const fin = new Date(reserva.fin);

  return (
    <div className="mx-auto max-w-md">
      <Link href="/reservas" className="text-sm text-blue-600 hover:underline">
        ← Volver
      </Link>
      <h1 className="mb-4 mt-2 text-2xl font-bold">Detalle de reserva</h1>

      <div className="mb-4 space-y-1 rounded border bg-white p-4">
        <p>
          <span className="text-gray-600">Cancha:</span> {reserva.cancha.nombre}
        </p>
        <p>
          <span className="text-gray-600">Fecha:</span> {soloFecha(inicio)}
        </p>
        <p>
          <span className="text-gray-600">Horario:</span> {soloHora(inicio)}–
          {soloHora(fin)}
        </p>
        <p>
          <span className="text-gray-600">Estado:</span>{" "}
          <span className="font-medium">{reserva.estado}</span>
        </p>
        {sesion?.rol === "admin" && (
          <p>
            <span className="text-gray-600">Reservó:</span>{" "}
            {reserva.usuario.nombre} ({reserva.usuario.email})
          </p>
        )}
      </div>

      {/* Muestra solo las acciones válidas para el estado actual. */}
      <AccionesReserva id={reserva.id} estado={reserva.estado} />
    </div>
  );
}
