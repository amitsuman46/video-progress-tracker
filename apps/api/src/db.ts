import { PrismaClient } from "@prisma/client";
import { config } from "./config.js";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | null };

function createPrisma(): PrismaClient | null {
  if (!config.databaseUrl) return null;
  return (
    globalForPrisma.prisma ??
    new PrismaClient({
      log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    })
  );
}

export const prisma = createPrisma();
if (prisma && process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
