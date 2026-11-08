import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { formatDateTime, PAYMENT_LABEL, rupiah, TYPE_LABEL } from "@/lib/format";
import { PrintButton } from "./PrintButton";

export const dynamic = "force-dynamic";

export default async function StrukPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.id, Number(id)) });
  if (!order) notFound();
  const [items, settings, table, cashier] = await Promise.all([
    db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id)),
    db.query.settings.findFirst(),
    order.tableId ? db.query.diningTables.findFirst({ where: eq(schema.diningTables.id, order.tableId) }) : null,
    order.cashierId ? db.query.users.findFirst({ where: eq(schema.users.id, order.cashierId) }) : null,
  ]);

  const isPaid = order.status === "PAID";

  return (
    <div className="flex min-h-screen flex-col items-center bg-stone-100 py-6 print:bg-white print:py-0">
      <style>{`@page { size: 80mm auto; margin: 0; }`}</style>
      <div className="no-print mb-4 flex gap-2">
        <PrintButton />
      </div>
      <div className="w-[80mm] bg-white p-4 font-mono text-[12px] leading-snug text-black shadow print:shadow-none">
        <div className="text-center">
          <div className="text-base font-bold">{settings?.storeName ?? "Bakso Terbang"}</div>
          {settings?.address && <div>{settings.address}</div>}
          {settings?.phone && <div>Telp. {settings.phone}</div>}
        </div>
        <Divider />
        {!isPaid && (
          <div className="mb-1 text-center font-bold">{order.status === "VOID" ? "*** DIBATALKAN ***" : "*** TAGIHAN / BELUM LUNAS ***"}</div>
        )}
        <div className="flex justify-between"><span>No</span><span>{order.code}</span></div>
        <div className="flex justify-between"><span>Waktu</span><span>{formatDateTime(order.paidAt ?? order.createdAt)}</span></div>
        <div className="flex justify-between"><span>Tipe</span><span>{TYPE_LABEL[order.type]}{table ? ` - ${table.name}` : ""}</span></div>
        {order.customerName && <div className="flex justify-between"><span>Pelanggan</span><span>{order.customerName}</span></div>}
        {cashier && <div className="flex justify-between"><span>Kasir</span><span>{cashier.name}</span></div>}
        <Divider />
        {items.map((it) => (
          <div key={it.id} className="mb-1">
            <div>{it.name}</div>
            <div className="flex justify-between">
              <span>{it.qty} x {it.price.toLocaleString("id-ID")}</span>
              <span>{it.subtotal.toLocaleString("id-ID")}</span>
            </div>
            {it.note && <div className="italic">  * {it.note}</div>}
          </div>
        ))}
        <Divider />
        <Line label="Subtotal" value={order.subtotal} />
        {order.discount > 0 && <Line label="Diskon" value={-order.discount} />}
        {order.service > 0 && <Line label="Service" value={order.service} />}
        {order.tax > 0 && <Line label="Pajak" value={order.tax} />}
        <div className="flex justify-between text-sm font-bold"><span>TOTAL</span><span>{rupiah(order.total)}</span></div>
        {isPaid && (
          <>
            <Line label={PAYMENT_LABEL[order.paymentMethod ?? "CASH"]} value={order.paidAmount} />
            {order.paymentMethod === "CASH" && <Line label="Kembali" value={order.change} />}
          </>
        )}
        <Divider />
        <div className="text-center">{settings?.receiptFooter}</div>
      </div>
    </div>
  );
}

function Divider() {
  return <div className="my-2 border-t border-dashed border-black" />;
}

function Line({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex justify-between">
      <span>{label}</span>
      <span>{value < 0 ? "-" + (-value).toLocaleString("id-ID") : value.toLocaleString("id-ID")}</span>
    </div>
  );
}
