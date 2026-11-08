import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

/** Bersihkan nilai env dari spasi/tanda kutip yang sering ikut tersalin */
export function cleanEnv(v: string | undefined) {
  return (v ?? "").trim().replace(/^["']|["']$/g, "").trim();
}

/** Mendukung DATABASE_URL atau TURSO_DATABASE_URL (diisi otomatis oleh integrasi Turso di Vercel) */
export function databaseUrl() {
  return cleanEnv(process.env.DATABASE_URL) || cleanEnv(process.env.TURSO_DATABASE_URL) || "file:./data/pos.db";
}

export function databaseToken() {
  return cleanEnv(process.env.DATABASE_AUTH_TOKEN) || cleanEnv(process.env.TURSO_AUTH_TOKEN) || undefined;
}

const globalForDb = globalThis as unknown as { client?: ReturnType<typeof createClient> };

const client =
  globalForDb.client ??
  createClient({
    url: databaseUrl(),
    authToken: databaseToken(),
  });

globalForDb.client = client;

export const db = drizzle(client, { schema });
export { schema, client };
