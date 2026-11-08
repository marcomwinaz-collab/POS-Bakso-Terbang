import "server-only";
import { and, desc, eq, gte, inArray, lt, sql, type SQL } from "drizzle-orm";
import { db, schema } from "@/db";
import { addDays, localDayStart, todayLocal, TZ_OFFSET_HOURS } from "./format";

const o = schema.orders;
const oi = schema.orderItems;

export type Range = { from: string; to: string; start: Date; end: Date };

export function parseRange(sp: { from?: string; to?: string }, defaultDays = 0): Range {
  const re = /^\d{4}-\d{2}-\d{2}$/;
  let to = sp.to && re.test(sp.to) ? sp.to : todayLocal();
  let from = sp.from && re.test(sp.from) ? sp.from : addDays(to, -defaultDays);
  if (from > to) [from, to] = [to, from];
  return { from, to, start: new Date(localDayStart(from)), end: new Date(localDayStart(addDays(to, 1))) };
}

export type Filter = { start: Date; end: Date; outletId?: number | null };

/** Transaksi penjualan sah (lunas, tidak direfund) pada periode, berdasarkan waktu bayar */
function salesWhere(f: Filter): SQL {
  const w: SQL[] = [eq(o.status, "PAID"), gte(o.paidAt, f.start), lt(o.paidAt, f.end)];
  if (f.outletId) w.push(eq(o.outletId, f.outletId));
  return and(...w)!;
}

function refundWhere(f: Filter): SQL {
  const w: SQL[] = [eq(o.status, "REFUNDED"), gte(o.refundedAt, f.start), lt(o.refundedAt, f.end)];
  if (f.outletId) w.push(eq(o.outletId, f.outletId));
  return and(...w)!;
}

const offsetSec = TZ_OFFSET_HOURS * 3600;
export const localDayExpr = sql<string>`strftime('%Y-%m-%d', ${o.paidAt} / 1000 + ${offsetSec}, 'unixepoch')`;
export const localHourExpr = sql<string>`cast(strftime('%H', ${o.paidAt} / 1000 + ${offsetSec}, 'unixepoch') as integer)`;
export const localDowExpr = sql<string>`cast(strftime('%w', ${o.paidAt} / 1000 + ${offsetSec}, 'unixepoch') as integer)`;

const num = (v: unknown) => Number(v ?? 0);

/* ---------------- Ringkasan ---------------- */
export async function salesSummary(f: Filter) {
  const [s] = await db
    .select({
      count: sql<number>`count(*)`,
      gross: sql<number>`coalesce(sum(${o.subtotal}),0)`,
      discount: sql<number>`coalesce(sum(${o.discount}),0)`,
      service: sql<number>`coalesce(sum(${o.service}),0)`,
      tax: sql<number>`coalesce(sum(${o.tax}),0)`,
      total: sql<number>`coalesce(sum(${o.total}),0)`,
      guests: sql<number>`coalesce(sum(${o.guests}),0)`,
    })
    .from(o)
    .where(salesWhere(f));
  const [items] = await db
    .select({ qty: sql<number>`coalesce(sum(${oi.qty}),0)` })
    .from(oi)
    .innerJoin(o, eq(oi.orderId, o.id))
    .where(salesWhere(f));
  const [r] = await db
    .select({ count: sql<number>`count(*)`, total: sql<number>`coalesce(sum(${o.total}),0)` })
    .from(o)
    .where(refundWhere(f));
  const payments = await db
    .select({ method: o.paymentMethod, count: sql<number>`count(*)`, total: sql<number>`sum(${o.total})` })
    .from(o)
    .where(salesWhere(f))
    .groupBy(o.paymentMethod)
    .orderBy(sql`sum(${o.total}) desc`);
  const count = num(s.count);
  return {
    count,
    gross: num(s.gross),
    discount: num(s.discount),
    net: num(s.gross) - num(s.discount),
    service: num(s.service),
    tax: num(s.tax),
    total: num(s.total),
    avg: count ? Math.round(num(s.total) / count) : 0,
    guests: num(s.guests),
    itemsSold: num(items.qty),
    refundCount: num(r.count),
    refundTotal: num(r.total),
    payments: payments.map((p) => ({ method: p.method ?? "CASH", count: num(p.count), total: num(p.total) })),
  };
}

