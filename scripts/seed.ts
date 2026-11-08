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

  await db.insert(s.settings).values({
    id: 1,
    storeName: "Bakso Terbang",
    address: "Jl. Contoh No. 1, Jakarta",
    phone: "0812-0000-0000",
    taxPercent: 0,
    servicePercent: 0,
    receiptFooter: "Terima kasih, sampai jumpa lagi!",
  });

  await db.insert(s.users).values([
    { name: "Administrator", username: "admin", passwordHash: bcrypt.hashSync("admin123", 10), role: "ADMIN" },
    { name: "Kasir 1", username: "kasir", passwordHash: bcrypt.hashSync("kasir123", 10), role: "KASIR" },
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
    { name: "Bakso Urat", categoryId: c["Bakso"], price: 18000, cost: 9000, stock: 100 },
    { name: "Bakso Halus", categoryId: c["Bakso"], price: 16000, cost: 8000, stock: 100 },
    { name: "Bakso Terbang Jumbo", categoryId: c["Bakso"], price: 28000, cost: 14000, stock: 50 },
    { name: "Bakso Telur", categoryId: c["Bakso"], price: 20000, cost: 10000, stock: 60 },
    { name: "Bakso Mercon", categoryId: c["Bakso"], price: 22000, cost: 11000, stock: 60 },
    { name: "Mie Ayam", categoryId: c["Mie & Paket"], price: 15000, cost: 7000, stock: 80 },
    { name: "Mie Ayam Bakso", categoryId: c["Mie & Paket"], price: 20000, cost: 10000, stock: 80 },
    { name: "Paket Hemat (Bakso + Es Teh)", categoryId: c["Mie & Paket"], price: 20000, cost: 10000, stock: 50 },
    { name: "Tahu Bakso", categoryId: c["Tambahan"], price: 5000, cost: 2000, stock: 100 },
    { name: "Pangsit Goreng", categoryId: c["Tambahan"], price: 3000, cost: 1000, stock: 100 },
    { name: "Nasi Putih", categoryId: c["Tambahan"], price: 5000, cost: 2000, trackStock: false },
    { name: "Kerupuk", categoryId: c["Tambahan"], price: 2000, cost: 1000, stock: 4, minStock: 10 },
    { name: "Es Teh Manis", categoryId: c["Minuman"], price: 5000, cost: 1500, trackStock: false },
    { name: "Es Jeruk", categoryId: c["Minuman"], price: 7000, cost: 2500, trackStock: false },
    { name: "Teh Hangat", categoryId: c["Minuman"], price: 4000, cost: 1000, trackStock: false },
    { name: "Air Mineral", categoryId: c["Minuman"], price: 4000, cost: 2000, stock: 48 },
  ]);

  await db.insert(s.diningTables).values(
    Array.from({ length: 10 }, (_, i) => ({ name: `Meja ${i + 1}` })),
  );

  console.log("Seed selesai. Login: admin / admin123 atau kasir / kasir123");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
