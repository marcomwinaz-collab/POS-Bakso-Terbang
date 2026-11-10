import "server-only";
import { and, asc, desc, eq, gte, inArray, lt } from "drizzle-orm";
import { db, schema } from "@/db";
import type { CashierShift } from "@/db/schema";
import { PAYMENT_METHODS } from "@/db/schema";

const o = schema.orders;
const oi = schema.orderItems;
const s = schema.cashierShifts;

export async function getOpenShift(outletId: number) {
  return db.query.cashierShifts.findFirst({
    where: and(eq(s.outletId, outletId), eq(s.status, "OPEN")),
    orderBy: desc(s.openedAt),
  });
}

export async function listShifts(outletId: number, limit = 20) {
  return db.select().from(s).where(and(eq(s.outletId, outletId), eq(s.status, "CLOSED"))).orderBy(desc(s.closedAt)).limit(limit);
}

export async function userNames(ids: (number | null | undefined)[]) {
  const list = [...new Set(ids.filter((x): x is number => !!x))];
  if (!list.length) return new Map<number, string>();
  const rows = await db.select({ id: schema.users.id, name: schema.users.name }).from(schema.users).where(inArray(schema.users.id, list));
  return new Map(rows.map((r) => [r.id, r.name]));
}

export type ShiftReport = Awaited<ReturnType<typeof shiftReport>>;

/**
 * Rekap satu sesi kasir. Penjualan = transaksi lunas yang dibayar selama sesi berlangsung
 * (dari waktu buka sampai waktu tutup, atau sampai sekarang bila kasir masih dibuka).
 */
export async function shiftReport(shift: CashierShift) {
  const start = shift.openedAt;
  const end = shift.closedAt ?? new Date();
  const inShift = and(eq(o.outletId, shift.outletId), gte(o.paidAt, start), lt(o.paidAt, end));

  // transaksi yang dibayar selama sesi (termasuk yang kemudian direfund — uangnya sempat masuk laci)
  const paidOrders = await db
    .select()
    .from(o)
    .where(and(inShift, inArray(o.status, ["PAID", "REFUNDED"])))
    .orderBy(asc(o.paidAt));
  const sales = paidOrders.filter((x) => x.status === "PAID");

  const refunds = await db
    .select()
    .from(o)
    .where(and(eq(o.outletId, shift.outletId), eq(o.status, "REFUNDED"), gte(o.refundedAt, start), lt(o.refundedAt, end)));

  const items = sales.length
    ? await db.select().from(oi).where(inArray(oi.orderId, sales.map((x) => x.id)))
    : [];

  const sum = <T,>(arr: T[], f: (x: T) => number) => arr.reduce((a, x) => a + f(x), 0);

  const byMethod = PAYMENT_METHODS.map((m) => {
    const rows = sales.filter((x) => (x.paymentMethod ?? "CASH") === m);
    return { method: m, count: rows.length, total: sum(rows, (x) => x.total) };
  });

  const typeMap = new Map<string, { count: number; total: number }>();
  const cashierMap = new Map<number, { count: number; total: number }>();
  for (const x of sales) {
    const t = typeMap.get(x.type) ?? { count: 0, total: 0 };
    t.count++;
    t.total += x.total;
    typeMap.set(x.type, t);
    const k = x.cashierId ?? 0;
    const c = cashierMap.get(k) ?? { count: 0, total: 0 };
    c.count++;
    c.total += x.total;
    cashierMap.set(k, c);
  }

  // produk terjual, digabung per nama menu
  const prodMap = new Map<string, { name: string; category: string; qty: number; total: number }>();
  for (const it of items) {
    const p = prodMap.get(it.name) ?? { name: it.name, category: it.categoryName ?? "Lainnya", qty: 0, total: 0 };
    p.qty += it.qty;
    p.total += it.subtotal;
    prodMap.set(it.name, p);
  }
  const products = [...prodMap.values()].sort((a, b) => a.name.localeCompare(b.name, "id"));
  const catMap = new Map<string, { qty: number; total: number }>();
  for (const p of products) {
    const c = catMap.get(p.category) ?? { qty: 0, total: 0 };
    c.qty += p.qty;
    c.total += p.total;
    catMap.set(p.category, c);
  }

  const cashIn = sum(
    paidOrders.filter((x) => x.paymentMethod === "CASH"),
    (x) => x.total,
  );
  const cashRefund = sum(
    refunds.filter((x) => x.paymentMethod === "CASH"),
    (x) => x.total,
  );
  const totalSales = sum(sales, (x) => x.total);

  const openBills = await db.select({ total: o.total }).from(o).where(and(eq(o.outletId, shift.outletId), eq(o.status, "OPEN")));
  const names = await userNames([shift.openedById, shift.closedById, ...cashierMap.keys()]);

  return {
    start,
    end,
    transactions: sales.length,
    itemsSold: sum(products, (p) => p.qty),
    gross: sum(sales, (x) => x.subtotal),
    discount: sum(sales, (x) => x.discount),
    service: sum(sales, (x) => x.service),
    tax: sum(sales, (x) => x.tax),
    totalSales,
    byMethod,
    byType: [...typeMap.entries()].map(([type, v]) => ({ type, ...v })),
    byCashier: [...cashierMap.entries()].map(([id, v]) => ({ name: names.get(id) ?? "-", ...v })),
    products,
    categories: [...catMap.entries()].map(([name, v]) => ({ name, ...v })).sort((a, b) => b.total - a.total),
    refundCount: refunds.length,
    refundTotal: sum(refunds, (x) => x.total),
    cashIn,
    cashRefund,
    expectedCash: shift.openingCash + cashIn - cashRefund,
    endingBalance: shift.openingCash + totalSales,
    openBillCount: openBills.length,
    openBillTotal: sum(openBills, (x) => x.total),
    openedByName: shift.openedById ? (names.get(shift.openedById) ?? "-") : "-",
    closedByName: shift.closedById ? (names.get(shift.closedById) ?? "-") : null,
  };
}
