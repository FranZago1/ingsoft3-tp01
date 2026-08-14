import { PrismaClient } from "@prisma/client";

// Singleton de PrismaClient para no abrir una conexión nueva por cada
// hot-reload en desarrollo.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
