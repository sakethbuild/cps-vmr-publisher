import { PrismaClient } from "@prisma/client";
import { PrismaLibSQL } from "@prisma/adapter-libsql";

function createPrismaClient(): PrismaClient {
  // Use Turso (LibSQL) adapter in production when TURSO_DATABASE_URL is set
  if (process.env.TURSO_DATABASE_URL) {
    const adapter = new PrismaLibSQL({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });

    return new PrismaClient({
      adapter,
      log: ["error"],
    });
  }

  // Local development: use SQLite file directly
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
