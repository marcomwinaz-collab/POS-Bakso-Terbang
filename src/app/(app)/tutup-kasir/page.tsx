import { getActiveOutlet, requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { formatDateTime, PAYMENT_LABEL, rupiah, TYPE_LABEL } from "@/lib/format";
import { getOpenShift, listShifts, shiftReport, userNames } from "@/lib/shift";
import { CloseShiftForm, OpenShiftForm, ShiftHistoryActions } from "./ShiftForms";

export const dynamic = "force-dynamic";

export default async function TutupKasirPage() {
  const user = await requireUser();
  const outlet = await getActiveOutlet(user);
  if (!outlet) return <main className="p-10 text-center text-stone-500">Outlet tidak aktif.</main>;

  const [shift, history] = await Promise.all([getOpenShift(outlet.id), listShifts(outlet.id)]);
  const report = shift ? await shiftReport(shift) : null;
  const names = await userNames(history.flatMap((h) => [h.openedById, h.closedById]));

  return (
    <main>
      <PageHeader
        title="Tutup Kasir"
        subtitle={shift ? `${outlet.name} · periode sejak ${formatDateTime(shift.openedAt)}` : `${outlet.name} · kasir belum dibuka`}
      />
      <div className="grid gap-4 px-4 pb-8 sm:px-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-4">
          {!shift || !report ? (
            <div className="card p-6 text-center text-stone-500">
              Kasir belum dibuka. Isi modal awal di samping untuk mulai mencatat sesi kasir.
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Stat label="Total penjualan" value={rupiah(report.totalSales)} sub={`${report.transactions} transaksi`} />
                <Stat label="Produk terjual" value={`${report.itemsSold} item`} sub={`${report.products.length} jenis menu`} />
                <Stat
                  label="Rata-rata / transaksi"
                  value={rupiah(report.transactions ? report.totalSales / report.transactions : 0)}
                />
                <Stat label="Refund" value={rupiah(report.refundTotal)} sub={`${report.refundCount} transaksi`} />
              </div>
              {report.openBillCount > 0 && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  Masih ada {report.openBillCount} open bill belum dibayar ({rupiah(report.openBillTotal)}). Open bill tidak termasuk
                  dalam penjualan — sebaiknya diselesaikan sebelum tutup kasir.
                </div>
              )}
              <div className="grid gap-4 lg:grid-cols-2">
                <Section title="Rincian penjualan">
                  <Line l="Penjualan kotor" r={rupiah(report.gross)} />
                  <Line l="Diskon" r={"-" + rupiah(report.discount)} />
                  <Line l="Service charge" r={rupiah(report.service)} />
                  <Line l="Pajak" r={rupiah(report.tax)} />
                  <Line l="Total penjualan" r={rupiah(report.totalSales)} bold />
                </Section>
                <Section title="Uang tunai di laci">
                  <Line l="Modal awal" r={rupiah(shift.openingCash)} />
                  <Line l="Penerimaan tunai" r={rupiah(report.cashIn)} />
                  <Line l="Refund tunai" r={"-" + rupiah(report.cashRefund)} />
                  <Line l="Seharusnya ada di laci" r={rupiah(report.expectedCash)} bold />
                </Section>
                <Section title="Metode pembayaran">
                  {report.byMethod.map((m) => (
                    <Line key={m.method} l={`${PAYMENT_LABEL[m.method]} (${m.count})`} r={rupiah(m.total)} />
                  ))}
                </Section>
                <Section title="Jenis order & kasir">
                  {report.byType.map((t) => (
                    <Line key={t.type} l={`${TYPE_LABEL[t.type]} (${t.count})`} r={rupiah(t.total)} />
                  ))}
                  {report.byCashier.map((c) => (
                    <Line key={c.name} l={`Kasir ${c.name} (${c.count})`} r={rupiah(c.total)} />
                  ))}
                  {!report.byType.length && <div className="text-sm text-stone-400">Belum ada data</div>}
                </Section>
              </div>
              <div className="card overflow-x-auto">
                <div className="px-4 pt-4 font-semibold">Produk terjual ({report.itemsSold} item)</div>
                <table className="table">
                  <thead>
                    <tr>
                      <th>Produk</th>
                      <th>Kategori</th>
                      <th className="text-right">Qty</th>
                      <th className="text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.products.map((p) => (
                      <tr key={p.name}>
                        <td>{p.name}</td>
                        <td className="text-stone-500">{p.category}</td>
                        <td className="text-right">{p.qty}</td>
                        <td className="text-right">{rupiah(p.total)}</td>
                      </tr>
                    ))}
                    {!report.products.length && (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-stone-400">Belum ada data</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        <div className="space-y-4">
          {shift && report ? (
            <div className="card p-4">
              <div className="mb-3 text-sm">
                <div className="font-semibold text-green-700">Kasir sedang dibuka</div>
                <div className="text-stone-500">
                  Sejak {formatDateTime(shift.openedAt)} oleh {report.openedByName}
                </div>
                <div className="text-stone-500">Modal awal {rupiah(shift.openingCash)}</div>
              </div>
              <CloseShiftForm shiftId={shift.id} expectedCash={report.expectedCash} />
            </div>
          ) : (
            <div className="card p-4">
              <OpenShiftForm />
            </div>
          )}

          <div className="card p-4">
            <div className="mb-2 font-semibold">Riwayat tutup kasir</div>
            <div className="divide-y divide-stone-100">
              {history.map((h) => {
                const diff = (h.countedCash ?? 0) - (h.expectedCash ?? 0);
                return (
                  <div key={h.id} className="flex items-center gap-2 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{formatDateTime(h.closedAt)}</div>
                      <div className="text-xs text-stone-500">
                        {names.get(h.openedById ?? 0) ?? "-"} ·{" "}
                        {diff === 0 ? "selisih pas" : `selisih ${diff > 0 ? "+" : "-"}${rupiah(Math.abs(diff))}`}
                      </div>
                    </div>
                    <ShiftHistoryActions shiftId={h.id} />
                  </div>
                );
              })}
              {!history.length && <div className="py-2 text-sm text-stone-400">Belum ada riwayat.</div>}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-stone-500">{label}</div>
      <div className="text-lg font-bold">{value}</div>
      {sub && <div className="text-xs text-stone-400">{sub}</div>}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card space-y-1.5 p-4">
      <div className="mb-1 font-semibold">{title}</div>
      {children}
    </div>
  );
}

function Line({ l, r, bold }: { l: string; r: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between text-sm ${bold ? "border-t border-stone-100 pt-1.5 font-semibold" : ""}`}>
      <span className="text-stone-600">{l}</span>
      <span>{r}</span>
    </div>
  );
}
