import Link from "next/link";
import { listOutlets, requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { ReportFilters } from "@/components/ReportFilters";
import {
  parseRange,
  refundList,
  salesByCategory,
  salesByOutlet,
  salesByProduct,
  salesByType,
  salesDetail,
  salesSummary,
} from "@/lib/queries";
import { formatDateTime, PAYMENT_LABEL, rupiah, STATUS_LABEL, STATUS_STYLE, TYPE_LABEL } from "@/lib/format";
import { TransactionActions } from "../transaksi/TransactionActions";

const TABS = [
  { key: "ringkasan", label: "Ringkasan Sales" },
  { key: "detail", label: "Detail Sales" },
  { key: "produk", label: "Sales Produk" },
  { key: "outlet", label: "Sales Outlet" },
  { key: "jenis", label: "Jenis Order" },
  { key: "refund", label: "Refund" },
] as const;

type SP = { tab?: string; from?: string; to?: string; outlet?: string; status?: string };

export default async function LaporanPage({ searchParams }: { searchParams: Promise<SP> }) {
  await requireUser("ADMIN");
  const sp = await searchParams;
  const tab = TABS.find((t) => t.key === sp.tab)?.key ?? "ringkasan";
  const range = parseRange(sp);
  const outlets = await listOutlets();
  const outletId = Number(sp.outlet) || null;
  const filter = { start: range.start, end: range.end, outletId };
  const outletName = outletId ? outlets.find((o) => o.id === outletId)?.name : "Semua outlet";

  const exportQs = new URLSearchParams({ tab, from: range.from, to: range.to, outlet: outletId ? String(outletId) : "", status: sp.status ?? "" });
  const tabQs = (key: string) => new URLSearchParams({ tab: key, from: range.from, to: range.to, ...(outletId ? { outlet: String(outletId) } : {}) }).toString();

  return (
    <main>
      <PageHeader title="Laporan Sales" subtitle={`${outletName} · ${range.from === range.to ? range.from : `${range.from} s/d ${range.to}`}`} />
      <div className="px-4 pb-8 sm:px-6">
        <nav className="mb-4 flex gap-1 overflow-x-auto border-b border-stone-200">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={`/laporan?${tabQs(t.key)}`}
              className={`shrink-0 border-b-2 px-4 py-2 text-sm font-medium ${
                tab === t.key ? "border-brand-600 text-brand-700" : "border-transparent text-stone-500 hover:text-stone-800"
              }`}
            >
              {t.label}
            </Link>
          ))}
        </nav>
        <ReportFilters
          basePath="/laporan"
          params={{ tab }}
          from={range.from}
          to={range.to}
          outletId={outletId}
          outlets={outlets.map((o) => ({ id: o.id, name: o.name }))}
          exportHref={`/laporan/export?${exportQs}`}
          extra={
            tab === "detail" ? (
              <div>
                <label className="label">Status</label>
                <select name="status" defaultValue={sp.status ?? ""} className="input">
                  <option value="">Semua</option>
                  <option value="PAID">Lunas</option>
                  <option value="OPEN">Open Bill</option>
                  <option value="VOID">Batal</option>
                  <option value="REFUNDED">Refund</option>
                </select>
              </div>
            ) : null
          }
        />
        {tab === "ringkasan" && <Ringkasan filter={filter} />}
        {tab === "detail" && <Detail filter={{ ...filter, status: sp.status }} />}
        {tab === "produk" && <Produk filter={filter} />}
        {tab === "outlet" && <PerOutlet filter={filter} />}
        {tab === "jenis" && <JenisOrder filter={filter} />}
        {tab === "refund" && <Refund filter={filter} />}
      </div>
    </main>
  );
}

type F = { start: Date; end: Date; outletId: number | null };

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="mt-1 text-xl font-bold text-stone-900">{value}</div>
      {sub && <div className="mt-0.5 text-xs text-stone-400">{sub}</div>}
    </div>
  );
}

function Empty({ cols, text = "Tidak ada data pada periode ini." }: { cols: number; text?: string }) {
  return (
    <tr>
      <td colSpan={cols} className="py-10 text-center text-stone-400">{text}</td>
    </tr>
  );
}

const pct = (a: number, b: number) => (b ? ((a / b) * 100).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + "%" : "0%");

