import Link from "next/link";
import { eq, sql } from "drizzle-orm";
import { ArrowRight, ClipboardList, Receipt, RotateCcw, TrendingUp, Wallet } from "lucide-react";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { ColumnChart } from "@/components/Charts";
import { analytics, parseRange, salesByOutlet, salesSummary } from "@/lib/queries";
import { addDays, rupiah, todayLocal } from "@/lib/format";

function delta(cur: number, prev: number) {
  if (!prev) return null;
  return Math.round(((cur - prev) / prev) * 100);
}

export default async function DashboardPage() {
  await requireUser("ADMIN");
  const today = todayLocal();
  const t = parseRange({ from: today, to: today });
  const y = parseRange({ from: addDays(today, -1), to: addDays(today, -1) });
  const trend = parseRange({ from: addDays(today, -13), to: today });

  const [cur, prev, outlets, a, open] = await Promise.all([
    salesSummary(t),
    salesSummary(y),
    salesByOutlet(t),
    analytics(trend),
    db
      .select({ n: sql<number>`count(*)`, total: sql<number>`coalesce(sum(${schema.orders.total}),0)` })
      .from(schema.orders)
      .where(eq(schema.orders.status, "OPEN")),
  ]);
  const todayProducts = (await analytics(t)).products.slice(0, 5);

  const map = new Map(a.daily.map((d) => [d.day, d]));
  const daily = [];
  for (let d = trend.from; d <= trend.to; d = addDays(d, 1)) {
    const r = map.get(d);
    daily.push({ label: `${d.slice(8)}/${d.slice(5, 7)}`, value: r?.total ?? 0, count: r?.count ?? 0 });
  }

  return (
    <main>
      <PageHeader title="Dashboard" subtitle={`Hari ini, ${today} · semua outlet`}>
        <Link href="/laporan" className="btn-secondary">Laporan Sales</Link>
        <Link href="/analisis" className="btn-secondary">Analisis</Link>
      </PageHeader>
      <div className="space-y-4 px-4 pb-8 sm:px-6">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <Kpi icon={Wallet} label="Pendapatan hari ini" value={rupiah(cur.total)} d={delta(cur.total, prev.total)} />
          <Kpi icon={Receipt} label="Transaksi" value={cur.count.toLocaleString("id-ID")} d={delta(cur.count, prev.count)} />
          <Kpi icon={TrendingUp} label="Rata-rata / transaksi" value={rupiah(cur.avg)} d={delta(cur.avg, prev.avg)} />
          <Kpi icon={RotateCcw} label="Refund hari ini" value={rupiah(cur.refundTotal)} sub={`${cur.refundCount} transaksi`} />
        </div>

        {Number(open[0].n) > 0 && (
          <Link href="/pesanan" className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 hover:bg-amber-100">
            <ClipboardList className="text-amber-700" />
            <div className="text-sm">
              <span className="font-semibold text-amber-900">{open[0].n} open bill belum dibayar</span>
              <span className="text-amber-800"> · {rupiah(Number(open[0].total))}</span>
            </div>
            <ArrowRight size={16} className="ml-auto text-amber-700" />
          </Link>
        )}

        <section className="card p-4">
          <h2 className="font-semibold">Pendapatan 14 hari terakhir</h2>
          <p className="mb-3 text-xs text-stone-500">Total transaksi lunas per hari, semua outlet</p>
          <ColumnChart data={daily} />
        </section>

        <div className="grid gap-4 xl:grid-cols-2">
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
              <h2 className="font-semibold">Penjualan per outlet hari ini</h2>
              <Link href="/laporan?tab=outlet" className="text-xs text-brand-700 hover:underline">Detail</Link>
            </div>
            <table className="table">
              <thead>
                <tr>
                  <th>Outlet</th>
                  <th className="text-right">Transaksi</th>
                  <th className="text-right">Pendapatan</th>
                </tr>
              </thead>
              <tbody>
                {outlets.map((o) => (
                  <tr key={o.id}>
                    <td>{o.name}</td>
                    <td className="text-right">{o.count}</td>
                    <td className="text-right font-semibold">{rupiah(o.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3">
              <h2 className="font-semibold">Menu terlaris hari ini</h2>
              <Link href="/laporan?tab=produk" className="text-xs text-brand-700 hover:underline">Detail</Link>
            </div>
            <table className="table">
              <tbody>
                {todayProducts.map((p, i) => (
                  <tr key={p.name}>
                    <td className="w-8 text-stone-400">{i + 1}</td>
                    <td>{p.name}</td>
                    <td className="text-right">{p.qty} porsi</td>
                    <td className="text-right font-medium">{rupiah(p.gross)}</td>
                  </tr>
                ))}
                {!todayProducts.length && (
                  <tr>
                    <td className="py-8 text-center text-stone-400">Belum ada penjualan hari ini.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>
        </div>
      </div>
    </main>
  );
}

function Kpi({ icon: Icon, label, value, d, sub }: { icon: typeof Wallet; label: string; value: string; d?: number | null; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="mb-2 flex items-center gap-2 text-sm text-stone-500">
        <Icon size={16} /> {label}
      </div>
      <div className="text-xl font-bold text-stone-900 sm:text-2xl">{value}</div>
      <div className="mt-1 text-xs text-stone-500">
        {sub ??
          (d === null || d === undefined ? (
            "Belum ada data kemarin"
          ) : (
            <>
              <span className={d >= 0 ? "font-semibold text-green-700" : "font-semibold text-red-700"}>
                {d >= 0 ? "▲" : "▼"} {Math.abs(d)}%
              </span>{" "}
              vs kemarin
            </>
          ))}
      </div>
    </div>
  );
}
