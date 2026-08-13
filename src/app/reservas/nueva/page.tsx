"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { validarHorario } from "@/lib/services/reservas";

type Cancha = { id: string; nombre: string };

export default function NuevaReservaPage() {
  const router = useRouter();
  const [canchas, setCanchas] = useState<Cancha[]>([]);
  const [canchaId, setCanchaId] = useState("");
  const [fecha, setFecha] = useState("");
  const [horaInicio, setHoraInicio] = useState("");
  const [horaFin, setHoraFin] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/canchas")
      .then((r) => (r.ok ? r.json() : []))
      .then(setCanchas)
      .catch(() => setCanchas([]));
  }, []);

  // Validación de horario en el cliente (misma regla pura del backend).
  let horarioMsg = "";
  if (fecha && horaInicio && horaFin) {
    const val = validarHorario(
      new Date(`${fecha}T${horaInicio}:00`),
      new Date(`${fecha}T${horaFin}:00`)
    );
    if (!val.ok) horarioMsg = val.error;
  }

  const completo = canchaId && fecha && horaInicio && horaFin;
  // Comportamiento testeable #1: botón deshabilitado con datos inválidos.
  const valido = completo && horarioMsg === "";

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/reservas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ canchaId, fecha, horaInicio, horaFin }),
    });
    if (res.ok) {
      const reserva = await res.json();
      router.push(`/reservas/${reserva.id}`);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo crear la reserva.");
    }
  }

  return (
    <div className="mx-auto max-w-md">
      <h1 className="mb-4 text-2xl font-bold">Nueva reserva</h1>
      <form onSubmit={onSubmit} className="space-y-3">
        <label className="block text-sm">
          <span className="text-gray-600">Cancha</span>
          <select
            value={canchaId}
            onChange={(e) => setCanchaId(e.target.value)}
            className="mt-1 w-full rounded border p-2"
          >
            <option value="">Elegí una cancha</option>
            {canchas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="text-gray-600">Fecha</span>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="mt-1 w-full rounded border p-2"
          />
        </label>
        <div className="flex gap-3">
          <label className="block flex-1 text-sm">
            <span className="text-gray-600">Hora inicio</span>
            <input
              type="time"
              value={horaInicio}
              onChange={(e) => setHoraInicio(e.target.value)}
              className="mt-1 w-full rounded border p-2"
            />
          </label>
          <label className="block flex-1 text-sm">
            <span className="text-gray-600">Hora fin</span>
            <input
              type="time"
              value={horaFin}
              onChange={(e) => setHoraFin(e.target.value)}
              className="mt-1 w-full rounded border p-2"
            />
          </label>
        </div>

        {horarioMsg && <p className="text-sm text-amber-600">{horarioMsg}</p>}
        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={!valido}
          className="w-full rounded bg-blue-600 p-2 text-white disabled:opacity-50"
        >
          Reservar
        </button>
      </form>
    </div>
  );
}