/* ---------------- Detail ---------------- */
export async function salesDetail(f: Filter & { status?: string }) {
  const w: SQL[] = [gte(o.createdAt, f.start), lt(o.createdAt, f.end)];
  if (f.outletId) w.push(eq(o.outletId, f.outletId));
  if (f.status === "PAID" || f.status === "OPEN" || f.status === "VOID" || f.status === "REFUNDED") w.push(eq(o.status, f.status));
  const rows = await db
    .select({ order: o, outletName: schema.outlets.name, cashierName: schema.users.name })
    .from(o)
    .innerJoin(schema.outlets, eq(o.outletId, schema.outlets.id))
    .leftJoin(schema.users, eq(o.cashierId, schema.users.id))
    .where(and(...w))
    .orderBy(desc(o.createdAt))
    .limit(3000);
  const items = rows.length
    ? await db
        .select()
        .from(oi)
        .where(inArray(oi.orderId, rows.map((r) => r.order.id)))
    : [];
  const byOrder = new Map<number, typeof items>();
  for (const it of items) byOrder.set(it.orderId, [...(byOrder.get(it.orderId) ?? []), it]);
  return rows.map((r) => ({ ...r, items: byOrder.get(r.order.id) ?? [] }));
}

/* ---------------- Per produk ---------------- */
export async function salesByProduct(f: Filter) {
  const rows = await db
    .select({
      name: oi.name,
      category: sql<string>`coalesce(${oi.categoryName}, 'Tanpa kategori')`,
      qty: sql<number>`sum(${oi.qty})`,
      gross: sql<number>`sum(${oi.subtotal})`,
      orders: sql<number>`count(distinct ${oi.orderId})`,
    })
    .from(oi)
    .innerJoin(o, eq(oi.orderId, o.id))
    .where(salesWhere(f))
    .groupBy(oi.name, sql`2`)
    .orderBy(sql`sum(${oi.subtotal}) desc`);
  return rows.map((r) => ({ ...r, qty: num(r.qty), gross: num(r.gross), orders: num(r.orders) }));
}

export async function salesByCategory(f: Filter) {
  const rows = await db
    .select({
      name: sql<string>`coalesce(${oi.categoryName}, 'Tanpa kategori')`,
      qty: sql<number>`sum(${oi.qty})`,
      gross: sql<number>`sum(${oi.subtotal})`,
    })
    .from(oi)
    .innerJoin(o, eq(oi.orderId, o.id))
    .where(salesWhere(f))
    .groupBy(sql`1`)
    .orderBy(sql`sum(${oi.subtotal}) desc`);
  return rows.map((r) => ({ name: r.name, qty: num(r.qty), gross: num(r.gross) }));
}

/* ---------------- Per outlet ---------------- */
export async function salesByOutlet(f: Filter) {
  const outlets = await db.select().from(schema.outlets).orderBy(schema.outlets.id);
  const sales = await db
    .select({
      outletId: o.outletId,
      count: sql<number>`count(*)`,
      gross: sql<number>`sum(${o.subtotal})`,
      discount: sql<number>`sum(${o.discount})`,
      service: sql<number>`sum(${o.service})`,
      tax: sql<number>`sum(${o.tax})`,
      total: sql<number>`sum(${o.total})`,
    })
    .from(o)
    .where(salesWhere({ ...f, outletId: null }))
    .groupBy(o.outletId);
  const refunds = await db
    .select({ outletId: o.outletId, count: sql<number>`count(*)`, total: sql<number>`sum(${o.total})` })
    .from(o)
    .where(refundWhere({ ...f, outletId: null }))
    .groupBy(o.outletId);
  return outlets
    .map((ot) => {
      const s = sales.find((x) => x.outletId === ot.id);
      const r = refunds.find((x) => x.outletId === ot.id);
      const count = num(s?.count);
      return {
        id: ot.id,
        name: ot.name,
        active: ot.active,
        count,
        gross: num(s?.gross),
        discount: num(s?.discount),
        net: num(s?.gross) - num(s?.discount),
        service: num(s?.service),
        tax: num(s?.tax),
        total: num(s?.total),
        avg: count ? Math.round(num(s?.total) / count) : 0,
        refundCount: num(r?.count),
        refundTotal: num(r?.total),
      };
    })
    .filter((x) => x.active || x.count || x.refundCount);
}

