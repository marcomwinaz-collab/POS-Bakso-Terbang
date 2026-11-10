"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, Printer } from "lucide-react";
import { closeShift, openShift } from "@/app/actions/shifts";
import { previewShift, printShift } from "@/lib/print";

const toNum = (v: string) => Number(v.replace(/\D/g, "")) || 0;
const fmt = (v: number) => v.toLocaleString("id-ID");

export function OpenShiftForm() {
  const router = useRouter();
  const [cash, setCash] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setError("");
        start(async () => {
          const r = await openShift(toNum(cash));
          if (!r.ok) setError(r.error);
          router.refresh();
        });
      }}
      className="space-y-3"
    >
      <div className="font-semibold">Buka kasir</div>
      <div>
        <label className="label">Modal awal (uang di laci)</label>
        <input className="input w-full" inputMode="numeric" value={cash} onChange={(e) => setCash(fmt(toNum(e.target.value)))} placeholder="0" />
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Menyimpan..." : "Buka Kasir"}
      </button>
    </form>
  );
}

export function CloseShiftForm({ shiftId, expectedCash }: { shiftId: number; expectedCash: number }) {
  const router = useRouter();
  const [counted, setCounted] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();
  const countedNum = counted === "" ? null : toNum(counted);
  const diff = countedNum === null ? null : countedNum - expectedCash;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (countedNum === null) return setError("Isi jumlah uang tunai yang dihitung di laci.");
        if (!confirm("Tutup kasir sekarang? Laporan akan disimpan dan dicetak (2 lembar).")) return;
        setError("");
        start(async () => {
          const r = await closeShift(shiftId, countedNum, note);
          if (!r.ok) setError(r.error);
          else printShift(r.shiftId);
          router.refresh();
        });
      }}
      className="space-y-3 border-t border-stone-100 pt-3"
    >
      <div className="font-semibold">Tutup kasir / settlement</div>
      <div className="flex justify-between text-sm">
        <span className="text-stone-500">Seharusnya ada di laci</span>
        <span className="font-semibold">Rp {fmt(expectedCash)}</span>
      </div>
      <div>
        <label className="label">Uang tunai yang dihitung di laci</label>
        <input className="input w-full" inputMode="numeric" value={counted} onChange={(e) => setCounted(e.target.value === "" ? "" : fmt(toNum(e.target.value)))} placeholder="0" />
        <button type="button" className="mt-1 text-xs text-brand-600 hover:underline" onClick={() => setCounted(fmt(expectedCash))}>
          Uang pas (Rp {fmt(expectedCash)})
        </button>
        {diff !== null && (
          <div className={`mt-1 text-sm ${diff === 0 ? "text-green-700" : "text-red-600"}`}>
            {diff === 0 ? "Selisih pas" : `Selisih ${diff > 0 ? "lebih" : "kurang"} Rp ${fmt(Math.abs(diff))}`}
          </div>
        )}
      </div>
      <div>
        <label className="label">Catatan (opsional)</label>
        <textarea className="input w-full" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      {error && <div className="text-sm text-red-600">{error}</div>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Menyimpan..." : "Tutup Kasir & Cetak Laporan"}
      </button>
    </form>
  );
}

export function ShiftHistoryActions({ shiftId }: { shiftId: number }) {
  return (
    <div className="flex gap-1">
      <button className="btn-ghost p-1.5" title="Lihat laporan" onClick={() => previewShift(shiftId)}>
        <Eye size={16} />
      </button>
      <button className="btn-ghost p-1.5" title="Cetak ulang (2 lembar)" onClick={() => printShift(shiftId)}>
        <Printer size={16} />
      </button>
    </div>
  );
}
