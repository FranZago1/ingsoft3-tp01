import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { soloFecha, soloHora } from "@/lib/format";
import ReservasFiltro, { type ReservaDTO } from "@/components/ReservasFiltro";

export const dynamic = "force-dynamic";

export default async function AdminReservasPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  // Solo admin. Un jugador que entra por URL vuelve a sus reservas.
  if (user.rol !== "admin") redirect("/reservas");

  const reservas = await prisma.reserva.findMany({
    orderBy: { inicio: "asc" },
    include: { cancha: true, usuario: { select: { email: true } } },
  });
  const canchas = await prisma.cancha.findMany({ orderBy: { nombre: "asc" } });

  const dto: ReservaDTO[] = reservas.map((r) => ({
    id: r.id,
    canchaId: r.canchaId,
    canchaNombre: r.cancha.nombre,
    fecha: soloFecha(r.inicio),
    inicio: soloHora(r.inicio),
    fin: soloHora(r.fin),
    estado: r.estado,
    usuarioEmail: r.usuario.email,
  }));

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Todas las reservas (admin)</h1>
      <ReservasFiltro reservas={dto} canchas={canchas} admin />
    </div>
  );
}
