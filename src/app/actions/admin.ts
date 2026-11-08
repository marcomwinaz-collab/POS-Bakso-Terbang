"use server";

import bcrypt from "bcryptjs";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";

export type FormState = { ok?: boolean; error?: string; message?: string } | undefined;

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const num = (f: FormData, k: string) => Math.round(Number(String(f.get(k) ?? "0").replace(/[^\d-]/g, "")) || 0);
const bool = (f: FormData, k: string) => f.get(k) === "on" || f.get(k) === "true";
const clamp = (v: number, a: number, b: number) => Math.min(Math.max(v, a), b);

function fail(e: unknown): FormState {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes("UNIQUE")) return { error: "Data dengan nama/kode/username tersebut sudah ada." };
  return { error: msg };
}

/* ---------- Produk ---------- */
export async function saveProduct(_: FormState, f: FormData): Promise<FormState> {
  await requireUser("ADMIN");
  const id = num(f, "id");
  const name = str(f, "name");
  if (!name) return { error: "Nama produk wajib diisi." };
  const data = { name, categoryId: num(f, "categoryId") || null, price: num(f, "price"), active: bool(f, "active") };
  if (data.price < 0) return { error: "Harga tidak boleh negatif." };
  try {
    if (id) await db.update(schema.products).set(data).where(eq(schema.products.id, id));
    else await db.insert(schema.products).values(data);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/produk");
  return { ok: true, message: "Produk tersimpan." };
}

export async function deleteProduct(id: number) {
  await requireUser("ADMIN");
  const used = await db.query.orderItems.findFirst({ where: eq(schema.orderItems.productId, id) });
  if (used) await db.update(schema.products).set({ active: false }).where(eq(schema.products.id, id));
  else await db.delete(schema.products).where(eq(schema.products.id, id));
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
  const outletId = num(f, "outletId");
  const number = str(f, "number");
  if (!outletId) return { error: "Pilih outlet." };
  if (!number) return { error: "Nomor meja wajib diisi." };
  const data = { outletId, number, capacity: clamp(num(f, "capacity"), 1, 99), active: bool(f, "active") };
  const dup = await db.query.diningTables.findFirst({
    where: and(eq(schema.diningTables.outletId, outletId), eq(schema.diningTables.number, number)),
  });
  if (dup && dup.id !== id) return { error: `Meja ${number} sudah ada di outlet ini.` };
  try {
    if (id) await db.update(schema.diningTables).set(data).where(eq(schema.diningTables.id, id));
    else await db.insert(schema.diningTables).values(data);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/meja");
  return { ok: true, message: "Meja tersimpan." };
}

export async function addTablesBulk(_: FormState, f: FormData): Promise<FormState> {
  await requireUser("ADMIN");
  const outletId = num(f, "outletId");
  const from = num(f, "from");
  const to = num(f, "to");
  if (!outletId) return { error: "Pilih outlet." };
  if (from < 1 || to < from || to - from > 200) return { error: "Rentang nomor tidak valid." };
  const existing = new Set(
    (await db.select().from(schema.diningTables).where(eq(schema.diningTables.outletId, outletId))).map((t) => t.number),
  );
  const rows = [];
  for (let i = from; i <= to; i++) if (!existing.has(String(i))) rows.push({ outletId, number: String(i), capacity: clamp(num(f, "capacity"), 1, 99) });
  if (rows.length) await db.insert(schema.diningTables).values(rows);
  revalidatePath("/meja");
  return { ok: true, message: `${rows.length} meja ditambahkan.` };
}

export async function deleteTable(id: number) {
  await requireUser("ADMIN");
  const open = await db.query.orders.findFirst({ where: and(eq(schema.orders.tableId, id), eq(schema.orders.status, "OPEN")) });
  if (open) return { error: "Meja masih memiliki open bill." };
  await db.delete(schema.diningTables).where(eq(schema.diningTables.id, id));
  revalidatePath("/meja");
  return {};
}

/* ---------- Outlet ---------- */
export async function saveOutlet(_: FormState, f: FormData): Promise<FormState> {
  await requireUser("ADMIN");
  const id = num(f, "id");
  const name = str(f, "name");
  const code = str(f, "code").toUpperCase();
  if (!name) return { error: "Nama outlet wajib diisi." };
  if (!/^[A-Z0-9]{2,5}$/.test(code)) return { error: "Kode outlet 2–5 huruf/angka, mis. PST." };
  const data = {
    name,
    code,
    address: str(f, "address"),
    phone: str(f, "phone"),
    taxPercent: clamp(num(f, "taxPercent"), 0, 100),
    servicePercent: clamp(num(f, "servicePercent"), 0, 100),
    active: bool(f, "active"),
  };
  try {
    if (id) await db.update(schema.outlets).set(data).where(eq(schema.outlets.id, id));
    else await db.insert(schema.outlets).values(data);
  } catch (e) {
    return fail(e);
  }
  revalidatePath("/", "layout");
  return { ok: true, message: "Outlet tersimpan." };
}

/* ---------- Printer ---------- */
export async function savePrinter(_: FormState, f: FormData): Promise<FormState> {
  await requireUser("ADMIN");
  const id = num(f, "outletId");
  if (!id) return { error: "Outlet tidak valid." };
  const width = num(f, "paperWidth");
  await db
    .update(schema.outlets)
    .set({
      paperWidth: width === 58 ? 58 : 80,
      fontSize: clamp(num(f, "fontSize"), 9, 16),
      receiptHeader: str(f, "receiptHeader"),
      receiptFooter: str(f, "receiptFooter"),
      showLogo: bool(f, "showLogo"),
      autoPrintReceipt: bool(f, "autoPrintReceipt"),
      receiptCopies: clamp(num(f, "receiptCopies"), 1, 3),
      printKitchenTicket: bool(f, "printKitchenTicket"),
    })
    .where(eq(schema.outlets.id, id));
  revalidatePath("/printer");
  return { ok: true, message: "Pengaturan printer tersimpan." };
}

/* ---------- Pengguna ---------- */
export async function saveUser(_: FormState, f: FormData): Promise<FormState> {
  const me = await requireUser("ADMIN");
  const id = num(f, "id");
  const name = str(f, "name");
  const username = str(f, "username").toLowerCase();
  const password = String(f.get("password") ?? "");
  const role: "ADMIN" | "KASIR" = str(f, "role") === "ADMIN" ? "ADMIN" : "KASIR";
  const outletId = num(f, "outletId") || null;
  const active = bool(f, "active");
  if (!name || !username) return { error: "Nama dan username wajib diisi." };
  if (!/^[a-z0-9._-]{3,}$/.test(username)) return { error: "Username minimal 3 karakter (huruf kecil, angka, . _ -)." };
  if ((!id || password) && password.length < 6) return { error: "Password minimal 6 karakter." };
  if (role === "KASIR" && !outletId) return { error: "Kasir wajib ditempatkan di salah satu outlet." };
  if (id === me.uid && (role !== "ADMIN" || !active)) return { error: "Anda tidak bisa menurunkan peran atau menonaktifkan akun sendiri." };

  const data = { name, username, role, active, outletId: role === "ADMIN" ? null : outletId };
  try {
    if (id) {
      await db
        .update(schema.users)
        .set({ ...data, ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}) })
        .where(eq(schema.users.id, id));
    } else {
      await db.insert(schema.users).values({ ...data, passwordHash: await bcrypt.hash(password, 10) });
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
  if (hasOrders) await db.update(schema.users).set({ active: false }).where(eq(schema.users.id, id));
  else await db.delete(schema.users).where(eq(schema.users.id, id));
  revalidatePath("/pengguna");
  return {};
}

/* ---------- Pengaturan umum ---------- */
export async function saveSettings(_: FormState, f: FormData): Promise<FormState> {
  await requireUser("ADMIN");
  const data = { businessName: str(f, "businessName") || "Bakso Terbang" };
  await db.insert(schema.settings).values({ id: 1, ...data }).onConflictDoUpdate({ target: schema.settings.id, set: data });
  revalidatePath("/", "layout");
  return { ok: true, message: "Pengaturan tersimpan." };
}
