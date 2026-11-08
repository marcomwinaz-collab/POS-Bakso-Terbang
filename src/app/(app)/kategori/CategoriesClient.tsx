"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { deleteCategory, saveCategory } from "@/app/actions/admin";
import { PageHeader } from "@/components/PageHeader";
import { Field, FormModal } from "@/components/FormModal";

type Row = { id: number; name: string; sort: number; count: number };

export function CategoriesClient({ rows }: { rows: Row[] }) {
  const [edit, setEdit] = useState<Row | "new" | null>(null);
  const [, start] = useTransition();
  const c = edit === "new" ? null : edit;

  return (
    <main>
      <PageHeader title="Kategori" subtitle="Kelompok menu yang tampil di kasir">
        <button className="btn-primary" onClick={() => setEdit("new")}>
          <Plus size={16} /> Tambah Kategori
        </button>
      </PageHeader>
      <div className="px-4 pb-8 sm:px-6">
        <div className="card max-w-2xl overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Urutan</th>
                <th>Nama</th>
                <th className="text-right">Jumlah produk</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="w-20">{r.sort}</td>
                  <td className="font-medium">{r.name}</td>
                  <td className="text-right">{r.count}</td>
                  <td className="text-right whitespace-nowrap">
                    <button className="btn-ghost p-1.5" onClick={() => setEdit(r)} aria-label="Ubah">
                      <Pencil size={16} />
                    </button>
                    <button
                      className="btn-ghost p-1.5 text-red-600"
                      aria-label="Hapus"
                      onClick={() => confirm(`Hapus kategori ${r.name}? Produknya akan menjadi tanpa kategori.`) && start(() => deleteCategory(r.id))}
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {!rows.length && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-stone-400">Belum ada kategori.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {edit && (
        <FormModal title={c ? "Ubah Kategori" : "Tambah Kategori"} action={saveCategory} onClose={() => setEdit(null)}>
          <input type="hidden" name="id" value={c?.id ?? ""} />
          <Field label="Nama kategori">
            <input name="name" className="input" defaultValue={c?.name} required autoFocus />
          </Field>
          <Field label="Urutan tampil" hint="Angka kecil tampil lebih dulu">
            <input name="sort" type="number" className="input" defaultValue={c?.sort ?? rows.length + 1} />
          </Field>
        </FormModal>
      )}
    </main>
  );
}
