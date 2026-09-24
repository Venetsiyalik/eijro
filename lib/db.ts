import { PrismaClient } from "@prisma/client";
import { withRetry } from "@/lib/db-retry";
import { resolveDatabaseUrl } from "@/lib/env";

function createClient() {
  const url = resolveDatabaseUrl()?.value;
  return new PrismaClient({
    ...(url ? { datasourceUrl: url } : {}),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  }).$extends({
    query: {
      $allOperations({ operation, args, query }) {
        return withRetry(() => query(args), operation);
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createClient> | undefined;
};

export const db = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
