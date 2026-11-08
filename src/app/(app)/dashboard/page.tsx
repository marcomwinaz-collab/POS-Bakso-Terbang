import Link from "next/link";
import { and, eq, gte, lt, sql } from "drizzle-orm";
import { AlertTriangle, ClipboardList, Receipt, TrendingUp, Wallet, Coins } from "lucide-react";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { parseRange } from "@/lib/queries";
import { addDays, PAYMENT_LABEL, rupiah, TZ_OFFSET_HOURS, todayLocal } from "@/lib/format";
import { DailyChart, HourlyChart, HBarChart } from "./Charts";

const o = schema.orders;
const oi = schema.orderItems;

async function summary(start: Date, end: Date) {
  const where = and(eq(o.status, "PAID"), gte(o.paidAt, start), lt(o.paidAt, end));
  const [s] = await db
    .select({
      omzet: sql<number>`coalesce(sum(${o.total}), 0)`,
      net: sql<number>`coalesce(sum(${o.subtotal} - ${o.discount}), 0)`,
      discount: sql<number>`coalesce(sum(${o.discount}), 0)`,
      count: sql<number>`count(*)`,
    })
    .from(o)
    .where(where);
  const [c] = await db
    .select({ cost: sql<number>`coalesce(sum(${oi.cost} * ${oi.qty}), 0)` })
    .from(oi)
    .innerJoin(o, eq(oi.orderId, o.id))
    .where(where);
  const profit = Number(s.net) - Number(c.cost);
  return { omzet: Number(s.omzet), count: Number(s.count), discount: Number(s.discount), profit };
}

