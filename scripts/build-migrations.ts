// Menyalin file SQL di folder drizzle/ ke src/db/migrations.generated.ts
// agar migrasi ikut terbundel (tidak perlu akses file saat berjalan di Vercel).
// Jalankan setelah mengubah schema: npm run db:generate
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const dir = join(process.cwd(), "drizzle");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();
const migrations = files.map((f) => ({
  name: f.replace(/\.sql$/, ""),
  statements: readFileSync(join(dir, f), "utf8")
    .split("--> statement-breakpoint")
    .map((s) => s.trim())
    .filter(Boolean),
}));
writeFileSync(
  join(process.cwd(), "src/db/migrations.generated.ts"),
  `// File ini dibuat otomatis oleh scripts/build-migrations.ts — jangan diedit manual.\nexport const MIGRATIONS: { name: string; statements: string[] }[] = ${JSON.stringify(migrations, null, 2)};\n`,
);
console.log(`${migrations.length} migrasi ditulis ke src/db/migrations.generated.ts`);
