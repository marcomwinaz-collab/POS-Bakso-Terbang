"use client";

import { useState, useTransition } from "react";
import { Armchair, Pencil, Plus, Trash2 } from "lucide-react";
import type { DiningTable } from "@/db/schema";
import { deleteTable, saveTable } from "@/app/actions/admin";
import { PageHeader } from "@/components/PageHeader";
import { Checkbox, Field, FormModal } from "@/components/FormModal";

export function TablesClient({ tables, occupied }: { tables: DiningTable[]; occupied: number[] }) {
  const [edit, setEdit] = useState<DiningTable | "new" | null>(null);
  const [, start] = useTransition();
  const t = edit === "new" ? null : edit;

  return (
    <main>
      <PageHeader title="Meja" subtitle={`${occupied.length} dari ${tables.filter((x) => x.active).length} meja terisi`}>
        <button className="btn-primary" onClick={() => setEdit("new")}>
          <Plus size={16} /> Tambah Meja
        </button>
      </PageHeader>
      <div className="grid grid-cols-2 gap-3 px-4 pb-8 sm:grid-cols-4 sm:px-6 xl:grid-cols-6">
        {tables.map((x) => {
          const busy = occupied.includes(x.id);
          return (
            <div key={x.id} className={`card p-4 ${!x.active ? "opacity-50" : ""} ${busy ? "border-amber-300 bg-amber-50" : ""}`}>
              <Armchair className={busy ? "text-amber-600" : "text-stone-400"} />
              <div className="mt-2 font-semibold">{x.name}</div>
              <div className="text-xs text-stone-500">{!x.active ? "Nonaktif" : busy ? "Terisi" : "Kosong"}</div>
              <div className="mt-2 flex gap-1">
                <button className="btn-ghost p-1" onClick={() => setEdit(x)} aria-label="Ubah">
                  <Pencil size={14} />
                </button>
                <button
                  className="btn-ghost p-1 text-red-600"
                  aria-label="Hapus"
                  onClick={() =>
                    confirm(`Hapus ${x.name}?`) &&
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
      </div>
      {edit && (
        <FormModal title={t ? "Ubah Meja" : "Tambah Meja"} action={saveTable} onClose={() => setEdit(null)}>
          <input type="hidden" name="id" value={t?.id ?? ""} />
          <Field label="Nama meja">
            <input name="name" className="input" defaultValue={t?.name ?? `Meja ${tables.length + 1}`} required autoFocus />
          </Field>
          <Checkbox name="active" label="Aktif" defaultChecked={t?.active ?? true} />
        </FormModal>
      )}
    </main>
  );
}
