import type { Client } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";
import { MIGRATIONS } from "./migrations.generated";
import { seedIfEmpty } from "./seed-data";

const TABLE = "_app_migrations";

async function tableExists(client: Client, name: string) {
  const r = await client.execute({ sql: "select 1 from sqlite_master where type='table' and name=?", args: [name] });
  return r.rows.length > 0;
}

/**
 * Menyiapkan database: membuat/memperbarui tabel lalu mengisi data awal bila kosong.
 * Dipanggil otomatis saat server mulai (src/instrumentation.ts) dan oleh `npm run setup`.
 */
export async function ensureDatabase(client: Client, log: (m: string) => void = () => {}) {
  const hadTracking = await tableExists(client, TABLE);
  await client.execute(`create table if not exists ${TABLE} (name text primary key, applied_at integer not null)`);

  // database lama yang dibuat dengan `drizzle-kit push`: anggap migrasi awal sudah diterapkan
  if (!hadTracking && (await tableExists(client, "users"))) {
    await client.execute({ sql: `insert or ignore into ${TABLE} (name, applied_at) values (?, ?)`, args: [MIGRATIONS[0].name, Date.now()] });
  }

  const applied = new Set((await client.execute(`select name from ${TABLE}`)).rows.map((r) => String(r.name)));
  for (const m of MIGRATIONS) {
    if (applied.has(m.name)) continue;
    log(`Menerapkan migrasi ${m.name}...`);
    try {
      await client.batch([...m.statements, { sql: `insert into ${TABLE} (name, applied_at) values (?, ?)`, args: [m.name, Date.now()] }], "write");
    } catch (e) {
      // instance lain mungkin sudah menerapkannya bersamaan
      const again = await client.execute({ sql: `select 1 from ${TABLE} where name=?`, args: [m.name] });
      if (!again.rows.length) throw e;
    }
  }

  const seeded = await seedIfEmpty(drizzle(client, { schema }));
  if (seeded) log("Data awal dibuat. Login: admin / admin123");
}
