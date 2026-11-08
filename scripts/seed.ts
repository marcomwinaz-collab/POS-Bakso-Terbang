import "dotenv/config";
import bcrypt from "bcryptjs";
import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as s from "../src/db/schema";

const client = createClient({
  url: process.env.DATABASE_URL ?? "file:./data/pos.db",
  authToken: process.env.DATABASE_AUTH_TOKEN || undefined,
});
const db = drizzle(client, { schema: s });

async function main() {
  const existing = await db.select().from(s.users).limit(1);
  if (existing.length) {
    console.log("Database sudah berisi data, seed dilewati.");
    return;
  }

  await db.insert(s.settings).values({ id: 1, businessName: "Bakso Terbang" });

  const [pusat, cabang] = await db
    .insert(s.outlets)
    .values([
      { code: "PST", name: "Bakso Terbang Pusat", address: "Jl. Contoh No. 1, Jakarta", phone: "0812-0000-0001", receiptFooter: "Terima kasih, sampai jumpa lagi!" },
      { code: "CB2", name: "Bakso Terbang Cabang 2", address: "Jl. Contoh No. 2, Depok", phone: "0812-0000-0002", paperWidth: 58, receiptFooter: "Terima kasih, sampai jumpa lagi!" },
    ])
    .returning();

  await db.insert(s.users).values([
    { name: "Administrator", username: "admin", passwordHash: bcrypt.hashSync("admin123", 10), role: "ADMIN" },
    { name: "Kasir Pusat", username: "kasir", passwordHash: bcrypt.hashSync("kasir123", 10), role: "KASIR", outletId: pusat.id },
    { name: "Kasir Cabang 2", username: "kasir2", passwordHash: bcrypt.hashSync("kasir123", 10), role: "KASIR", outletId: cabang.id },
  ]);

  const cats = await db
    .insert(s.categories)
    .values([
      { name: "Bakso", sort: 1 },
      { name: "Mie & Paket", sort: 2 },
      { name: "Tambahan", sort: 3 },
      { name: "Minuman", sort: 4 },
    ])
    .returning();
  const c = Object.fromEntries(cats.map((x) => [x.name, x.id]));

  await db.insert(s.products).values([
    { name: "Bakso Urat", categoryId: c["Bakso"], price: 18000 },
    { name: "Bakso Halus", categoryId: c["Bakso"], price: 16000 },
    { name: "Bakso Terbang Jumbo", categoryId: c["Bakso"], price: 28000 },
    { name: "Bakso Telur", categoryId: c["Bakso"], price: 20000 },
    { name: "Bakso Mercon", categoryId: c["Bakso"], price: 22000 },
    { name: "Mie Ayam", categoryId: c["Mie & Paket"], price: 15000 },
    { name: "Mie Ayam Bakso", categoryId: c["Mie & Paket"], price: 20000 },
    { name: "Paket Hemat (Bakso + Es Teh)", categoryId: c["Mie & Paket"], price: 20000 },
    { name: "Tahu Bakso", categoryId: c["Tambahan"], price: 5000 },
    { name: "Pangsit Goreng", categoryId: c["Tambahan"], price: 3000 },
    { name: "Nasi Putih", categoryId: c["Tambahan"], price: 5000 },
    { name: "Kerupuk", categoryId: c["Tambahan"], price: 2000 },
    { name: "Es Teh Manis", categoryId: c["Minuman"], price: 5000 },
    { name: "Es Jeruk", categoryId: c["Minuman"], price: 7000 },
    { name: "Teh Hangat", categoryId: c["Minuman"], price: 4000 },
    { name: "Air Mineral", categoryId: c["Minuman"], price: 4000 },
  ]);

  await db.insert(s.diningTables).values([
    ...Array.from({ length: 12 }, (_, i) => ({ outletId: pusat.id, number: String(i + 1) })),
    ...Array.from({ length: 8 }, (_, i) => ({ outletId: cabang.id, number: String(i + 1) })),
  ]);

  console.log("Seed selesai. Login: admin / admin123, kasir / kasir123 (Pusat), kasir2 / kasir123 (Cabang 2)");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
