import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { soloFecha, soloHora } from "@/lib/format";
import ReservasFiltro, { type ReservaDTO } from "@/components/ReservasFiltro";

// Fuerza render dinámico: depende de la cookie de sesión.
export const dynamic = "force-dynamic";

export default async function ReservasPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const reservas = await prisma.reserva.findMany({
    where: { usuarioId: user.id },
    orderBy: { inicio: "asc" },
    include: { cancha: true },
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
  }));

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold">Mis reservas</h1>
      <ReservasFiltro reservas={dto} canchas={canchas} />
    </div>
  );
}