function pct(cur: number, prev: number) {
  if (!prev) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

const PRESETS = [
  { key: "today", label: "Hari ini", days: 0 },
  { key: "7", label: "7 hari", days: 6 },
  { key: "30", label: "30 hari", days: 29 },
  { key: "90", label: "90 hari", days: 89 },
];

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  await requireUser("ADMIN");
  const sp = await searchParams;
  const preset = PRESETS.find((p) => p.key === (sp.range ?? (sp.from ? "" : "7")));
  const range = preset ? parseRange({ to: todayLocal() }, preset.days) : parseRange(sp);
  const spanDays = Math.round((range.end.getTime() - range.start.getTime()) / 86400_000);
  const prevStart = new Date(range.start.getTime() - spanDays * 86400_000);

  const paidInRange = and(eq(o.status, "PAID"), gte(o.paidAt, range.start), lt(o.paidAt, range.end));
  const offset = TZ_OFFSET_HOURS * 3600;
  const dayExpr = sql<string>`strftime('%Y-%m-%d', ${o.paidAt} / 1000 + ${offset}, 'unixepoch')`;
  const hourExpr = sql<string>`strftime('%H', ${o.paidAt} / 1000 + ${offset}, 'unixepoch')`;

  const [cur, prev, daily, hourly, payments, topProducts, byCategory, lowStock, openBills] = await Promise.all([
    summary(range.start, range.end),
    summary(prevStart, range.start),
    db.select({ day: dayExpr, omzet: sql<number>`sum(${o.total})`, count: sql<number>`count(*)` }).from(o).where(paidInRange).groupBy(dayExpr),
    db.select({ hour: hourExpr, count: sql<number>`count(*)`, omzet: sql<number>`sum(${o.total})` }).from(o).where(paidInRange).groupBy(hourExpr),
    db.select({ method: o.paymentMethod, omzet: sql<number>`sum(${o.total})`, count: sql<number>`count(*)` }).from(o).where(paidInRange).groupBy(o.paymentMethod),
    db
      .select({ name: oi.name, qty: sql<number>`sum(${oi.qty})`, omzet: sql<number>`sum(${oi.subtotal})` })
      .from(oi)
      .innerJoin(o, eq(oi.orderId, o.id))
      .where(paidInRange)
      .groupBy(oi.name)
      .orderBy(sql`sum(${oi.qty}) desc`)
      .limit(10),
    db
      .select({ name: sql<string>`coalesce(${schema.categories.name}, 'Tanpa kategori')`, omzet: sql<number>`sum(${oi.subtotal})` })
      .from(oi)
      .innerJoin(o, eq(oi.orderId, o.id))
      .leftJoin(schema.products, eq(oi.productId, schema.products.id))
      .leftJoin(schema.categories, eq(schema.products.categoryId, schema.categories.id))
      .where(paidInRange)
      .groupBy(sql`1`)
      .orderBy(sql`sum(${oi.subtotal}) desc`),
    db
      .select()
      .from(schema.products)
      .where(and(eq(schema.products.active, true), eq(schema.products.trackStock, true), sql`${schema.products.stock} <= ${schema.products.minStock}`)),
    db.select({ n: sql<number>`count(*)`, total: sql<number>`coalesce(sum(${o.total}),0)` }).from(o).where(eq(o.status, "OPEN")),
  ]);

  // isi hari yang kosong agar grafik kontinu
  const dailyMap = new Map(daily.map((d) => [d.day, d]));
  const dailySeries: { day: string; label: string; omzet: number; count: number }[] = [];
  for (let d = range.from; d <= range.to; d = addDays(d, 1)) {
    const r = dailyMap.get(d);
    dailySeries.push({ day: d, label: `${d.slice(8)}/${d.slice(5, 7)}`, omzet: Number(r?.omzet ?? 0), count: Number(r?.count ?? 0) });
  }
  const hourMap = new Map(hourly.map((h) => [Number(h.hour), h]));
  const hours = hourly.map((h) => Number(h.hour));
  const hMin = Math.min(8, ...hours);
  const hMax = Math.max(22, ...hours);
  const hourlySeries = Array.from({ length: hMax - hMin + 1 }, (_, i) => {
    const h = hMin + i;
    return { label: `${String(h).padStart(2, "0")}:00`, count: Number(hourMap.get(h)?.count ?? 0), omzet: Number(hourMap.get(h)?.omzet ?? 0) };
  });
  const paymentSeries = payments
    .map((p) => ({ name: PAYMENT_LABEL[p.method ?? "CASH"], value: Number(p.omzet), count: Number(p.count) }))
    .sort((a, b) => b.value - a.value);
  const categorySeries = byCategory.map((c) => ({ name: c.name, value: Number(c.omzet) }));
  const maxQty = Math.max(1, ...topProducts.map((p) => Number(p.qty)));

  const avg = cur.count ? Math.round(cur.omzet / cur.count) : 0;
  const prevAvg = prev.count ? Math.round(prev.omzet / prev.count) : 0;
  const isCustom = !preset;

  return (
    <main>
      <PageHeader title="Dashboard" subtitle={range.from === range.to ? `Ringkasan ${range.from}` : `Ringkasan ${range.from} s/d ${range.to}`} />
      <div className="space-y-4 px-4 pb-8 sm:px-6">
        {/* Filter */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-lg bg-white p-1 ring-1 ring-stone-200">
            {PRESETS.map((p) => (
              <Link
                key={p.key}
                href={`/dashboard?range=${p.key}`}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${preset?.key === p.key ? "bg-brand-600 text-white" : "text-stone-600 hover:bg-stone-50"}`}
              >
                {p.label}
              </Link>
            ))}
          </div>
          <form className="flex flex-wrap items-center gap-2">
            <input type="date" name="from" defaultValue={range.from} className={`input w-auto py-1.5 ${isCustom ? "border-brand-500" : ""}`} />
            <span className="text-stone-400">–</span>
            <input type="date" name="to" defaultValue={range.to} className={`input w-auto py-1.5 ${isCustom ? "border-brand-500" : ""}`} />
            <button className="btn-secondary py-1.5">Terapkan</button>
          </form>
        </div>

        {/* KPI */}
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Kpi icon={Wallet} label="Omzet" value={rupiah(cur.omzet)} delta={pct(cur.omzet, prev.omzet)} />
          <Kpi icon={Receipt} label="Transaksi" value={cur.count.toLocaleString("id-ID")} delta={pct(cur.count, prev.count)} />
          <Kpi icon={TrendingUp} label="Rata-rata / transaksi" value={rupiah(avg)} delta={pct(avg, prevAvg)} />
          <Kpi icon={Coins} label="Laba kotor (est.)" value={rupiah(cur.profit)} delta={pct(cur.profit, prev.profit)} hint="Penjualan bersih − HPP" />
        </div>

        {(lowStock.length > 0 || Number(openBills[0].n) > 0) && (
          <div className="grid gap-3 md:grid-cols-2">
            {Number(openBills[0].n) > 0 && (
              <Link href="/pesanan" className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 hover:bg-amber-100">
                <ClipboardList className="text-amber-700" />
                <div className="text-sm">
                  <div className="font-semibold text-amber-900">{openBills[0].n} open bill belum dibayar</div>
                  <div className="text-amber-800">Total {rupiah(Number(openBills[0].total))}</div>
                </div>
              </Link>
            )}
            {lowStock.length > 0 && (
              <Link href="/stok" className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 hover:bg-red-100">
                <AlertTriangle className="text-red-700" />
                <div className="text-sm">
                  <div className="font-semibold text-red-900">{lowStock.length} produk stok menipis</div>
                  <div className="line-clamp-1 text-red-800">{lowStock.map((p) => `${p.name} (${p.stock})`).join(", ")}</div>
                </div>
              </Link>
            )}
          </div>
        )}

        <div className="grid gap-4 xl:grid-cols-3">
          <section className="card p-4 xl:col-span-2">
            <h2 className="mb-1 font-semibold">Omzet harian</h2>
            <p className="mb-3 text-xs text-stone-500">Total transaksi lunas per hari</p>
            <DailyChart data={dailySeries} />
          </section>
          <section className="card p-4">
            <h2 className="mb-1 font-semibold">Metode pembayaran</h2>
            <p className="mb-3 text-xs text-stone-500">Berdasarkan nilai transaksi</p>
            <HBarChart data={paymentSeries} />
          </section>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <section className="card p-4 xl:col-span-2">
            <h2 className="mb-1 font-semibold">Jam ramai</h2>
            <p className="mb-3 text-xs text-stone-500">Jumlah transaksi per jam</p>
            <HourlyChart data={hourlySeries} />
          </section>
          <section className="card p-4">
            <h2 className="mb-1 font-semibold">Penjualan per kategori</h2>
            <p className="mb-3 text-xs text-stone-500">Berdasarkan nilai item terjual</p>
            <HBarChart data={categorySeries} />
          </section>
        </div>

        <section className="card overflow-x-auto">
          <div className="border-b border-stone-200 px-4 py-3">
            <h2 className="font-semibold">Menu terlaris</h2>
          </div>
          <table className="table">
            <thead>
              <tr>
                <th className="w-10">#</th>
                <th>Menu</th>
                <th className="w-1/3">Terjual</th>
                <th className="text-right">Omzet</th>
              </tr>
            </thead>
            <tbody>
              {topProducts.map((p, i) => (
                <tr key={p.name}>
                  <td className="text-stone-400">{i + 1}</td>
                  <td className="font-medium">{p.name}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <div className="h-2 flex-1 rounded-full bg-stone-100">
                        <div className="h-2 rounded-full bg-brand-500" style={{ width: `${(Number(p.qty) / maxQty) * 100}%` }} />
                      </div>
                      <span className="w-10 text-right text-xs font-medium">{Number(p.qty)}</span>
                    </div>
                  </td>
                  <td className="text-right">{rupiah(Number(p.omzet))}</td>
                </tr>
              ))}
              {!topProducts.length && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-stone-400">Belum ada penjualan pada periode ini.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  );
}

function Kpi({
  icon: Icon,
  label,
  value,
  delta,
  hint,
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  delta: number | null;
  hint?: string;
}) {
  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center gap-2 text-sm text-stone-500">
        <Icon size={16} /> {label}
      </div>
      <div className="text-xl font-bold text-stone-900 sm:text-2xl">{value}</div>
      <div className="mt-1 text-xs text-stone-500">
        {delta === null ? (
          "Belum ada data pembanding"
        ) : (
          <>
            <span className={delta >= 0 ? "font-semibold text-green-700" : "font-semibold text-red-700"}>
              {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}%
            </span>{" "}
            vs periode sebelumnya
          </>
        )}
        {hint && <div className="text-stone-400">{hint}</div>}
      </div>
    </div>
  );
}
