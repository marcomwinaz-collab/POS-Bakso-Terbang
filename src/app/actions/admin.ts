"use server";

import bcrypt from "bcryptjs";
import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";

export type FormState = { ok?: boolean; error?: string; message?: string } | undefined;

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => Math.round(Number(String(f.get(k) ?? "0").replace(/[^\d-]/g, "")) || 0);
const bool = (f: FormData, k: string) => f.get(k) === "on" || f.get(k) === "true";

function fail(e: unknown): FormState {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("UNIQUE")) return { error: "Data dengan nama/username tersebut sudah ada." };
  return { error: msg };
}

/* ---------- Produk ---------- */
export async function saveProduct(_: FormState, f: FormData): Promise<FormState> {
  const user = await requireUser("ADMIN");
  const id = num(f, "id");
  const name = str(f, "name");
  if (!name) return { error: "Nama produk wajib diisi." };
  const data = {
    name,
    categoryId: num(f, "categoryId") || null,
    sku: str(f, "sku") || null,
    price: num(f, "price"),
    cost: num(f, "cost"),
    trackStock: bool(f, "trackStock"),
    minStock: num(f, "minStock"),
    active: bool(f, "active"),
  };
  if (data.price < 0 || data.cost < 0) return { error: "Harga tidak boleh negatif." };
  try {
    if (id) {
      await db.update(schema.products).set(data).where(eq(schema.products.id, id));
    } else {
      const stock = Math.max(num(f, "stock"), 0);
      const [p] = await db.insert(schema.products).values({ ...data, stock }).returning();
      if (stock > 0 && data.trackStock) {
        await db.insert(schema.stockMovements).values({ productId: p.id, type: "IN", qty: stock, stockAfter: stock, note: "Stok awal", userId: user.uid });
      }
    }
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/produk");
  return { ok: true, message: "Produk tersimpan." };
}

export async function deleteProduct(id: number) {
  await requireUser("ADMIN");
  const used = await db.query.orderItems.findFirst({ where: eq(schema.orderItems.productId, id) });
  if (used) {
    // sudah pernah terjual: nonaktifkan agar riwayat tetap utuh
    await db.update(schema.products).set({ active: false }).where(eq(schema.products.id, id));
  } else {
    await db.delete(schema.products).where(eq(schema.products.id, id));
  }
  revalidatePath("/produk");
}

/* ---------- Kategori ---------- */
export async function saveCategory(_: FormState, f: FormData): Promise<FormState> {
  await requireUser("ADMIN");
  const id = num(f, "id");
  const name = str(f, "name");
  if (!name) return { error: "Nama kategori wajib diisi." };
  const data = { name, sort: num(f, "sort") };
  try {
    if (id) await db.update(schema.categories).set(data).where(eq(schema.categories.id, id));
    else await db.insert(schema.categories).values(data);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/kategori");
  return { ok: true, message: "Kategori tersimpan." };
}

export async function deleteCategory(id: number) {
  await requireUser("ADMIN");
  await db.update(schema.products).set({ categoryId: null }).where(eq(schema.products.categoryId, id));
  await db.delete(schema.categories).where(eq(schema.categories.id, id));
  revalidatePath("/kategori");
}

/* ---------- Meja ---------- */
export async function saveTable(_: FormState, f: FormData): Promise<FormState> {
  await requireUser("ADMIN");
  const id = num(f, "id");
  const name = str(f, "name");
  if (!name) return { error: "Nama meja wajib diisi." };
  const data = { name, active: bool(f, "active") };
  try {
    if (id) await db.update(schema.diningTables).set(data).where(eq(schema.diningTables.id, id));
    else await db.insert(schema.diningTables).values(data);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/meja");
  return { ok: true, message: "Meja tersimpan." };
}

export async function deleteTable(id: number) {
  await requireUser("ADMIN");
  const open = await db.query.orders.findFirst({ where: and(eq(schema.orders.tableId, id), eq(schema.orders.status, "OPEN")) });
  if (open) return { error: "Meja masih memiliki open bill." };
  await db.delete(schema.diningTables).where(eq(schema.diningTables.id, id));
  revalidatePath("/meja");
  return {};
}

/* ---------- Stok ---------- */
export async function adjustStock(_: FormState, f: FormData): Promise<FormState> {
  const user = await requireUser("ADMIN");
  const productId = num(f, "productId");
  const type = str(f, "type") as "IN" | "OUT" | "ADJUST";
  const qty = num(f, "qty");
  const note = str(f, "note") || null;
  if (!productId) return { error: "Pilih produk." };
  if (!["IN", "OUT", "ADJUST"].includes(type)) return { error: "Jenis tidak valid." };
  if (type !== "ADJUST" && qty <= 0) return { error: "Jumlah harus lebih dari 0." };
  if (type === "ADJUST" && qty < 0) return { error: "Stok fisik tidak boleh negatif." };

  try {
    await db.transaction(async (tx) => {
      const p = await tx.query.products.findFirst({ where: eq(schema.products.id, productId) });
      if (!p) throw new Error("Produk tidak ditemukan.");
      let after = p.stock;
      let delta = 0;
      if (type === "IN") delta = qty;
      else if (type === "OUT") delta = -qty;
      else delta = qty - p.stock;
      after = p.stock + delta;
      if (after < 0) throw new Error(`Stok ${p.name} tidak cukup (sisa ${p.stock}).`);
      await tx.update(schema.products).set({ stock: after }).where(eq(schema.products.id, p.id));
      await tx.insert(schema.stockMovements).values({ productId: p.id, type, qty: delta, stockAfter: after, note, userId: user.uid });
    });
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/stok");
  return { ok: true, message: "Stok diperbarui." };
}

/* ---------- Pengguna ---------- */
export async function saveUser(_: FormState, f: FormData): Promise<FormState> {
  const me = await requireUser("ADMIN");
  const id = num(f, "id");
  const name = str(f, "name");
  const username = str(f, "username").toLowerCase();
  const password = String(f.get("password") ?? "");
  const role = str(f, "role") === "ADMIN" ? "ADMIN" : "KASIR";
  const active = bool(f, "active");
  if (!name || !username) return { error: "Nama dan username wajib diisi." };
  if (!/^[a-z0-9._-]{3,}$/.test(username)) return { error: "Username minimal 3 karakter (huruf kecil, angka, . _ -)." };
  if (!id && password.length < 6) return { error: "Password minimal 6 karakter." };
  if (id && password && password.length < 6) return { error: "Password minimal 6 karakter." };
  if (id === me.uid && (role !== "ADMIN" || !active)) return { error: "Anda tidak bisa menurunkan peran atau menonaktifkan akun sendiri." };

  try {
    if (id) {
      await db
        .update(schema.users)
        .set({ name, username, role, active, ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}) })
        .where(eq(schema.users.id, id));
    } else {
      await db.insert(schema.users).values({ name, username, role, active, passwordHash: await bcrypt.hash(password, 10) });
    }
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/pengguna");
  return { ok: true, message: "Pengguna tersimpan." };
}

export async function deleteUser(id: number) {
  const me = await requireUser("ADMIN");
  if (id === me.uid) return { error: "Tidak bisa menghapus akun sendiri." };
  const hasOrders = await db.query.orders.findFirst({ where: eq(schema.orders.cashierId, id) });
  if (hasOrders) {
    await db.update(schema.users).set({ active: false }).where(and(eq(schema.users.id, id), ne(schema.users.id, me.uid)));
  } else {
    await db.delete(schema.users).where(eq(schema.users.id, id));
  }
  revalidatePath("/pengguna");
  return {};
}

/* ---------- Pengaturan ---------- */
export async function saveSettings(_: FormState, f: FormData): Promise<FormState> {
  await requireUser("ADMIN");
  const data = {
    storeName: str(f, "storeName") || "Bakso Terbang",
    address: str(f, "address"),
    phone: str(f, "phone"),
    taxPercent: Math.min(Math.max(num(f, "taxPercent"), 0), 100),
    servicePercent: Math.min(Math.max(num(f, "servicePercent"), 0), 100),
    receiptFooter: str(f, "receiptFooter"),
  };
  await db.insert(schema.settings).values({ id: 1, ...data }).onConflictDoUpdate({ target: schema.settings.id, set: data });
  revalidatePath("/", "layout");
  return { ok: true, message: "Pengaturan tersimpan." };
}
