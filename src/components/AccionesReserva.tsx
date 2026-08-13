"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { transicionesDisponibles } from "@/lib/services/reservas";
import type { EstadoReserva } from "@/lib/services/tipos";

// Muestra SOLO las acciones válidas según el estado (comportamiento testeable #2).
// Las transiciones válidas ya contemplan el rol vía la visibilidad de la reserva:
// un jugador solo llega acá con sus reservas; el admin con cualquiera.
export default function AccionesReserva({
  id,
  estado,
}: {
  id: string;
  estado: EstadoReserva;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const disponibles = transicionesDisponibles(estado);

  async function cambiar(nuevo: EstadoReserva) {
    setError("");
    const res = await fetch(`/api/reservas/${id}/estado`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado: nuevo }),
    });
    if (res.ok) {
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo cambiar el estado.");
    }
  }

  if (disponibles.length === 0) {
    return <p className="text-sm text-gray-500">No hay acciones disponibles.</p>;
  }

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {disponibles.includes("confirmada") && (
          <button
            onClick={() => cambiar("confirmada")}
            className="rounded bg-green-600 px-4 py-2 text-white"
          >
            Confirmar
          </button>
        )}
        {disponibles.includes("cancelada") && (
          <button
            onClick={() => cambiar("cancelada")}
            className="rounded bg-red-600 px-4 py-2 text-white"
          >
            Cancelar
          </button>
        )}
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
