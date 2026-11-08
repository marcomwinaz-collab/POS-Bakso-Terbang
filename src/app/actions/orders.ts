"use server";

import { and, eq, gte, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { computeTotals, type DiscountInput } from "@/lib/pricing";
import { localDayStart, todayLocal } from "@/lib/format";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export type PaymentMethod = "CASH" | "QRIS" | "DEBIT" | "TRANSFER";

export type SaveOrderInput = {
  orderId?: number | null;
  type: "DINE_IN" | "TAKEAWAY";
  tableId?: number | null;
  customerName?: string;
  note?: string;
  items: { productId: number; qty: number; note?: string }[];
  discount: DiscountInput;
  pay?: { method: PaymentMethod; paidAmount: number } | null;
};

export type ActionResult = { ok: true; orderId: number; code: string; change?: number } | { ok: false; error: string };

async function getSettings() {
  const s = await db.query.settings.findFirst();
  return s ?? { taxPercent: 0, servicePercent: 0 };
}

async function nextCode(tx: Tx) {
  const day = todayLocal();
  const start = localDayStart(day);
  const [{ n }] = await tx
    .select({ n: sql<number>`count(*)` })
    .from(schema.orders)
    .where(gte(schema.orders.createdAt, new Date(start)));
  return `BT-${day.replaceAll("-", "")}-${String(Number(n) + 1).padStart(4, "0")}`;
}

/** Kurangi stok & tandai lunas. Melempar Error bila stok tidak cukup. */
async function settle(tx: Tx, orderId: number, total: number, method: PaymentMethod, paidAmount: number, userId: number) {
  const paid = method === "CASH" ? Math.round(paidAmount) : total;
  if (paid < total) throw new Error("Jumlah bayar kurang dari total.");

  const order = await tx.query.orders.findFirst({ where: eq(schema.orders.id, orderId) });
  const items = await tx.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, orderId));
  const qtyByProduct = new Map<number, number>();
  for (const it of items) if (it.productId) qtyByProduct.set(it.productId, (qtyByProduct.get(it.productId) ?? 0) + it.qty);

  if (qtyByProduct.size) {
    const prods = await tx.select().from(schema.products).where(inArray(schema.products.id, [...qtyByProduct.keys()]));
    for (const p of prods) {
      if (!p.trackStock) continue;
      const q = qtyByProduct.get(p.id)!;
      if (p.stock < q) throw new Error(`Stok ${p.name} tidak cukup (sisa ${p.stock}).`);
      const after = p.stock - q;
      await tx.update(schema.products).set({ stock: after }).where(eq(schema.products.id, p.id));
      await tx.insert(schema.stockMovements).values({
        productId: p.id,
        type: "SALE",
        qty: -q,
        stockAfter: after,
        note: `Penjualan ${order?.code ?? "#" + orderId}`,
        userId,
      });
    }
  }

  await tx
    .update(schema.orders)
    .set({ status: "PAID", paymentMethod: method, paidAmount: paid, change: paid - total, paidAt: new Date(), cashierId: userId })
    .where(eq(schema.orders.id, orderId));
  return paid - total;
}

export async function saveOrder(input: SaveOrderInput): Promise<ActionResult> {
  const user = await requireUser();
  const items = input.items.filter((i) => i.qty > 0);
  if (!items.length) return { ok: false, error: "Keranjang masih kosong." };

  const prods = await db
    .select()
    .from(schema.products)
    .where(inArray(schema.products.id, [...new Set(items.map((i) => i.productId))]));
  const byId = new Map(prods.map((p) => [p.id, p]));
  for (const i of items) {
    const p = byId.get(i.productId);
    if (!p || !p.active) return { ok: false, error: "Ada produk yang tidak tersedia." };
  }

  const settings = await getSettings();
  const lines = items.map((i) => {
    const p = byId.get(i.productId)!;
    return {
      productId: p.id,
      name: p.name,
      price: p.price,
      cost: p.cost,
      qty: Math.round(i.qty),
      note: i.note?.trim() || null,
      subtotal: p.price * Math.round(i.qty),
    };
  });
  const totals = computeTotals(lines, input.discount, settings.taxPercent, settings.servicePercent);
  const tableId = input.type === "DINE_IN" ? input.tableId || null : null;

  try {
    const result = await db.transaction(async (tx) => {
      let orderId: number;
      let code: string;
      const values = {
        type: input.type,
        tableId,
        customerName: input.customerName?.trim() || null,
        note: input.note?.trim() || null,
        ...totals,
        cashierId: user.uid,
      };

      if (input.orderId) {
        const existing = await tx.query.orders.findFirst({ where: eq(schema.orders.id, input.orderId) });
        if (!existing || existing.status !== "OPEN") throw new Error("Pesanan sudah tidak bisa diubah.");
        await tx.update(schema.orders).set(values).where(eq(schema.orders.id, existing.id));
        await tx.delete(schema.orderItems).where(eq(schema.orderItems.orderId, existing.id));
        orderId = existing.id;
        code = existing.code;
      } else {
        code = await nextCode(tx);
        const [row] = await tx
          .insert(schema.orders)
          .values({ ...values, code, status: "OPEN" })
          .returning({ id: schema.orders.id });
        orderId = row.id;
      }

      await tx.insert(schema.orderItems).values(lines.map((l) => ({ ...l, orderId })));

      let change: number | undefined;
      if (input.pay) change = await settle(tx, orderId, totals.total, input.pay.method, input.pay.paidAmount, user.uid);
      return { orderId, code, change };
    });

    revalidatePath("/pesanan");
    revalidatePath("/kasir");
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
      const change = await settle(tx, order.id, order.total, method, paidAmount, user.uid);
      return { orderId: order.id, code: order.code, change };
    });
    revalidatePath("/pesanan");
    return { ok: true, ...result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal memproses pembayaran." };
  }
}

export async function voidOrder(orderId: number, reason: string): Promise<ActionResult> {
  const user = await requireUser();
  try {
    const result = await db.transaction(async (tx) => {
      const order = await tx.query.orders.findFirst({ where: eq(schema.orders.id, orderId) });
      if (!order || order.status === "VOID") throw new Error("Pesanan tidak ditemukan.");
      if (order.status === "PAID" && user.role !== "ADMIN") throw new Error("Hanya admin yang dapat membatalkan transaksi lunas.");

      if (order.status === "PAID") {
        const items = await tx
          .select()
          .from(schema.orderItems)
          .where(and(eq(schema.orderItems.orderId, order.id)));
        for (const it of items) {
          if (!it.productId) continue;
          const p = await tx.query.products.findFirst({ where: eq(schema.products.id, it.productId) });
          if (!p || !p.trackStock) continue;
          const after = p.stock + it.qty;
          await tx.update(schema.products).set({ stock: after }).where(eq(schema.products.id, p.id));
          await tx.insert(schema.stockMovements).values({
            productId: p.id,
            type: "VOID",
            qty: it.qty,
            stockAfter: after,
            note: `Batal ${order.code}`,
            userId: user.uid,
          });
        }
      }
      await tx
        .update(schema.orders)
        .set({ status: "VOID", voidReason: reason.trim() || null })
        .where(eq(schema.orders.id, order.id));
      return { orderId: order.id, code: order.code };
    });
    revalidatePath("/pesanan");
    revalidatePath("/transaksi");
    return { ok: true, ...result };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Gagal membatalkan." };
  }
}
