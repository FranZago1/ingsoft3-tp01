"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

export type ReservaDTO = {
  id: string;
  canchaId: string;
  canchaNombre: string;
  fecha: string; // YYYY-MM-DD
  inicio: string; // HH:mm
  fin: string; // HH:mm
  estado: string;
  usuarioEmail?: string; // solo en vista admin
};

const COLOR_ESTADO: Record<string, string> = {
  pendiente: "bg-amber-100 text-amber-800",
  confirmada: "bg-green-100 text-green-800",
  cancelada: "bg-gray-200 text-gray-600",
};

export default function ReservasFiltro({
  reservas,
  canchas,
  admin = false,
}: {
  reservas: ReservaDTO[];
  canchas: { id: string; nombre: string }[];
  admin?: boolean;
}) {
  const [fecha, setFecha] = useState("");
  const [canchaId, setCanchaId] = useState("");

  // Comportamiento testeable #3: el contador se recalcula al filtrar.
  const filtradas = useMemo(
    () =>
      reservas.filter(
        (r) =>
          (fecha === "" || r.fecha === fecha) &&
          (canchaId === "" || r.canchaId === canchaId)
      ),
    [reservas, fecha, canchaId]
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <label className="text-sm">
          <span className="block text-gray-600">Fecha</span>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="rounded border p-2"
          />
        </label>
        <label className="text-sm">
          <span className="block text-gray-600">Cancha</span>
          <select
            value={canchaId}
            onChange={(e) => setCanchaId(e.target.value)}
            className="rounded border p-2"
          >
            <option value="">Todas</option>
            {canchas.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nombre}
              </option>
            ))}
          </select>
        </label>
        {(fecha || canchaId) && (
          <button
            onClick={() => {
              setFecha("");
              setCanchaId("");
            }}
            className="rounded border p-2 text-sm hover:bg-gray-100"
          >
            Limpiar
          </button>
        )}
      </div>

      <p className="mb-2 text-sm text-gray-600" data-testid="contador">
        {filtradas.length} reserva{filtradas.length === 1 ? "" : "s"}
      </p>

      <ul className="space-y-2">
        {filtradas.map((r) => (
          <li key={r.id}>
            <Link
              href={`/reservas/${r.id}`}
              className="flex items-center justify-between rounded border bg-white p-3 hover:bg-gray-50"
            >
              <span>
                <span className="font-medium">{r.canchaNombre}</span> · {r.fecha}{" "}
                {r.inicio}–{r.fin}
                {admin && r.usuarioEmail && (
                  <span className="text-gray-500"> · {r.usuarioEmail}</span>
                )}
              </span>
              <span
                className={`rounded px-2 py-1 text-xs ${
                  COLOR_ESTADO[r.estado] ?? ""
                }`}
              >
                {r.estado}
              </span>
            </Link>
          </li>
        ))}
        {filtradas.length === 0 && (
          <li className="rounded border bg-white p-3 text-gray-500">
            No hay reservas para ese filtro.
          </li>
        )}
      </ul>
    </div>
  );
}
