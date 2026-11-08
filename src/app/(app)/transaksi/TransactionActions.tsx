"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, Printer, Undo2 } from "lucide-react";
import { refundOrder } from "@/app/actions/orders";
import { previewOrder, printOrder } from "@/lib/print";

export function TransactionActions({ id, code, status, canRefund }: { id: number; code: string; status: string; canRefund: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex justify-end gap-1">
      <button className="btn-ghost p-1.5" title="Lihat struk" onClick={() => previewOrder(id, status === "OPEN" ? "bill" : "receipt")}>
        <Eye size={16} />
      </button>
      <button className="btn-ghost p-1.5" title="Cetak ulang" onClick={() => printOrder(id, status === "OPEN" ? "bill" : "receipt")}>
        <Printer size={16} />
      </button>
      {canRefund && (
        <button
          className="btn-ghost p-1.5 text-red-600"
          title="Refund transaksi"
          disabled={pending}
          onClick={() => {
            const reason = prompt(`Refund transaksi ${code}? Tulis alasannya:`);
            if (!reason) return;
            start(async () => {
              const r = await refundOrder(id, reason);
              if (!r.ok) alert(r.error);
              router.refresh();
            });
          }}
        >
          <Undo2 size={16} />
        </button>
      )}
    </div>
  );
}
