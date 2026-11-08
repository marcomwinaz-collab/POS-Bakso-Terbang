"use client";

import { useState } from "react";
import { AlertTriangle, ArrowDownToLine, ArrowUpFromLine, ClipboardCheck } from "lucide-react";
import type { Product } from "@/db/schema";
import { formatDateTime } from "@/lib/format";
import { adjustStock } from "@/app/actions/admin";
import { PageHeader } from "@/components/PageHeader";
import { Field, FormModal } from "@/components/FormModal";

type Movement = {
  id: number;
  type: string;
  qty: number;
  stockAfter: number;
  note: string | null;
  createdAt: number;
  productName: string;
  userName: string | null;
};

const TYPE: Record<string, { label: string; cls: string }> = {
  IN: { label: "Masuk", cls: "bg-green-100 text-green-800" },
  OUT: { label: "Keluar", cls: "bg-red-100 text-red-800" },
  ADJUST: { label: "Opname", cls: "bg-blue-100 text-blue-800" },
  SALE: { label: "Terjual", cls: "bg-stone-100 text-stone-700" },
  VOID: { label: "Batal jual", cls: "bg-amber-100 text-amber-800" },
};

export function StockClient({ products, movements }: { products: Product[]; movements: Movement[] }) {
  const [mode, setMode] = useState<{ type: "IN" | "OUT" | "ADJUST"; productId?: number } | null>(null);
  const low = products.filter((p) => p.active && p.stock <= p.minStock);
  const title = { IN: "Stok Masuk", OUT: "Stok Keluar (rusak/terbuang)", ADJUST: "Stok Opname (hitung fisik)" };

  return (
    <main>
      <PageHeader title="Stok" subtitle="Kelola persediaan produk yang dilacak stoknya">
        <button className="btn-primary" onClick={() => setMode({ type: "IN" })}>
          <ArrowDownToLine size={16} /> Stok Masuk
        </button>
        <button className="btn-secondary" onClick={() => setMode({ type: "OUT" })}>
          <ArrowUpFromLine size={16} /> Stok Keluar
        </button>
        <button className="btn-secondary" onClick={() => setMode({ type: "ADJUST" })}>
          <ClipboardCheck size={16} /> Opname
        </button>
      </PageHeader>

      <div className="grid gap-4 px-4 pb-8 sm:px-6 xl:grid-cols-[1fr_1.4fr]">
        <section className="space-y-4">
          {low.length > 0 && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <div className="mb-2 flex items-center gap-2 font-semibold text-red-800">
                <AlertTriangle size={18} /> {low.length} produk stok menipis
              </div>
              <div className="flex flex-wrap gap-2">
                {low.map((p) => (
                  <button key={p.id} onClick={() => setMode({ type: "IN", productId: p.id })} className="badge bg-white text-red-700 ring-1 ring-red-200 hover:bg-red-100">
                    {p.name}: {p.stock}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="card overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Produk</th>
                  <th className="text-right">Stok</th>
                  <th className="text-right">Min.</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id} className={p.active ? "" : "opacity-50"}>
                    <td className="font-medium">{p.name}</td>
                    <td className={`text-right font-semibold ${p.stock <= p.minStock ? "text-red-600" : ""}`}>{p.stock}</td>
                    <td className="text-right text-stone-400">{p.minStock}</td>
                    <td className="text-right">
                      <button className="btn-ghost px-2 py-1 text-xs" onClick={() => setMode({ type: "IN", productId: p.id })}>
                        + Masuk
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="card overflow-x-auto">
          <div className="border-b border-stone-200 px-4 py-3 font-semibold">Riwayat pergerakan stok</div>
          <table className="table">
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Produk</th>
                <th>Jenis</th>
                <th className="text-right">Qty</th>
                <th className="text-right">Sisa</th>
                <th>Keterangan</th>
              </tr>
            </thead>
            <tbody>
              {movements.map((m) => (
                <tr key={m.id}>
                  <td className="text-xs whitespace-nowrap text-stone-500">{formatDateTime(m.createdAt)}</td>
                  <td>{m.productName}</td>
                  <td>
                    <span className={`badge ${TYPE[m.type]?.cls}`}>{TYPE[m.type]?.label ?? m.type}</span>
                  </td>
                  <td className={`text-right font-medium ${m.qty < 0 ? "text-red-600" : "text-green-700"}`}>
                    {m.qty > 0 ? "+" : ""}
                    {m.qty}
                  </td>
                  <td className="text-right">{m.stockAfter}</td>
                  <td className="text-xs text-stone-500">
                    {m.note}
                    {m.userName && <div>oleh {m.userName}</div>}
                  </td>
                </tr>
              ))}
              {!movements.length && (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-stone-400">Belum ada pergerakan stok.</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>
      </div>

      {mode && (
        <FormModal title={title[mode.type]} action={adjustStock} onClose={() => setMode(null)}>
          <input type="hidden" name="type" value={mode.type} />
          <Field label="Produk">
            <select name="productId" className="input" defaultValue={mode.productId ?? ""} required>
              <option value="">Pilih produk</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} (stok {p.stock})
                </option>
              ))}
            </select>
          </Field>
          <Field label={mode.type === "ADJUST" ? "Jumlah stok fisik sebenarnya" : "Jumlah"}>
            <input name="qty" type="number" min={0} className="input" required autoFocus />
          </Field>
          <Field label="Keterangan">
            <input
              name="note"
              className="input"
              placeholder={mode.type === "IN" ? "Belanja pasar, supplier..." : mode.type === "OUT" ? "Rusak, basi..." : "Opname mingguan"}
            />
          </Field>
        </FormModal>
      )}
    </main>
  );
}
