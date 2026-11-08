// Membuat transaksi contoh 30 hari terakhir agar dashboard terlihat terisi.
// Jalankan: npm run db:demo   (JANGAN dijalankan di database produksi)
import "dotenv/config";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as s from "../src/db/schema";

const client = createClient({ url: process.env.DATABASE_URL ?? "file:./data/pos.db", authToken: process.env.DATABASE_AUTH_TOKEN || undefined });
const db = drizzle(client, { schema: s });
const OFFSET = Number(process.env.TZ_OFFSET_HOURS ?? 7) * 3600_000;

const rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = <T,>(arr: T[]) => arr[rand(0, arr.length - 1)];

async function main() {
  const products = await db.select().from(s.products);
  const tables = await db.select().from(s.diningTables);
  const users = await db.select().from(s.users);
  if (!products.length) throw new Error("Jalankan npm run setup terlebih dahulu.");
  const methods = ["CASH", "CASH", "CASH", "QRIS", "QRIS", "DEBIT", "TRANSFER"] as const;
  const hourWeights = [10, 11, 11, 12, 12, 12, 13, 13, 14, 15, 16, 17, 17, 18, 18, 19, 19, 19, 20, 20, 21];

  let n = 0;
  for (let d = 29; d >= 0; d--) {
    const dayStartLocal = new Date();
    dayStartLocal.setUTCHours(0, 0, 0, 0);
    const base = dayStartLocal.getTime() - d * 86400_000 - OFFSET;
    const count = rand(15, 40) + (new Date(base + OFFSET).getUTCDay() % 6 === 0 ? 15 : 0);
    for (let i = 0; i < count; i++) {
      const at = base + pick(hourWeights) * 3600_000 + rand(0, 59) * 60_000;
      if (at > Date.now()) continue;
      const lines = Array.from({ length: rand(1, 4) }, () => {
        const p = pick(products);
        const qty = rand(1, 3);
        return { productId: p.id, name: p.name, price: p.price, cost: p.cost, qty, subtotal: p.price * qty };
      });
      const subtotal = lines.reduce((a, l) => a + l.subtotal, 0);
      const discount = Math.random() < 0.1 ? 2000 : 0;
      const total = subtotal - discount;
      const method = pick([...methods]);
      const paid = method === "CASH" ? Math.ceil(total / 10000) * 10000 : total;
      const dine = Math.random() < 0.65;
      n++;
      const [o] = await db
        .insert(s.orders)
        .values({
          code: `DEMO-${String(n).padStart(5, "0")}`,
          type: dine ? "DINE_IN" : "TAKEAWAY",
          tableId: dine ? pick(tables).id : null,
          status: "PAID",
          subtotal,
          discount,
          total,
          paymentMethod: method,
          paidAmount: paid,
          change: paid - total,
          cashierId: pick(users).id,
          createdAt: new Date(at),
          paidAt: new Date(at + 10 * 60_000),
        })
        .returning();
      await db.insert(s.orderItems).values(lines.map((l) => ({ ...l, orderId: o.id })));
    }
  }
  console.log(`${n} transaksi contoh dibuat (stok tidak diubah).`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