/* ---------- Ringkasan ---------- */
async function Ringkasan({ filter }: { filter: F }) {
  const s = await salesSummary(filter);
  const lines: [string, number, string?][] = [
    ["Penjualan kotor", s.gross, "Total harga item"],
    ["Diskon", -s.discount],
    ["Penjualan bersih", s.net, "Kotor − diskon"],
    ["Service charge", s.service],
    ["Pajak", s.tax],
    ["Total pendapatan", s.total, "Uang yang diterima"],
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total pendapatan" value={rupiah(s.total)} />
        <Stat label="Jumlah transaksi" value={s.count.toLocaleString("id-ID")} sub={`${s.itemsSold.toLocaleString("id-ID")} item terjual`} />
        <Stat label="Rata-rata per transaksi" value={rupiah(s.avg)} />
        <Stat label="Refund" value={rupiah(s.refundTotal)} sub={`${s.refundCount} transaksi (tidak termasuk di atas)`} />
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="border-b border-stone-200 px-4 py-3 font-semibold">Rincian penjualan</div>
          <table className="table">
            <tbody>
              {lines.map(([l, v, hint]) => (
                <tr key={l} className={l === "Total pendapatan" || l === "Penjualan bersih" ? "font-semibold" : ""}>
                  <td>
                    {l}
                    {hint && <div className="text-xs font-normal text-stone-400">{hint}</div>}
                  </td>
                  <td className={`text-right ${v < 0 ? "text-red-600" : ""}`}>{v < 0 ? "− " + rupiah(-v) : rupiah(v)}</td>
                </tr>
              ))}
              <tr>
                <td>Jumlah tamu (makan di tempat)</td>
                <td className="text-right">{s.guests.toLocaleString("id-ID")} orang</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="card overflow-hidden">
          <div className="border-b border-stone-200 px-4 py-3 font-semibold">Metode pembayaran</div>
          <table className="table">
            <thead>
              <tr>
                <th>Metode</th>
                <th className="text-right">Transaksi</th>
                <th className="text-right">Nominal</th>
                <th className="text-right">Porsi</th>
              </tr>
            </thead>
            <tbody>
              {s.payments.map((p) => (
                <tr key={p.method}>
                  <td>{PAYMENT_LABEL[p.method]}</td>
                  <td className="text-right">{p.count}</td>
                  <td className="text-right font-medium">{rupiah(p.total)}</td>
                  <td className="text-right text-stone-500">{pct(p.total, s.total)}</td>
                </tr>
              ))}
              {!s.payments.length && <Empty cols={4} />}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------- Detail ---------- */
async function Detail({ filter }: { filter: F & { status?: string } }) {
  const rows = await salesDetail(filter);
  return (
    <div className="card overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>No. struk</th>
            <th>Waktu</th>
            <th>Outlet</th>
            <th>Jenis</th>
            <th>Item</th>
            <th className="text-right">Subtotal</th>
            <th className="text-right">Diskon</th>
            <th className="text-right">Total</th>
            <th>Bayar</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ order: o, outletName, cashierName, items }) => (
            <tr key={o.id} className="align-top">
              <td className="font-mono text-xs">
                {o.code}
                <div className="font-sans text-stone-400">{cashierName}</div>
              </td>
              <td className="text-xs whitespace-nowrap">{formatDateTime(o.paidAt ?? o.createdAt)}</td>
              <td className="text-xs">{outletName}</td>
              <td className="text-xs">
                {TYPE_LABEL[o.type]}
                {o.tableNumber && <div className="text-stone-400">Meja {o.tableNumber}</div>}
              </td>
              <td className="min-w-48 text-xs text-stone-600">
                {items.map((i) => (
                  <div key={i.id}>
                    {i.qty}× {i.name}
                  </div>
                ))}
              </td>
              <td className="text-right">{rupiah(o.subtotal)}</td>
              <td className="text-right text-stone-500">{o.discount ? rupiah(o.discount) : "-"}</td>
              <td className="text-right font-semibold">{rupiah(o.total)}</td>
              <td className="text-xs">{o.paymentMethod ? PAYMENT_LABEL[o.paymentMethod] : "-"}</td>
              <td>
                <span className={`badge ${STATUS_STYLE[o.status]}`}>{STATUS_LABEL[o.status]}</span>
              </td>
              <td>
                <TransactionActions id={o.id} code={o.code} status={o.status} canRefund={o.status === "PAID"} />
              </td>
            </tr>
          ))}
          {!rows.length && <Empty cols={11} />}
        </tbody>
      </table>
      {rows.length >= 3000 && <p className="p-3 text-xs text-stone-500">Menampilkan 3.000 transaksi terbaru. Persempit rentang tanggal atau gunakan Export CSV.</p>}
    </div>
  );
}

