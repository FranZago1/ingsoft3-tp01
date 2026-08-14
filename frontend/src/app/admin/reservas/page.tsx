import { redirect } from "next/navigation";
import { apiGet } from "@/lib/api";
import { aReservaDTO } from "@/lib/format";
import type { Cancha, ReservaAPI } from "@/lib/tipos";
import ReservasFiltro from "@/components/ReservasFiltro";

export const dynamic = "force-dynamic";

export default async function AdminReservasPage() {
  // ?todas=true es la única forma de ver reservas ajenas y el backend solo se
  // la concede a un admin: a un jugador le responde 403 (regla 6). Esta
  // pantalla existe justamente para que esa regla tenga sentido.
  const [reservas, canchas] = await Promise.all([
    apiGet<ReservaAPI[]>("/api/reservas?todas=true"),
    apiGet<Cancha[]>("/api/canchas"),
  ]);

  if (reservas.status === 401 || canchas.status === 401) redirect("/login");
  // Un jugador que entra por URL rebota a sus propias reservas.
  if (reservas.status === 403) redirect("/reservas");

  if (!reservas.data || !canchas.data) {
    return (
      <p className="rounded border bg-white p-4 text-red-600">
        {reservas.error ?? canchas.error}
      </p>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Todas las reservas (admin)</h1>
      <ReservasFiltro
        reservas={reservas.data.map((r) => aReservaDTO(r, true))}
        canchas={canchas.data}
        admin
      />
    </div>
  );
}
