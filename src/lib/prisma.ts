import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = global as unknown as { prisma: PrismaClient | undefined };

const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL }) : undefined;
const adapter = pool ? new PrismaPg(pool) : undefined;
export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["error"], ...(adapter ? { adapter } : {}) });

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma;
}
