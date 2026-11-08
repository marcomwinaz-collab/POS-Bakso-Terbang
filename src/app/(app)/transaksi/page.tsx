import { getActiveOutlet, requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { parseRange, salesDetail } from "@/lib/queries";
import { formatDateTime, PAYMENT_LABEL, rupiah, STATUS_LABEL, STATUS_STYLE, TYPE_LABEL } from "@/lib/format";
import { TransactionActions } from "./TransactionActions";


export default async function TransaksiPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string; status?: string }> }) {
  const user = await requireUser();
  const outlet = await getActiveOutlet(user);
  if (!outlet) return <main className="p-10 text-center text-stone-500">Outlet tidak aktif.</main>;
  const sp = await searchParams;
  const range = parseRange(sp);
  const status = sp.status ?? "";
  const rows = await salesDetail({ ...range, outletId: outlet.id, status });
  const paid = rows.filter((r) => r.order.status === "PAID");
  const total = paid.reduce((s, r) => s + r.order.total, 0);

  return (
    <main>
      <PageHeader title="Transaksi" subtitle={`${outlet.name} · ${paid.length} transaksi lunas · ${rupiah(total)}`} />
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
              <option value="REFUNDED">Refund</option>
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
                <th>Jenis</th>
                <th>Item</th>
                <th>Bayar</th>
                <th className="text-right">Total</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ order, items, cashierName }) => (
                <tr key={order.id}>
                  <td className="font-mono text-xs">
                    {order.code}
                    <div className="font-sans text-stone-400">{cashierName}</div>
                  </td>
                  <td className="whitespace-nowrap">{formatDateTime(order.paidAt ?? order.createdAt)}</td>
                  <td>
                    {TYPE_LABEL[order.type]}
                    {order.tableNumber ? ` · Meja ${order.tableNumber}` : ""}
                    {order.customerName && <div className="text-xs text-stone-400">{order.customerName}</div>}
                  </td>
                  <td className="max-w-64 text-xs text-stone-600">{items.map((i) => `${i.qty}× ${i.name}`).join(", ")}</td>
                  <td>{order.paymentMethod ? PAYMENT_LABEL[order.paymentMethod] : "-"}</td>
                  <td className="text-right font-semibold">{rupiah(order.total)}</td>
                  <td>
                    <span className={`badge ${STATUS_STYLE[order.status]}`}>{STATUS_LABEL[order.status]}</span>
                    {order.cancelReason && <div className="text-xs text-stone-400">{order.cancelReason}</div>}
                  </td>
                  <td className="text-right">
                    <TransactionActions id={order.id} code={order.code} status={order.status} canRefund={order.status === "PAID" && user.role === "ADMIN"} />
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-stone-400">Tidak ada transaksi pada periode ini.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
