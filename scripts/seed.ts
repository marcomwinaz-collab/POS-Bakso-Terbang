// npm run setup — membuat tabel dan data awal (aman dijalankan berulang kali)
import "dotenv/config";
import { client } from "../src/db";
import { ensureDatabase } from "../src/db/init";

ensureDatabase(client, console.log)
  .then(() => {
    console.log("Database siap. Login: admin / admin123, kasir / kasir123 (Pusat), kasir2 / kasir123 (Cabang 2)");
    process.exit(0);
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
