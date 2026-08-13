// Seed idempotente: usa upsert para poder correrse dos veces sin duplicar datos.
// Se ejecuta con `node prisma/seed.mjs` (no necesita TypeScript en runtime).
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // 3 canchas (idempotente por nombre único).
  const canchas = ["Cancha 1", "Cancha 2", "Cancha 3"];
  for (const nombre of canchas) {
    await prisma.cancha.upsert({
      where: { nombre },
      update: {},
      create: { nombre },
    });
  }

  // Usuarios. Passwords documentadas en el README.
  const adminHash = await bcrypt.hash("admin1234", 10);
  const jugadorHash = await bcrypt.hash("jugador1234", 10);

  await prisma.user.upsert({
    where: { email: "admin@club.com" },
    update: {},
    create: {
      nombre: "Administrador",
      email: "admin@club.com",
      password: adminHash,
      rol: "admin",
    },
  });

  const jugador = await prisma.user.upsert({
    where: { email: "jugador@club.com" },
    update: {},
    create: {
      nombre: "Jugador",
      email: "jugador@club.com",
      password: jugadorHash,
      rol: "jugador",
    },
  });

  // Una reserva de ejemplo (mañana 10:00-11:00) para que el listado no esté vacío.
  // Idempotente: upsert por id fijo.
  const cancha1 = await prisma.cancha.findUnique({ where: { nombre: "Cancha 1" } });
  const manana = new Date();
  manana.setDate(manana.getDate() + 1);
  const fecha = new Date(manana.getFullYear(), manana.getMonth(), manana.getDate());
  const inicio = new Date(fecha);
  inicio.setHours(10, 0, 0, 0);
  const fin = new Date(fecha);
  fin.setHours(11, 0, 0, 0);

  await prisma.reserva.upsert({
    where: { id: "seed-reserva-1" },
    update: { fecha, inicio, fin },
    create: {
      id: "seed-reserva-1",
      fecha,
      inicio,
      fin,
      estado: "pendiente",
      usuarioId: jugador.id,
      canchaId: cancha1.id,
    },
  });

  console.log("Seed completado.");
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
