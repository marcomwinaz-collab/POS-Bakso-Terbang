import { Clock, CalendarDays, Flame, ShoppingBasket, Wallet } from "lucide-react";
import { listOutlets, requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { ReportFilters } from "@/components/ReportFilters";
import { ColumnChart, HBarChart } from "@/components/Charts";
import { analytics, parseRange, salesByType, salesSummary } from "@/lib/queries";
import { addDays, PAYMENT_LABEL, rupiah, TYPE_LABEL } from "@/lib/format";

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
// ramp oranye satu-hue (terang → gelap) untuk heatmap
const RAMP = ["#fff4ed", "#ffe6d4", "#ffc9a8", "#ffa271", "#fd6f38", "#f04a12", "#d93408", "#b42509", "#8f2010"];
const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;

export default async function AnalisisPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; outlet?: string }> }) {
  await requireUser("ADMIN");
  const sp = await searchParams;
  const range = parseRange(sp, 29);
  const outlets = await listOutlets();
  const outletId = Number(sp.outlet) || null;
  const f = { start: range.start, end: range.end, outletId };
  const [a, summary, types] = await Promise.all([analytics(f), salesSummary(f), salesByType(f)]);

  // tren harian (isi hari kosong)
  const dayMap = new Map(a.daily.map((d) => [d.day, d]));
  const daily = [];
  for (let d = range.from; d <= range.to; d = addDays(d, 1)) {
    const r = dayMap.get(d);
    daily.push({ label: `${d.slice(8)}/${d.slice(5, 7)}`, value: r?.total ?? 0, count: r?.count ?? 0 });
  }
  const numDays = daily.length;

  // jam
  const hours = a.hourly.map((h) => h.hour);
  const hMin = Math.min(9, ...hours);
  const hMax = Math.max(21, ...hours);
  const hourly = Array.from({ length: hMax - hMin + 1 }, (_, i) => {
    const h = hMin + i;
    const r = a.hourly.find((x) => x.hour === h);
    return { label: hh(h), value: r?.count ?? 0, total: r?.total ?? 0 };
  });
  const peakHour = [...a.hourly].sort((x, y) => y.count - x.count)[0];

  // hari dalam minggu (rata-rata per hari kalender yang muncul di rentang)
  const dowCount = new Map<number, number>();
  for (let d = range.from; d <= range.to; d = addDays(d, 1)) {
    const dow = new Date(d + "T00:00:00Z").getUTCDay();
    dowCount.set(dow, (dowCount.get(dow) ?? 0) + 1);
  }
  const dowTotals = new Map<number, { count: number; total: number }>();
  for (const d of a.daily) {
    const dow = new Date(d.day + "T00:00:00Z").getUTCDay();
    const cur = dowTotals.get(dow) ?? { count: 0, total: 0 };
    dowTotals.set(dow, { count: cur.count + d.count, total: cur.total + d.total });
  }
  const weekday = DAY_ORDER.map((dow) => {
    const t = dowTotals.get(dow) ?? { count: 0, total: 0 };
    const n = dowCount.get(dow) || 1;
    return { label: DAYS[dow], value: Math.round(t.total / n), count: Math.round(t.count / n) };
  });
  const peakDay = [...weekday].sort((x, y) => y.value - x.value)[0];

  // heatmap hari x jam
  const heatHours = Array.from({ length: hMax - hMin + 1 }, (_, i) => hMin + i);
  const heatMax = Math.max(1, ...a.heat.map((h) => h.count));
  const heatVal = (dow: number, h: number) => a.heat.find((x) => x.dow === dow && x.hour === h)?.count ?? 0;

  const top = a.products.slice(0, 10).map((p) => ({ label: p.name, value: p.qty, total: p.gross }));
  const topRevenue = [...a.products].sort((x, y) => y.gross - x.gross).slice(0, 10).map((p) => ({ label: p.name, value: p.gross }));
  const slow = [...a.products].sort((x, y) => x.qty - y.qty).slice(0, 5);
  const payments = a.payments.sort((x, y) => y.total - x.total).map((p) => ({ label: PAYMENT_LABEL[p.method], value: p.total, count: p.count }));
  const typeData = types.filter((t) => t.count).map((t) => ({ label: TYPE_LABEL[t.type], value: t.total, count: t.count }));
  const itemsPerTrx = summary.count ? summary.itemsSold / summary.count : 0;

  return (
    <main>
      <PageHeader title="Analisis" subtitle={`${range.from} s/d ${range.to} · ${summary.count.toLocaleString("id-ID")} transaksi`} />
      <div className="space-y-4 px-4 pb-8 sm:px-6">
        <ReportFilters
          basePath="/analisis"
          from={range.from}
          to={range.to}
          outletId={outletId}
          outlets={outlets.map((o) => ({ id: o.id, name: o.name }))}
        />

        <div className="grid grid-cols-2 gap-3 xl:grid-cols-5">
          <Insight icon={Flame} label="Produk terlaris" value={a.products[0]?.name ?? "-"} sub={a.products[0] ? `${a.products[0].qty} terjual` : undefined} />
          <Insight icon={Clock} label="Jam teramai" value={peakHour ? `${hh(peakHour.hour)}–${hh(peakHour.hour + 1)}` : "-"} sub={peakHour ? `${peakHour.count} transaksi` : undefined} />
          <Insight icon={CalendarDays} label="Hari teramai" value={peakDay?.value ? peakDay.label : "-"} sub={peakDay?.value ? `rata-rata ${rupiah(peakDay.value)}/hari` : undefined} />
          <Insight icon={ShoppingBasket} label="Item per transaksi" value={itemsPerTrx.toLocaleString("id-ID", { maximumFractionDigits: 1 })} sub={`rata-rata belanja ${rupiah(summary.avg)}`} />
          <Insight icon={Wallet} label="Rata-rata omzet harian" value={rupiah(Math.round(summary.total / numDays))} sub={`${Math.round(summary.count / numDays)} transaksi/hari`} />
        </div>

        <Card title="Tren pendapatan harian" hint="Total transaksi lunas per hari">
          <ColumnChart data={daily} />
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card title="Jam teramai" hint="Jumlah transaksi per jam">
            <ColumnChart data={hourly} money={false} height={240} />
          </Card>
          <Card title="Hari teramai" hint="Rata-rata pendapatan per hari dalam seminggu">
            <ColumnChart data={weekday} height={240} />
          </Card>
        </div>

        <Card title="Peta keramaian" hint="Jumlah transaksi menurut hari dan jam — semakin gelap semakin ramai">
          <div className="overflow-x-auto">
            <table className="w-full border-separate border-spacing-0.5 text-xs">
              <thead>
                <tr>
                  <th className="w-16"></th>
                  {heatHours.map((h) => (
                    <th key={h} className="font-normal text-stone-500">{String(h).padStart(2, "0")}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {DAY_ORDER.map((dow) => (
                  <tr key={dow}>
                    <td className="pr-2 text-right text-stone-600">{DAYS[dow]}</td>
                    {heatHours.map((h) => {
                      const v = heatVal(dow, h);
                      const step = v ? Math.min(RAMP.length - 1, Math.ceil((v / heatMax) * (RAMP.length - 1))) : -1;
                      return (
                        <td
                          key={h}
                          title={`${DAYS[dow]} ${hh(h)}: ${v} transaksi`}
                          className="h-7 min-w-7 rounded text-center"
                          style={{ background: step < 0 ? "#f5f5f4" : RAMP[step], color: step >= 5 ? "#fff" : "#44403c" }}
                        >
                          {v || ""}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <div className="grid gap-4 xl:grid-cols-2">
          <Card title="Produk terlaris (qty)" hint="10 menu dengan jumlah terjual terbanyak">
            <HBarChart data={top} money={false} unit="porsi" labelWidth={150} />
          </Card>
          <Card title="Produk penyumbang pendapatan" hint="10 menu dengan nilai penjualan terbesar">
            <HBarChart data={topRevenue} labelWidth={150} />
          </Card>
        </div>

        <div className="grid gap-4 xl:grid-cols-3">
          <Card title="Jenis order" hint="Pendapatan per jenis order">
            <HBarChart data={typeData} />
          </Card>
          <Card title="Metode pembayaran" hint="Pendapatan per metode">
            <HBarChart data={payments} />
          </Card>
          <Card title="Produk kurang laku" hint="5 menu dengan penjualan paling sedikit">
            <table className="table">
              <tbody>
                {slow.map((p) => (
                  <tr key={p.name}>
                    <td>{p.name}</td>
                    <td className="text-right text-stone-500">{p.qty} terjual</td>
                  </tr>
                ))}
                {!slow.length && (
                  <tr>
                    <td className="py-6 text-center text-stone-400">Belum ada data.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </Card>
        </div>
      </div>
    </main>
  );
}

function Card({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <h2 className="font-semibold">{title}</h2>
      {hint && <p className="mb-3 text-xs text-stone-500">{hint}</p>}
      {children}
    </section>
  );
}

function Insight({ icon: Icon, label, value, sub }: { icon: typeof Flame; label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-stone-500">
        <Icon size={14} /> {label}
      </div>
      <div className="line-clamp-1 text-lg font-bold text-stone-900">{value}</div>
      {sub && <div className="text-xs text-stone-500">{sub}</div>}
    </div>
  );
}