/* ---------- Produk ---------- */
async function Produk({ filter }: { filter: F }) {
  const [rows, cats] = await Promise.all([salesByProduct(filter), salesByCategory(filter)]);
  const total = rows.reduce((a, r) => a + r.gross, 0);
  const qty = rows.reduce((a, r) => a + r.qty, 0);
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_340px]">
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>#</th>
              <th>Produk</th>
              <th>Kategori</th>
              <th className="text-right">Qty</th>
              <th className="text-right">Penjualan</th>
              <th className="text-right">Kontribusi</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.name + r.category}>
                <td className="text-stone-400">{i + 1}</td>
                <td className="font-medium">{r.name}</td>
                <td className="text-stone-500">{r.category}</td>
                <td className="text-right">{r.qty.toLocaleString("id-ID")}</td>
                <td className="text-right font-medium">{rupiah(r.gross)}</td>
                <td className="text-right text-stone-500">{pct(r.gross, total)}</td>
              </tr>
            ))}
            {!rows.length && <Empty cols={6} />}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="font-semibold">
                <td colSpan={3} className="px-3 py-2">Total</td>
                <td className="px-3 py-2 text-right">{qty.toLocaleString("id-ID")}</td>
                <td className="px-3 py-2 text-right">{rupiah(total)}</td>
                <td className="px-3 py-2 text-right">100%</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <div className="card h-fit overflow-hidden">
        <div className="border-b border-stone-200 px-4 py-3 font-semibold">Per kategori</div>
        <table className="table">
          <tbody>
            {cats.map((c) => (
              <tr key={c.name}>
                <td>
                  {c.name}
                  <div className="text-xs text-stone-400">{c.qty} item</div>
                </td>
                <td className="text-right font-medium">
                  {rupiah(c.gross)}
                  <div className="text-xs font-normal text-stone-400">{pct(c.gross, total)}</div>
                </td>
              </tr>
            ))}
            {!cats.length && <Empty cols={2} />}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Outlet ---------- */
async function PerOutlet({ filter }: { filter: F }) {
  const rows = await salesByOutlet(filter);
  const sum = (k: keyof (typeof rows)[number]) => rows.reduce((a, r) => a + Number(r[k]), 0);
  const total = sum("total");
  return (
    <div className="card overflow-x-auto">
      <table className="table">
        <thead>
          <tr>
            <th>Outlet</th>
            <th className="text-right">Transaksi</th>
            <th className="text-right">Penj. kotor</th>
            <th className="text-right">Diskon</th>
            <th className="text-right">Penj. bersih</th>
            <th className="text-right">Service</th>
            <th className="text-right">Pajak</th>
            <th className="text-right">Total</th>
            <th className="text-right">Rata-rata</th>
            <th className="text-right">Refund</th>
            <th className="text-right">Porsi</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id}>
              <td className="font-medium">{r.name}</td>
              <td className="text-right">{r.count}</td>
              <td className="text-right">{rupiah(r.gross)}</td>
              <td className="text-right text-stone-500">{rupiah(r.discount)}</td>
              <td className="text-right">{rupiah(r.net)}</td>
              <td className="text-right text-stone-500">{rupiah(r.service)}</td>
              <td className="text-right text-stone-500">{rupiah(r.tax)}</td>
              <td className="text-right font-semibold">{rupiah(r.total)}</td>
              <td className="text-right">{rupiah(r.avg)}</td>
              <td className="text-right text-red-700">{r.refundCount ? `${rupiah(r.refundTotal)} (${r.refundCount})` : "-"}</td>
              <td className="text-right text-stone-500">{pct(r.total, total)}</td>
            </tr>
          ))}
          {!rows.length && <Empty cols={11} />}
        </tbody>
        {rows.length > 1 && (
          <tfoot>
            <tr className="font-semibold">
              <td className="px-3 py-2">Total</td>
              <td className="px-3 py-2 text-right">{sum("count")}</td>
              <td className="px-3 py-2 text-right">{rupiah(sum("gross"))}</td>
              <td className="px-3 py-2 text-right">{rupiah(sum("discount"))}</td>
              <td className="px-3 py-2 text-right">{rupiah(sum("net"))}</td>
              <td className="px-3 py-2 text-right">{rupiah(sum("service"))}</td>
              <td className="px-3 py-2 text-right">{rupiah(sum("tax"))}</td>
              <td className="px-3 py-2 text-right">{rupiah(total)}</td>
              <td className="px-3 py-2 text-right">{sum("count") ? rupiah(Math.round(total / sum("count"))) : "-"}</td>
              <td className="px-3 py-2 text-right">{rupiah(sum("refundTotal"))}</td>
              <td className="px-3 py-2 text-right">100%</td>
            </tr>
          </tfoot>
        )}
      </table>
      {filter.outletId && <p className="p-3 text-xs text-stone-500">Laporan outlet selalu menampilkan semua outlet untuk perbandingan.</p>}
    </div>
  );
}

