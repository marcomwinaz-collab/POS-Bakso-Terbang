"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import type { Category, Product } from "@/db/schema";
import { rupiah } from "@/lib/format";
import { deleteProduct, saveProduct } from "@/app/actions/admin";
import { PageHeader } from "@/components/PageHeader";
import { Checkbox, Field, FormModal } from "@/components/FormModal";

export function ProductsClient({ products, categories }: { products: Product[]; categories: Category[] }) {
  const [edit, setEdit] = useState<Product | "new" | null>(null);
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [, start] = useTransition();
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const list = products.filter(
    (p) => p.name.toLowerCase().includes(q.toLowerCase()) && (!cat || String(p.categoryId) === cat),
  );
  const p = edit === "new" ? null : edit;

  return (
    <main>
      <PageHeader title="Produk" subtitle={`${products.length} menu terdaftar`}>
        <button className="btn-primary" onClick={() => setEdit("new")}>
          <Plus size={16} /> Tambah Produk
        </button>
      </PageHeader>
      <div className="px-4 pb-8 sm:px-6">
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="relative w-full sm:w-64">
            <Search size={16} className="absolute top-1/2 left-3 -translate-y-1/2 text-stone-400" />
            <input className="input pl-9" placeholder="Cari produk..." value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <select className="input w-auto" value={cat} onChange={(e) => setCat(e.target.value)}>
            <option value="">Semua kategori</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        <div className="card overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Kategori</th>
                <th className="text-right">Harga</th>
                <th className="text-right">HPP</th>
                <th className="text-right">Margin</th>
                <th className="text-right">Stok</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {list.map((x) => (
                <tr key={x.id} className={x.active ? "" : "opacity-50"}>
                  <td className="font-medium">
                    {x.name}
                    {x.sku && <div className="text-xs text-stone-400">{x.sku}</div>}
                  </td>
                  <td>{x.categoryId ? catName.get(x.categoryId) : "-"}</td>
                  <td className="text-right">{rupiah(x.price)}</td>
                  <td className="text-right text-stone-500">{rupiah(x.cost)}</td>
                  <td className="text-right text-stone-500">{x.price ? Math.round(((x.price - x.cost) / x.price) * 100) : 0}%</td>
                  <td className={`text-right font-medium ${x.trackStock && x.stock <= x.minStock ? "text-red-600" : ""}`}>
                    {x.trackStock ? x.stock : "∞"}
                  </td>
                  <td>
                    <span className={`badge ${x.active ? "bg-green-100 text-green-800" : "bg-stone-200 text-stone-600"}`}>
                      {x.active ? "Aktif" : "Nonaktif"}
                    </span>
                  </td>
                  <td className="text-right whitespace-nowrap">
                    <button className="btn-ghost p-1.5" onClick={() => setEdit(x)} aria-label="Ubah">
                      <Pencil size={16} />
                    </button>
                    <button
                      className="btn-ghost p-1.5 text-red-600"
                      aria-label="Hapus"
                      onClick={() => {
                        if (confirm(`Hapus ${x.name}? (Produk yang pernah terjual akan dinonaktifkan)`)) start(() => deleteProduct(x.id));
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {!list.length && (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-stone-400">Belum ada produk.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {edit && (
        <FormModal title={p ? "Ubah Produk" : "Tambah Produk"} action={saveProduct} onClose={() => setEdit(null)}>
          <input type="hidden" name="id" value={p?.id ?? ""} />
          <Field label="Nama produk">
            <input name="name" className="input" defaultValue={p?.name} required autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Kategori">
              <select name="categoryId" className="input" defaultValue={p?.categoryId ?? ""}>
                <option value="">Tanpa kategori</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </Field>
            <Field label="SKU / Kode (opsional)">
              <input name="sku" className="input" defaultValue={p?.sku ?? ""} />
            </Field>
            <Field label="Harga jual (Rp)">
              <input name="price" type="number" min={0} className="input" defaultValue={p?.price ?? ""} required />
            </Field>
            <Field label="HPP / Modal (Rp)">
              <input name="cost" type="number" min={0} className="input" defaultValue={p?.cost ?? 0} />
            </Field>
            {!p && (
              <Field label="Stok awal">
                <input name="stock" type="number" min={0} className="input" defaultValue={0} />
              </Field>
            )}
            <Field label="Batas stok menipis">
              <input name="minStock" type="number" min={0} className="input" defaultValue={p?.minStock ?? 5} />
            </Field>
          </div>
          {p && <p className="text-xs text-stone-500">Untuk mengubah jumlah stok, gunakan menu Stok.</p>}
          <div className="flex gap-6">
            <Checkbox name="trackStock" label="Lacak stok" defaultChecked={p?.trackStock ?? true} />
            <Checkbox name="active" label="Aktif (tampil di kasir)" defaultChecked={p?.active ?? true} />
          </div>
        </FormModal>
      )}
    </main>
  );
}
