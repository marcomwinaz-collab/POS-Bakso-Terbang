"use client";

import { useActionState } from "react";
import { saveSettings } from "@/app/actions/admin";
import { Field } from "@/components/FormModal";

type S = { storeName: string; address: string; phone: string; taxPercent: number; servicePercent: number; receiptFooter: string };

export function SettingsForm({ settings }: { settings: S }) {
  const [state, action, pending] = useActionState(saveSettings, undefined);
  return (
    <form action={action} className="card max-w-2xl space-y-4 p-6">
      <Field label="Nama toko">
        <input name="storeName" className="input" defaultValue={settings.storeName} required />
      </Field>
      <Field label="Alamat">
        <input name="address" className="input" defaultValue={settings.address} />
      </Field>
      <Field label="No. telepon">
        <input name="phone" className="input" defaultValue={settings.phone} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Pajak / PB1 (%)" hint="Dihitung dari subtotal setelah diskon + service">
          <input name="taxPercent" type="number" min={0} max={100} className="input" defaultValue={settings.taxPercent} />
        </Field>
        <Field label="Service charge (%)">
          <input name="servicePercent" type="number" min={0} max={100} className="input" defaultValue={settings.servicePercent} />
        </Field>
      </div>
      <Field label="Catatan kaki struk">
        <textarea name="receiptFooter" rows={2} className="input" defaultValue={settings.receiptFooter} />
      </Field>
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state?.ok && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{state.message}</p>}
      <button className="btn-primary" disabled={pending}>
        {pending ? "Menyimpan..." : "Simpan Pengaturan"}
      </button>
    </form>
  );
}