/* ---------- Jenis order ---------- */
async function JenisOrder({ filter }: { filter: F }) {
  const rows = await salesByType(filter);
  const total = rows.reduce((a, r) => a + r.total, 0);
  const count = rows.reduce((a, r) => a + r.count, 0);
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        {rows.map((r) => (
          <div key={r.type} className="card p-4">
            <div className="text-sm text-stone-500">{TYPE_LABEL[r.type]}</div>
            <div className="mt-1 text-xl font-bold">{rupiah(r.total)}</div>
            <div className="mt-2 h-1.5 rounded-full bg-stone-100">
              <div className="h-1.5 rounded-full bg-brand-600" style={{ width: pct(r.total, total).replace(",", ".") }} />
            </div>
            <div className="mt-1 text-xs text-stone-500">
              {pct(r.total, total)} pendapatan · {r.count} transaksi
            </div>
          </div>
        ))}
      </div>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Jenis order</th>
              <th className="text-right">Transaksi</th>
              <th className="text-right">% transaksi</th>
              <th className="text-right">Penj. bersih</th>
              <th className="text-right">Total</th>
              <th className="text-right">Rata-rata</th>
              <th className="text-right">Tamu</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.type}>
                <td className="font-medium">{TYPE_LABEL[r.type]}</td>
                <td className="text-right">{r.count}</td>
                <td className="text-right text-stone-500">{pct(r.count, count)}</td>
                <td className="text-right">{rupiah(r.net)}</td>
                <td className="text-right font-semibold">{rupiah(r.total)}</td>
                <td className="text-right">{rupiah(r.avg)}</td>
                <td className="text-right">{r.type === "DINE_IN" ? r.guests : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ---------- Refund ---------- */
async function Refund({ filter }: { filter: F }) {
  const rows = await refundList(filter);
  const total = rows.reduce((a, r) => a + r.order.total, 0);
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total refund" value={rupiah(total)} />
        <Stat label="Jumlah refund" value={String(rows.length)} />
      </div>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>No. struk</th>
              <th>Outlet</th>
              <th>Waktu transaksi</th>
              <th>Waktu refund</th>
              <th>Kasir</th>
              <th>Direfund oleh</th>
              <th>Alasan</th>
              <th className="text-right">Nominal</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ order: o, outletName, cashierName, refundedBy }) => (
              <tr key={o.id}>
                <td className="font-mono text-xs">{o.code}</td>
                <td className="text-xs">{outletName}</td>
                <td className="text-xs whitespace-nowrap">{formatDateTime(o.paidAt)}</td>
                <td className="text-xs whitespace-nowrap">{formatDateTime(o.refundedAt)}</td>
                <td className="text-xs">{cashierName ?? "-"}</td>
                <td className="text-xs">{refundedBy ?? "-"}</td>
                <td className="text-xs">{o.cancelReason}</td>
                <td className="text-right font-semibold text-red-700">{rupiah(o.total)}</td>
                <td>
                  <TransactionActions id={o.id} code={o.code} status={o.status} canRefund={false} />
                </td>
              </tr>
            ))}
            {!rows.length && <Empty cols={9} text="Tidak ada refund pada periode ini." />}
          </tbody>
        </table>
      </div>
    </div>
  );
}
