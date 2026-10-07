"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { transicionesDisponibles } from "@/lib/validacion";
import type { EstadoReserva } from "@/lib/tipos";

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

  // Borrar la saca de la base (cancelar la deja en el historial). Vuelve a la
  // lista, que es donde se ve que ya no está.
  async function borrar() {
    setError("");
    const res = await fetch(`/api/reservas/${id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/reservas");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo borrar la reserva.");
    }
  }

  return (
    <div className="space-y-2">
      {disponibles.length === 0 && (
        <p className="text-sm text-gray-500">No hay cambios de estado disponibles.</p>
      )}
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
        <button
          onClick={borrar}
          className="ml-auto rounded border border-red-600 px-4 py-2 text-red-600"
        >
          Borrar reserva
        </button>
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-600">
          {error}
        </p>
      )}
    </div>
  );
}
