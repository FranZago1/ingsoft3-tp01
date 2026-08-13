import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { puedeAcceder } from "@/lib/services/reservas";
import { soloFecha, soloHora } from "@/lib/format";
import AccionesReserva from "@/components/AccionesReserva";

export const dynamic = "force-dynamic";

export default async function DetalleReservaPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { id } = await params;
  const reserva = await prisma.reserva.findUnique({
    where: { id },
    include: { cancha: true, usuario: { select: { nombre: true, email: true } } },
  });
  if (!reserva) notFound();

  // Regla 6: acceso ajeno → no lo dejamos ver.
  if (!puedeAcceder(user, reserva)) redirect("/reservas");

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
          <span className="text-gray-600">Fecha:</span> {soloFecha(reserva.inicio)}
        </p>
        <p>
          <span className="text-gray-600">Horario:</span>{" "}
          {soloHora(reserva.inicio)}–{soloHora(reserva.fin)}
        </p>
        <p>
          <span className="text-gray-600">Estado:</span>{" "}
          <span className="font-medium">{reserva.estado}</span>
        </p>
        {user.rol === "admin" && (
          <p>
            <span className="text-gray-600">Reservó:</span>{" "}
            {reserva.usuario.nombre} ({reserva.usuario.email})
          </p>
        )}
      </div>

      <AccionesReserva id={reserva.id} estado={reserva.estado} />
    </div>
  );
}
