"use server";

import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { db, schema } from "@/db";
import type { DiningTable, Order, OrderType, PaymentMethod } from "@/db/schema";
import { getActiveOutlet, OUTLET_COOKIE, requireUser } from "@/lib/auth";
import { computeTotals, type DiscountInput } from "@/lib/pricing";
import { localDayStart, todayLocal } from "@/lib/format";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type SaveOrderInput = {
  orderId?: number | null;
  type: OrderType;
  tableId?: number | null;
  customerName?: string;
  guests?: number | null;
  note?: string;
  items: { productId: number; qty: number; note?: string }[];
  discount: DiscountInput;
  pay?: { method: PaymentMethod; paidAmount: number } | null;
};

export type ActionResult = { ok: true; orderId: number; code: string; change?: number } | { ok: false; error: string };

async function nextCode(tx: Tx, outletId: number, outletCode: string) {
  const day = todayLocal();
  const [{ n }] = await tx
    .select({ n: sql<number>`count(*)` })
    .from(schema.orders)
    .where(and(eq(schema.orders.outletId, outletId), gte(schema.orders.createdAt, new Date(localDayStart(day)))));
  return `${outletCode}-${day.replaceAll("-", "").slice(2)}-${String(Number(n) + 1).padStart(4, "0")}`;
}

async function settle(tx: Tx, orderId: number, total: number, method: PaymentMethod, paidAmount: number, userId: number) {
  const paid = method === "CASH" ? Math.round(paidAmount) : total;
  if (paid < total) throw new Error("Jumlah bayar kurang dari total.");
  await tx
    .update(schema.orders)
    .set({ status: "PAID", paymentMethod: method, paidAmount: paid, change: paid - total, paidAt: new Date(), cashierId: userId })
    .where(eq(schema.orders.id, orderId));
  return paid - total;
}

export async function saveOrder(input: SaveOrderInput): Promise<ActionResult> {
  const user = await requireUser();
  const outlet = await getActiveOutlet(user);
  if (!outlet) return { ok: false, error: "Outlet tidak aktif. Hubungi admin." };

  const items = input.items.filter((i) => i.qty > 0);
  if (!items.length) return { ok: false, error: "Keranjang masih kosong." };

  const prods = await db
    .select({ p: schema.products, categoryName: schema.categories.name })
    .from(schema.products)
    .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
    .where(inArray(schema.products.id, [...new Set(items.map((i) => i.productId))]));
  const byId = new Map(prods.map((x) => [x.p.id, x]));
  for (const i of items) {
    const p = byId.get(i.productId);
    if (!p || !p.p.active) return { ok: false, error: "Ada produk yang tidak tersedia." };
  }

  let table: DiningTable | undefined;
  if (input.type === "DINE_IN" && input.tableId) {
    table = await db.query.diningTables.findFirst({
      where: and(eq(schema.diningTables.id, input.tableId), eq(schema.diningTables.outletId, outlet.id)),
    });
    if (!table) return { ok: false, error: "Meja tidak ditemukan di outlet ini." };
  }

  const lines = items.map((i) => {
    const { p, categoryName } = byId.get(i.productId)!;
    const qty = Math.round(i.qty);
    return { productId: p.id, name: p.name, categoryName, price: p.price, qty, note: i.note?.trim() || null, subtotal: p.price * qty };
  });

  try {
    const result = await db.transaction(async (tx) => {
      let target = outlet;
      let existing: Order | undefined;
      if (input.orderId) {
        existing = await tx.query.orders.findFirst({ where: eq(schema.orders.id, input.orderId) });
        if (!existing || existing.status !== "OPEN") throw new Error("Pesanan sudah tidak bisa diubah.");
        if (existing.outletId !== outlet.id) {
          // pajak mengikuti outlet asal pesanan
          const o = await tx.query.outlets.findFirst({ where: eq(schema.outlets.id, existing.outletId) });
          if (!o) throw new Error("Outlet pesanan tidak ditemukan.");
          target = o;
        }
      }
      const totals = computeTotals(lines, input.discount, target.taxPercent, target.servicePercent);
      const values = {
        type: input.type,
        tableId: table?.id ?? null,
        tableNumber: table?.number ?? null,
        customerName: input.customerName?.trim() || null,
        guests: input.type === "DINE_IN" && input.guests ? Math.max(1, Math.round(input.guests)) : null,
        note: input.note?.trim() || null,
        ...totals,
        cashierId: user.uid,
      };

      let orderId: number;
      let code: string;
      if (existing) {
        await tx.update(schema.orders).set(values).where(eq(schema.orders.id, existing.id));
        await tx.delete(schema.orderItems).where(eq(schema.orderItems.orderId, existing.id));
        orderId = existing.id;
        code = existing.code;
      } else {
        code = await nextCode(tx, outlet.id, outlet.code);
        const [row] = await tx
          .insert(schema.orders)
          .values({ ...values, outletId: outlet.id, code, status: "OPEN" })
          .returning({ id: schema.orders.id });
        orderId = row.id;
      }
      await tx.insert(schema.orderItems).values(lines.map((l) => ({ ...l, orderId })));

      let change: number | undefined;
      if (input.pay) change = await settle(tx, orderId, totals.total, input.pay.method, input.pay.paidAmount, user.uid);
      return { orderId, code, change };
    });
    revalidatePath("/pesanan");
    return { ok: true, ...result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal menyimpan pesanan." };
  }
}

export async function payOrder(orderId: number, method: PaymentMethod, paidAmount: number): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const result = await db.transaction(async (tx) => {
      const order = await tx.query.orders.findFirst({ where: eq(schema.orders.id, orderId) });
      if (!order || order.status !== "OPEN") throw new Error("Pesanan tidak ditemukan atau sudah dibayar.");
      if (user.role !== "ADMIN" && order.outletId !== user.outletId) throw new Error("Pesanan bukan dari outlet Anda.");
      const change = await settle(tx, order.id, order.total, method, paidAmount, user.uid);
      return { orderId: order.id, code: order.code, change };
    });
    revalidatePath("/pesanan");
    return { ok: true, ...result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal memproses pembayaran." };
  }
}

