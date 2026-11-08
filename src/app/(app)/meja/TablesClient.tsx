"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ListPlus, Pencil, Plus, Trash2, Users } from "lucide-react";
import type { DiningTable } from "@/db/schema";
import { addTablesBulk, deleteTable, saveTable } from "@/app/actions/admin";
import { PageHeader } from "@/components/PageHeader";
import { Checkbox, Field, FormModal } from "@/components/FormModal";

export function TablesClient({
  outlets,
  outletId,
  tables,
  occupied,
}: {
  outlets: { id: number; name: string }[];
  outletId: number;
  tables: DiningTable[];
  occupied: number[];
}) {
  const router = useRouter();
  const [edit, setEdit] = useState<DiningTable | "new" | "bulk" | null>(null);
  const [, start] = useTransition();
  const t = edit && typeof edit === "object" ? edit : null;
  const nextNumber = String(Math.max(0, ...tables.map((x) => Number(x.number) || 0)) + 1);

  return (
    <main>
      <PageHeader title="No. Meja" subtitle={`${tables.filter((x) => x.active).length} meja aktif · ${occupied.filter((id) => tables.some((x) => x.id === id)).length} terisi`}>
        <select className="input w-auto" value={outletId} onChange={(e) => router.push(`/meja?outlet=${e.target.value}`)}>
          {outlets.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
        <button className="btn-secondary" onClick={() => setEdit("bulk")}>
          <ListPlus size={16} /> Tambah Banyak
        </button>
        <button className="btn-primary" onClick={() => setEdit("new")}>
          <Plus size={16} /> Tambah Meja
        </button>
      </PageHeader>
      <div className="grid grid-cols-3 gap-3 px-4 pb-8 sm:grid-cols-5 sm:px-6 xl:grid-cols-8">
        {tables.map((x) => {
          const busy = occupied.includes(x.id);
          return (
            <div key={x.id} className={`card p-3 text-center ${!x.active ? "opacity-50" : ""} ${busy ? "border-amber-300 bg-amber-50" : ""}`}>
              <div className="text-xs text-stone-500">Meja</div>
              <div className="text-3xl font-bold">{x.number}</div>
              <div className="mt-1 flex items-center justify-center gap-1 text-xs text-stone-500">
                <Users size={12} /> {x.capacity} · {!x.active ? "Nonaktif" : busy ? "Terisi" : "Kosong"}
              </div>
              <div className="mt-2 flex justify-center gap-1">
                <button className="btn-ghost p-1" onClick={() => setEdit(x)} aria-label="Ubah">
                  <Pencil size={14} />
                </button>
                <button
                  className="btn-ghost p-1 text-red-600"
                  aria-label="Hapus"
                  onClick={() =>
                    confirm(`Hapus meja ${x.number}?`) &&
                    start(async () => {
                      const r = await deleteTable(x.id);
                      if (r?.error) alert(r.error);
                    })
                  }
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
        {!tables.length && <div className="card col-span-full p-10 text-center text-stone-400">Belum ada meja di outlet ini.</div>}
      </div>
      {(edit === "new" || t) && (
        <FormModal title={t ? "Ubah Meja" : "Tambah Meja"} action={saveTable} onClose={() => setEdit(null)}>
          <input type="hidden" name="id" value={t?.id ?? ""} />
          <input type="hidden" name="outletId" value={outletId} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nomor meja" hint="Boleh huruf, mis. A1 atau VIP">
              <input name="number" className="input" defaultValue={t?.number ?? nextNumber} required autoFocus />
            </Field>
            <Field label="Kapasitas (orang)">
              <input name="capacity" type="number" min={1} className="input" defaultValue={t?.capacity ?? 4} />
            </Field>
          </div>
          <Checkbox name="active" label="Aktif" defaultChecked={t?.active ?? true} />
        </FormModal>
      )}
      {edit === "bulk" && (
        <FormModal title="Tambah Banyak Meja" action={addTablesBulk} onClose={() => setEdit(null)} submitLabel="Tambahkan">
          <input type="hidden" name="outletId" value={outletId} />
          <div className="grid grid-cols-3 gap-3">
            <Field label="Dari nomor">
              <input name="from" type="number" min={1} className="input" defaultValue={nextNumber} required />
            </Field>
            <Field label="Sampai nomor">
              <input name="to" type="number" min={1} className="input" defaultValue={Number(nextNumber) + 9} required />
            </Field>
            <Field label="Kapasitas">
              <input name="capacity" type="number" min={1} className="input" defaultValue={4} />
            </Field>
          </div>
          <p className="text-xs text-stone-500">Nomor yang sudah ada akan dilewati.</p>
        </FormModal>
      )}
    </main>
  );
}
