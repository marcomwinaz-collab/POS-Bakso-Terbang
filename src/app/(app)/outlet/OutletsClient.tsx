"use client";

import { useState } from "react";
import { MapPin, Pencil, Phone, Plus } from "lucide-react";
import type { Outlet } from "@/db/schema";
import { saveOutlet } from "@/app/actions/admin";
import { PageHeader } from "@/components/PageHeader";
import { Checkbox, Field, FormModal } from "@/components/FormModal";

export function OutletsClient({ outlets }: { outlets: Outlet[] }) {
  const [edit, setEdit] = useState<Outlet | "new" | null>(null);
  const o = edit === "new" ? null : edit;
  return (
    <main>
      <PageHeader title="Outlet" subtitle="Cabang, pajak, dan service charge">
        <button className="btn-primary" onClick={() => setEdit("new")}>
          <Plus size={16} /> Tambah Outlet
        </button>
      </PageHeader>
      <div className="grid gap-4 px-4 pb-8 sm:px-6 md:grid-cols-2 xl:grid-cols-3">
        {outlets.map((x) => (
          <div key={x.id} className={`card p-5 ${x.active ? "" : "opacity-50"}`}>
            <div className="mb-2 flex items-start justify-between">
              <div>
                <span className="badge mb-1 bg-stone-100 font-mono text-stone-700">{x.code}</span>
                <div className="text-lg font-bold">{x.name}</div>
              </div>
              <button className="btn-ghost p-1.5" onClick={() => setEdit(x)} aria-label="Ubah">
                <Pencil size={16} />
              </button>
            </div>
            <div className="space-y-1 text-sm text-stone-600">
              {x.address && (
                <div className="flex gap-2">
                  <MapPin size={14} className="mt-0.5 shrink-0" /> {x.address}
                </div>
              )}
              {x.phone && (
                <div className="flex gap-2">
                  <Phone size={14} className="mt-0.5 shrink-0" /> {x.phone}
                </div>
              )}
            </div>
            <div className="mt-3 flex gap-2 text-xs">
              <span className="badge bg-brand-50 text-brand-800">Pajak {x.taxPercent}%</span>
              <span className="badge bg-brand-50 text-brand-800">Service {x.servicePercent}%</span>
              {!x.active && <span className="badge bg-stone-200 text-stone-600">Nonaktif</span>}
            </div>
          </div>
        ))}
      </div>
      {edit && (
        <FormModal title={o ? "Ubah Outlet" : "Tambah Outlet"} action={saveOutlet} onClose={() => setEdit(null)}>
          <input type="hidden" name="id" value={o?.id ?? ""} />
          <div className="grid grid-cols-[100px_1fr] gap-3">
            <Field label="Kode" hint="Awalan no. struk">
              <input name="code" className="input uppercase" defaultValue={o?.code} maxLength={5} required />
            </Field>
            <Field label="Nama outlet">
              <input name="name" className="input" defaultValue={o?.name} required autoFocus />
            </Field>
          </div>
          <Field label="Alamat">
            <input name="address" className="input" defaultValue={o?.address} />
          </Field>
          <Field label="No. telepon">
            <input name="phone" className="input" defaultValue={o?.phone} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Pajak / PB1 (%)">
              <input name="taxPercent" type="number" min={0} max={100} className="input" defaultValue={o?.taxPercent ?? 0} />
            </Field>
            <Field label="Service charge (%)">
              <input name="servicePercent" type="number" min={0} max={100} className="input" defaultValue={o?.servicePercent ?? 0} />
            </Field>
          </div>
          <Checkbox name="active" label="Outlet aktif" defaultChecked={o?.active ?? true} />
        </FormModal>
      )}
    </main>
  );
}
