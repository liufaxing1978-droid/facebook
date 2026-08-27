import { Prisma } from "@prisma/client";
import { prisma } from "./client";

export async function databaseHealth() {
  await prisma.$queryRaw(Prisma.sql`SELECT 1`);
  return { status: "ok" as const };
}
