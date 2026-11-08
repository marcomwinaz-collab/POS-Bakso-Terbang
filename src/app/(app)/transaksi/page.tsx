import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { listTransactions, parseRange } from "@/lib/queries";
import { formatDateTime, PAYMENT_LABEL, rupiah, STATUS_LABEL, TYPE_LABEL } from "@/lib/format";
import { Download } from "lucide-react";
import { TransactionActions } from "./TransactionActions";

const STATUS_STYLE: Record<string, string> = {
  PAID: "bg-green-100 text-green-800",
  OPEN: "bg-amber-100 text-amber-800",
  VOID: "bg-stone-200 text-stone-600",
};

export default async function TransaksiPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; status?: string }>;
}) {
  const user = await requireUser();
  const sp = await searchParams;
  const range = parseRange(sp);
  const status = sp.status ?? "";
  const rows = await listTransactions({ ...range, status });
  const paid = rows.filter((r) => r.order.status === "PAID");
  const omzet = paid.reduce((s, r) => s + r.order.total, 0);
  const qs = new URLSearchParams({ from: range.from, to: range.to, status }).toString();

  return (
    <main>
      <PageHeader title="Transaksi" subtitle={`${paid.length} transaksi lunas · Omzet ${rupiah(omzet)}`}>
        <a href={`/transaksi/export?${qs}`} className="btn-secondary">
          <Download size={16} /> Export CSV
        </a>
      </PageHeader>
      <div className="px-4 pb-8 sm:px-6">
        <form className="card mb-4 flex flex-wrap items-end gap-3 p-4">
          <div>
            <label className="label">Dari</label>
            <input type="date" name="from" defaultValue={range.from} className="input" />
          </div>
          <div>
            <label className="label">Sampai</label>
            <input type="date" name="to" defaultValue={range.to} className="input" />
          </div>
          <div>
            <label className="label">Status</label>
            <select name="status" defaultValue={status} className="input">
              <option value="">Semua</option>
              <option value="PAID">Lunas</option>
              <option value="OPEN">Open Bill</option>
              <option value="VOID">Batal</option>
            </select>
          </div>
          <button className="btn-primary">Tampilkan</button>
        </form>
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>No</th>
                <th>Waktu</th>
                <th>Tipe</th>
                <th>Kasir</th>
                <th>Bayar</th>
                <th className="text-right">Total</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ order, tableName, cashierName }) => (
                <tr key={order.id}>
                  <td className="font-mono text-xs">{order.code}</td>
                  <td className="whitespace-nowrap">{formatDateTime(order.paidAt ?? order.createdAt)}</td>
                  <td>
                    {TYPE_LABEL[order.type]}
                    {tableName ? ` · ${tableName}` : ""}
                    {order.customerName && <div className="text-xs text-stone-400">{order.customerName}</div>}
                  </td>
                  <td>{cashierName ?? "-"}</td>
                  <td>{order.paymentMethod ? PAYMENT_LABEL[order.paymentMethod] : "-"}</td>
                  <td className="text-right font-semibold">{rupiah(order.total)}</td>
                  <td>
                    <span className={`badge ${STATUS_STYLE[order.status]}`}>{STATUS_LABEL[order.status]}</span>
                    {order.voidReason && <div className="text-xs text-stone-400">{order.voidReason}</div>}
                  </td>
                  <td className="text-right">
                    <TransactionActions id={order.id} code={order.code} canVoid={order.status === "PAID" && user.role === "ADMIN"} />
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-stone-400">
                    Tidak ada transaksi pada periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
