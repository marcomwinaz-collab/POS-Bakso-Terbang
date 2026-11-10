// Membuat transaksi contoh 30 hari terakhir agar laporan & analisis terlihat terisi.
// Jalankan: npm run db:demo   (JANGAN dijalankan di database yang dipakai berjualan)
import "dotenv/config";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as s from "../src/db/schema";

const client = createClient({ url: process.env.DATABASE_URL ?? "file:./data/pos.db", authToken: process.env.DATABASE_AUTH_TOKEN || undefined });
const db = drizzle(client, { schema: s });
const OFFSET = Number(process.env.TZ_OFFSET_HOURS ?? 7) * 3600_000;

const rand = (a: number, b: number) => Math.floor(Math.random() * (b - a + 1)) + a;
const pick = <T,>(arr: readonly T[]) => arr[rand(0, arr.length - 1)];

async function main() {
  const products = await db.select().from(s.products);
  const cats = new Map((await db.select().from(s.categories)).map((c) => [c.id, c.name]));
  const tables = await db.select().from(s.diningTables);
  const users = await db.select().from(s.users);
  const outlets = await db.select().from(s.outlets);
  if (!products.length) throw new Error("Jalankan npm run setup terlebih dahulu.");
  const methods = ["CASH", "CASH", "CASH", "QRIS", "QRIS", "DEBIT", "TRANSFER"] as const;
  const hourWeights = [10, 11, 11, 12, 12, 12, 13, 13, 14, 15, 16, 17, 17, 18, 18, 19, 19, 19, 20, 20, 21];
  const admin = users.find((u) => u.role === "ADMIN")!;

  let n = 0;
  for (const outlet of outlets) {
    const outletTables = tables.filter((t) => t.outletId === outlet.id);
    const cashiers = users.filter((u) => u.outletId === outlet.id);
    const scale = outlet.id === outlets[0].id ? 1 : 0.6;
    for (let d = 29; d >= 0; d--) {
      const today = new Date(Date.now() + OFFSET);
      today.setUTCHours(0, 0, 0, 0);
      const base = today.getTime() - d * 86400_000 - OFFSET;
      const weekend = [0, 6].includes(new Date(base + OFFSET + 3600_000).getUTCDay());
      const count = Math.round((rand(15, 35) + (weekend ? 15 : 0)) * scale);
      for (let i = 0; i < count; i++) {
        const at = base + pick(hourWeights) * 3600_000 + rand(0, 59) * 60_000;
        if (at + 10 * 60_000 > Date.now()) continue;
        const lines = Array.from({ length: rand(1, 4) }, () => {
          const p = pick(products);
          const qty = rand(1, 3);
          return { productId: p.id, name: p.name, categoryName: p.categoryId ? cats.get(p.categoryId) ?? null : null, price: p.price, qty, subtotal: p.price * qty };
        });
        const subtotal = lines.reduce((a, l) => a + l.subtotal, 0);
        const discount = Math.random() < 0.1 ? 2000 : 0;
        const total = subtotal - discount;
        const r = Math.random();
        const type = r < 0.55 ? "DINE_IN" : r < 0.8 ? "TAKEAWAY" : "ONLINE";
        const method = type === "ONLINE" ? pick(["GOFOOD", "GRABFOOD", "SHOPEEFOOD", "TIKTOK"] as const) : pick(methods);
        const paid = method === "CASH" ? Math.ceil(total / 10000) * 10000 : total;
        const table = type === "DINE_IN" ? pick(outletTables) : null;
        const refunded = Math.random() < 0.015;
        n++;
        const [o] = await db
          .insert(s.orders)
          .values({
            code: `DEMO-${outlet.code}-${String(n).padStart(5, "0")}`,
            outletId: outlet.id,
            type,
            tableId: table?.id ?? null,
            tableNumber: table?.number ?? null,
            guests: table ? rand(1, 4) : null,
            status: refunded ? "REFUNDED" : "PAID",
            subtotal,
            discount,
            total,
            paymentMethod: method,
            paidAmount: paid,
            change: paid - total,
            cashierId: cashiers.length ? pick(cashiers).id : admin.id,
            createdAt: new Date(at),
            paidAt: new Date(at + 10 * 60_000),
            ...(refunded
              ? { refundedAt: new Date(at + 30 * 60_000), refundedById: admin.id, cancelReason: pick(["Salah input menu", "Pelanggan komplain", "Pesanan dobel"]) }
              : {}),
          })
          .returning();
        await db.insert(s.orderItems).values(lines.map((l) => ({ ...l, orderId: o.id })));
      }
    }
  }
  console.log(`${n} transaksi contoh dibuat.`);
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
