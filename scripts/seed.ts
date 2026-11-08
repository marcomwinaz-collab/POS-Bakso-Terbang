// npm run setup — membuat tabel dan data awal (aman dijalankan berulang kali)
import "dotenv/config";
import { createClient } from "@libsql/client";
import { ensureDatabase } from "../src/db/init";

const client = createClient({
  url: process.env.DATABASE_URL ?? "file:./data/pos.db",
  authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
});

ensureDatabase(client, console.log)
  .then(() => {
    console.log("Database siap. Login: admin / admin123, kasir / kasir123 (Pusat), kasir2 / kasir123 (Cabang 2)");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