/* ---------------- Per jenis order ---------------- */
export async function salesByType(f: Filter) {
  const rows = await db
    .select({
      type: o.type,
      count: sql<number>`count(*)`,
      total: sql<number>`sum(${o.total})`,
      net: sql<number>`sum(${o.subtotal} - ${o.discount})`,
      guests: sql<number>`coalesce(sum(${o.guests}),0)`,
    })
    .from(o)
    .where(salesWhere(f))
    .groupBy(o.type);
  return (["DINE_IN", "TAKEAWAY", "ONLINE"] as const).map((t) => {
    const r = rows.find((x) => x.type === t);
    const count = num(r?.count);
    return { type: t, count, total: num(r?.total), net: num(r?.net), guests: num(r?.guests), avg: count ? Math.round(num(r?.total) / count) : 0 };
  });
}

/* ---------------- Refund ---------------- */
export async function refundList(f: Filter) {
  const refundUser = sql<string>`(select name from users where users.id = ${o.refundedById})`;
  return db
    .select({ order: o, outletName: schema.outlets.name, cashierName: schema.users.name, refundedBy: refundUser })
    .from(o)
    .innerJoin(schema.outlets, eq(o.outletId, schema.outlets.id))
    .leftJoin(schema.users, eq(o.cashierId, schema.users.id))
    .where(refundWhere(f))
    .orderBy(desc(o.refundedAt));
}

/* ---------------- Analisis ---------------- */
export async function analytics(f: Filter) {
  const where = salesWhere(f);
  const [daily, hourly, heat, topQty, payments] = await Promise.all([
    db.select({ day: localDayExpr, total: sql<number>`sum(${o.total})`, count: sql<number>`count(*)` }).from(o).where(where).groupBy(localDayExpr),
    db.select({ hour: localHourExpr, total: sql<number>`sum(${o.total})`, count: sql<number>`count(*)` }).from(o).where(where).groupBy(localHourExpr),
    db.select({ dow: localDowExpr, hour: localHourExpr, count: sql<number>`count(*)` }).from(o).where(where).groupBy(localDowExpr, localHourExpr),
    db
      .select({ name: oi.name, qty: sql<number>`sum(${oi.qty})`, gross: sql<number>`sum(${oi.subtotal})` })
      .from(oi)
      .innerJoin(o, eq(oi.orderId, o.id))
      .where(where)
      .groupBy(oi.name)
      .orderBy(sql`sum(${oi.qty}) desc`),
    db.select({ method: o.paymentMethod, total: sql<number>`sum(${o.total})`, count: sql<number>`count(*)` }).from(o).where(where).groupBy(o.paymentMethod),
  ]);
  return {
    daily: daily.map((d) => ({ day: d.day, total: num(d.total), count: num(d.count) })),
    hourly: hourly.map((h) => ({ hour: num(h.hour), total: num(h.total), count: num(h.count) })),
    heat: heat.map((h) => ({ dow: num(h.dow), hour: num(h.hour), count: num(h.count) })),
    products: topQty.map((p) => ({ name: p.name, qty: num(p.qty), gross: num(p.gross) })),
    payments: payments.map((p) => ({ method: p.method ?? "CASH", total: num(p.total), count: num(p.count) })),
  };
}