/** Batalkan open bill (belum dibayar) */
export async function cancelOrder(orderId: number, reason: string): Promise<ActionResult> {
  const user = await requireUser();
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.id, orderId) });
  if (!order || order.status !== "OPEN") return { ok: false, error: "Open bill tidak ditemukan." };
  if (user.role !== "ADMIN" && order.outletId !== user.outletId) return { ok: false, error: "Pesanan bukan dari outlet Anda." };
  await db.update(schema.orders).set({ status: "VOID", cancelReason: reason.trim() || null }).where(eq(schema.orders.id, order.id));
  revalidatePath("/pesanan");
  return { ok: true, orderId: order.id, code: order.code };
}

/** Refund transaksi yang sudah lunas (khusus admin) */
export async function refundOrder(orderId: number, reason: string): Promise<ActionResult> {
  const user = await requireUser();
  if (user.role !== "ADMIN") return { ok: false, error: "Hanya admin yang dapat melakukan refund." };
  if (!reason.trim()) return { ok: false, error: "Alasan refund wajib diisi." };
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.id, orderId) });
  if (!order || order.status !== "PAID") return { ok: false, error: "Hanya transaksi lunas yang bisa direfund." };
  await db
    .update(schema.orders)
    .set({ status: "REFUNDED", cancelReason: reason.trim(), refundedAt: new Date(), refundedById: user.uid })
    .where(eq(schema.orders.id, order.id));
  revalidatePath("/transaksi");
  revalidatePath("/laporan");
  return { ok: true, orderId: order.id, code: order.code };
}

/** Admin memilih outlet yang sedang dioperasikan */
export async function switchOutlet(outletId: number) {
  const user = await requireUser("ADMIN");
  void user;
  const store = await cookies();
  store.set(OUTLET_COOKIE, String(outletId), { path: "/", sameSite: "lax", httpOnly: true, maxAge: 60 * 60 * 24 * 365 });
  revalidatePath("/", "layout");
}
