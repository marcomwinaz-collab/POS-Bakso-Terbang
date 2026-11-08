"use client";

import { useState } from "react";
import { Banknote, CreditCard, QrCode, Landmark, X } from "lucide-react";
import { rupiah } from "@/lib/format";
import type { PaymentMethod } from "@/db/schema";

const METHODS: { id: PaymentMethod; label: string; icon: typeof Banknote }[] = [
  { id: "CASH", label: "Tunai", icon: Banknote },
  { id: "QRIS", label: "QRIS", icon: QrCode },
  { id: "DEBIT", label: "Debit", icon: CreditCard },
  { id: "TRANSFER", label: "Transfer", icon: Landmark },
];

function quickAmounts(total: number) {
  const set = new Set<number>([total]);
  for (const step of [5000, 10000, 20000, 50000, 100000]) {
    set.add(Math.ceil(total / step) * step);
  }
  return [...set].filter((v) => v >= total).sort((a, b) => a - b).slice(0, 6);
}

export function PaymentModal({
  total,
  onClose,
  onPay,
  busy,
  error,
}: {
  total: number;
  onClose: () => void;
  onPay: (method: PaymentMethod, paid: number) => void;
  busy?: boolean;
  error?: string | null;
}) {
  const [method, setMethod] = useState<PaymentMethod>("CASH");
  const [paid, setPaid] = useState<string>(String(total));
  const paidNum = Number(paid.replace(/\D/g, "")) || 0;
  const change = paidNum - total;
  const canPay = method !== "CASH" || paidNum >= total;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Pembayaran</h2>
          <button onClick={onClose} className="btn-ghost p-1" aria-label="Tutup">
            <X size={18} />
          </button>
        </div>
        <div className="mb-4 rounded-xl bg-brand-50 p-4 text-center">
          <div className="text-xs text-brand-800">Total tagihan</div>
          <div className="text-3xl font-bold text-brand-700">{rupiah(total)}</div>
        </div>
        <div className="mb-4 grid grid-cols-4 gap-2">
          {METHODS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setMethod(id)}
              className={`flex flex-col items-center gap-1 rounded-lg border p-2 text-xs font-medium ${
                method === id ? "border-brand-600 bg-brand-50 text-brand-700" : "border-stone-200 hover:bg-stone-50"
              }`}
            >
              <Icon size={20} />
              {label}
            </button>
          ))}
        </div>
        {method === "CASH" ? (
          <>
            <label className="label">Uang diterima</label>
            <input
              className="input mb-2 text-lg font-semibold"
              inputMode="numeric"
              value={paidNum ? paidNum.toLocaleString("id-ID") : ""}
              onChange={(e) => setPaid(e.target.value)}
              autoFocus
            />
            <div className="mb-3 flex flex-wrap gap-2">
              {quickAmounts(total).map((v) => (
                <button key={v} onClick={() => setPaid(String(v))} className="btn-secondary px-3 py-1 text-xs">
                  {v === total ? "Uang pas" : rupiah(v)}
                </button>
              ))}
            </div>
            <div className="mb-4 flex justify-between rounded-lg bg-stone-50 px-3 py-2 text-sm">
              <span>Kembalian</span>
              <span className={`font-bold ${change < 0 ? "text-red-600" : "text-green-700"}`}>{rupiah(Math.max(change, 0))}</span>
            </div>
          </>
        ) : (
          <p className="mb-4 rounded-lg bg-stone-50 px-3 py-2 text-sm text-stone-600">
            Pastikan pembayaran {METHODS.find((m) => m.id === method)?.label} sebesar {rupiah(total)} sudah diterima.
          </p>
        )}
        {error && <p className="mb-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <button className="btn-primary w-full py-3 text-base" disabled={!canPay || busy} onClick={() => onPay(method, paidNum)}>
          {busy ? "Memproses..." : "Konfirmasi Bayar"}
        </button>
      </div>
    </div>
  );
}
