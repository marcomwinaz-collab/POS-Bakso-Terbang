"use client";

import { useActionState } from "react";
import { saveSettings } from "@/app/actions/admin";
import { Field } from "@/components/FormModal";

export function SettingsForm({ businessName }: { businessName: string }) {
  const [state, action, pending] = useActionState(saveSettings, undefined);
  return (
    <form action={action} className="card max-w-xl space-y-4 p-6">
      <Field label="Nama usaha" hint="Tampil di bagian atas struk semua outlet">
        <input name="businessName" className="input" defaultValue={businessName} required />
      </Field>
      {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
      {state?.ok && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{state.message}</p>}
      <button className="btn-primary" disabled={pending}>
        {pending ? "Menyimpan..." : "Simpan"}
      </button>
    </form>
  );
}
