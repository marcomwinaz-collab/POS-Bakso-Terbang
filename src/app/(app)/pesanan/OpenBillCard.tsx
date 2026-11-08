"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Clock, Pencil, Printer, XCircle } from "lucide-react";
import type { Order, OrderItem } from "@/db/schema";
import { formatDateTime, rupiah } from "@/lib/format";
import { payOrder, voidOrder } from "@/app/actions/orders";
import { PaymentModal } from "@/components/PaymentModal";

export function OpenBillCard({ order, items, tableName }: { order: Order; items: OrderItem[]; tableName: string | null }) {
  const router = useRouter();
  const [showPay, setShowPay] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  return (
    <div className="card flex flex-col p-4">
      <div className="mb-2 flex items-start justify-between">
        <div>
          <div className="text-lg font-bold">{tableName ?? "Bawa pulang"}</div>
          <div className="text-xs text-stone-500">
            {order.code}
            {order.customerName ? ` · ${order.customerName}` : ""}
          </div>
        </div>
        <span className="badge bg-amber-100 text-amber-800">
          <Clock size={12} className="mr-1" /> {formatDateTime(order.createdAt).slice(11)}
        </span>
      </div>
      <ul className="mb-3 flex-1 space-y-1 text-sm">
        {items.map((i) => (
          <li key={i.id} className="flex justify-between gap-2">
            <span>
              {i.qty}× {i.name}
              {i.note && <span className="block text-xs text-stone-400 italic">{i.note}</span>}
            </span>
            <span className="text-stone-500">{rupiah(i.subtotal)}</span>
          </li>
        ))}
      </ul>
      <div className="mb-3 flex justify-between border-t border-dashed border-stone-200 pt-2 font-bold">
        <span>Total</span>
        <span className="text-brand-700">{rupiah(order.total)}</span>
      </div>
      {error && !showPay && <p className="mb-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700">{error}</p>}
      <div className="flex gap-2">
        <button className="btn-primary flex-1" onClick={() => { setError(null); setShowPay(true); }}>
          Bayar
        </button>
        <Link href={`/kasir?order=${order.id}`} className="btn-secondary px-3" title="Ubah pesanan">
          <Pencil size={16} />
        </Link>
        <button className="btn-secondary px-3" title="Cetak tagihan" onClick={() => window.open(`/struk/${order.id}`, "_blank", "width=420,height=700")}>
          <Printer size={16} />
        </button>
        <button
          className="btn-secondary px-3 text-red-600"
          title="Batalkan"
          disabled={pending}
          onClick={() => {
            const reason = prompt("Alasan pembatalan pesanan " + order.code + "?");
            if (reason === null) return;
            start(async () => {
              const r = await voidOrder(order.id, reason);
              if (!r.ok) setError(r.error);
              router.refresh();
            });
          }}
        >
          <XCircle size={16} />
        </button>
      </div>
      {showPay && (
        <PaymentModal
          total={order.total}
          busy={pending}
          error={error}
          onClose={() => setShowPay(false)}
          onPay={(method, paid) =>
            start(async () => {
              const r = await payOrder(order.id, method, paid);
              if (!r.ok) return setError(r.error);
              setShowPay(false);
              if (method === "CASH" && r.change) alert(`Kembalian: ${rupiah(r.change)}`);
              window.open(`/struk/${order.id}`, "_blank", "width=420,height=700");
              router.refresh();
            })
          }
        />
      )}
    </div>
  );
}
