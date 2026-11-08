import type { Order, OrderItem, Outlet } from "@/db/schema";
import { formatDateTime, PAYMENT_LABEL, TYPE_LABEL } from "@/lib/format";

export type PrintMode = "receipt" | "bill" | "kitchen";

type Props = {
  mode: PrintMode;
  businessName: string;
  outlet: Outlet;
  order: Pick<
    Order,
    | "code"
    | "type"
    | "tableNumber"
    | "customerName"
    | "guests"
    | "status"
    | "subtotal"
    | "discount"
    | "service"
    | "tax"
    | "total"
    | "paymentMethod"
    | "paidAmount"
    | "change"
    | "note"
    | "createdAt"
    | "paidAt"
    | "cancelReason"
  >;
  items: Pick<OrderItem, "name" | "qty" | "price" | "subtotal" | "note">[];
  cashierName?: string | null;
  copyLabel?: string;
};

const n = (v: number) => v.toLocaleString("id-ID");

/** Struk thermal 58/80 mm. Teks hitam polos agar tajam di printer thermal. */
export function Receipt({ mode, businessName, outlet, order, items, cashierName, copyLabel }: Props) {
  const width = outlet.paperWidth === 58 ? "58mm" : "80mm";
  const wrap = { width, fontSize: `${outlet.fontSize}px` } as const;

  if (mode === "kitchen") {
    return (
      <div className="receipt-page bg-white p-3 font-mono leading-snug text-black" style={wrap}>
        <div className="text-center text-[1.3em] font-bold">ORDER DAPUR</div>
        <div className="text-center">{outlet.name}</div>
        <Divider />
        <div className="text-[1.4em] font-bold">
          {order.type === "DINE_IN" ? `MEJA ${order.tableNumber ?? "-"}` : TYPE_LABEL[order.type].toUpperCase()}
        </div>
        {order.customerName && <div>{order.customerName}</div>}
        <div>{order.code}</div>
        <div>{formatDateTime(order.createdAt)}</div>
        <Divider />
        {items.map((it, i) => (
          <div key={i} className="mb-1.5">
            <div className="text-[1.25em] font-bold">
              {it.qty} x {it.name}
            </div>
            {it.note && <div className="pl-3">** {it.note}</div>}
          </div>
        ))}
        {order.note && (
          <>
            <Divider />
            <div>Catatan: {order.note}</div>
          </>
        )}
        <Divider />
      </div>
    );
  }

  const isPaid = order.status === "PAID" || order.status === "REFUNDED";
  return (
    <div className="receipt-page bg-white p-3 font-mono leading-snug text-black" style={wrap}>
      <div className="text-center">
        {outlet.showLogo && <img src="/logo.svg" alt="" className="mx-auto mb-1 h-10 w-10 grayscale" />}
        <div className="text-[1.25em] font-bold">{businessName}</div>
        <div>{outlet.name}</div>
        {outlet.address && <div>{outlet.address}</div>}
        {outlet.phone && <div>Telp. {outlet.phone}</div>}
        {outlet.receiptHeader && <div className="mt-1 whitespace-pre-line">{outlet.receiptHeader}</div>}
      </div>
      <Divider />
      {mode === "bill" && <div className="text-center font-bold">*** TAGIHAN - BELUM LUNAS ***</div>}
      {order.status === "REFUNDED" && <div className="text-center font-bold">*** REFUND ***</div>}
      {order.status === "VOID" && <div className="text-center font-bold">*** DIBATALKAN ***</div>}
      {copyLabel && <div className="text-center">{copyLabel}</div>}
      <Row l="No" r={order.code} />
      <Row l="Waktu" r={formatDateTime(order.paidAt ?? order.createdAt)} />
      <Row l="Tipe" r={TYPE_LABEL[order.type]} />
      {order.tableNumber && <Row l="Meja" r={`${order.tableNumber}${order.guests ? ` (${order.guests} org)` : ""}`} />}
      {order.customerName && <Row l="Pelanggan" r={order.customerName} />}
      {cashierName && <Row l="Kasir" r={cashierName} />}
      <Divider />
      {items.map((it, i) => (
        <div key={i} className="mb-1">
          <div>{it.name}</div>
          <Row l={`  ${it.qty} x ${n(it.price)}`} r={n(it.subtotal)} />
          {it.note && <div className="pl-3 italic">* {it.note}</div>}
        </div>
      ))}
      <Divider />
      <Row l="Subtotal" r={n(order.subtotal)} />
      {order.discount > 0 && <Row l="Diskon" r={"-" + n(order.discount)} />}
      {order.service > 0 && <Row l={`Service ${outlet.servicePercent}%`} r={n(order.service)} />}
      {order.tax > 0 && <Row l={`Pajak ${outlet.taxPercent}%`} r={n(order.tax)} />}
      <div className="flex justify-between text-[1.2em] font-bold">
        <span>TOTAL</span>
        <span>{n(order.total)}</span>
      </div>
      {isPaid && mode === "receipt" && (
        <>
          <Row l={PAYMENT_LABEL[order.paymentMethod ?? "CASH"]} r={n(order.paidAmount)} />
          {order.paymentMethod === "CASH" && <Row l="Kembali" r={n(order.change)} />}
        </>
      )}
      {order.status === "REFUNDED" && order.cancelReason && <div className="mt-1">Alasan: {order.cancelReason}</div>}
      <Divider />
      {outlet.receiptFooter && <div className="text-center whitespace-pre-line">{outlet.receiptFooter}</div>}
    </div>
  );
}

function Divider() {
  return <div className="my-1.5 border-t border-dashed border-black" />;
}

function Row({ l, r }: { l: string; r: string }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="whitespace-pre">{l}</span>
      <span className="text-right">{r}</span>
    </div>
  );
}
