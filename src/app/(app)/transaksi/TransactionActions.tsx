"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Printer, Undo2 } from "lucide-react";
import { voidOrder } from "@/app/actions/orders";

export function TransactionActions({ id, code, canVoid }: { id: number; code: string; canVoid: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex justify-end gap-1">
      <button className="btn-ghost p-1.5" title="Lihat / cetak struk" onClick={() => window.open(`/struk/${id}`, "_blank", "width=420,height=700")}>
        <Printer size={16} />
      </button>
      {canVoid && (
        <button
          className="btn-ghost p-1.5 text-red-600"
          title="Batalkan transaksi (stok dikembalikan)"
          disabled={pending}
          onClick={() => {
            const reason = prompt(`Batalkan transaksi ${code}? Tulis alasannya:`);
            if (reason === null) return;
            start(async () => {
              const r = await voidOrder(id, reason);
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
