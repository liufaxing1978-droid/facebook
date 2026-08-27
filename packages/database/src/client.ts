import { PrismaClient } from "@prisma/client";

type PrismaGlobal = typeof globalThis & {
  __xstMetaPrisma?: PrismaClient;
};

const prismaGlobal = globalThis as PrismaGlobal;

export const prisma = prismaGlobal.__xstMetaPrisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  prismaGlobal.__xstMetaPrisma = prisma;
}
