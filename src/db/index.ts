import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

/** Bersihkan nilai env dari spasi/tanda kutip yang sering ikut tersalin */
export function cleanEnv(v: string | undefined) {
  return (v ?? "").trim().replace(/^["']|["']$/g, "").trim();
}

export function databaseUrl() {
  return cleanEnv(process.env.DATABASE_URL) || "file:./data/pos.db";
}

const globalForDb = globalThis as unknown as { client?: ReturnType<typeof createClient> };

const client =
  globalForDb.client ??
  createClient({
    url: databaseUrl(),
    authToken: cleanEnv(process.env.DATABASE_AUTH_TOKEN) || undefined,
  });

globalForDb.client = client;

export const db = drizzle(client, { schema });
export { schema, client };
