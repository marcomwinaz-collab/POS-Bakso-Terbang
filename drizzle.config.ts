import "dotenv/config";
import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dialect: "turso",
  dbCredentials: {
    url: process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL || "file:./data/pos.db",
    ...(process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN ? { authToken: process.env.DATABASE_AUTH_TOKEN || process.env.TURSO_AUTH_TOKEN } : {}),
  },
});
