import { redirect } from "next/navigation";
import { apiGet } from "@/lib/api";
import { aReservaDTO } from "@/lib/format";
import type { Cancha, ReservaAPI } from "@/lib/tipos";
import ReservasFiltro from "@/components/ReservasFiltro";

// Depende de la cookie de sesión: nunca se puede prerenderizar.
export const dynamic = "force-dynamic";

export default async function ReservasPage() {
  // Sin ?todas: el backend devuelve solo las del usuario logueado (regla 6).
  const [reservas, canchas] = await Promise.all([
    apiGet<ReservaAPI[]>("/api/reservas"),
    apiGet<Cancha[]>("/api/canchas"),
  ]);

  if (reservas.status === 401 || canchas.status === 401) redirect("/login");

  if (!reservas.data || !canchas.data) {
    return (
      <p className="rounded border bg-white p-4 text-red-600">
        {reservas.error ?? canchas.error}
      </p>
    );
  }

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Mis reservas</h1>
      <ReservasFiltro
        reservas={reservas.data.map((r) => aReservaDTO(r))}
        canchas={canchas.data}
      />
    </div>
  );
}
