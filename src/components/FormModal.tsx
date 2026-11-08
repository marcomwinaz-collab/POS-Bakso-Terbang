"use client";

import { useActionState, useEffect } from "react";
import { X } from "lucide-react";
import type { FormState } from "@/app/actions/admin";

export function FormModal({
  title,
  action,
  onClose,
  children,
  submitLabel = "Simpan",
}: {
  title: string;
  action: (prev: FormState, f: FormData) => Promise<FormState>;
  onClose: () => void;
  children: React.ReactNode;
  submitLabel?: string;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);

  useEffect(() => {
    if (state?.ok) onClose();
  }, [state, onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onMouseDown={onClose}>
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6 shadow-xl" onMouseDown={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="btn-ghost p-1" aria-label="Tutup">
            <X size={18} />
          </button>
        </div>
        <form action={formAction} className="space-y-4">
          {children}
          {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Batal
            </button>
            <button className="btn-primary" disabled={pending}>
              {pending ? "Menyimpan..." : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="label">{label}</label>
      {children}
      {hint && <p className="mt-1 text-xs text-stone-400">{hint}</p>}
    </div>
  );
}

export function Checkbox({ name, label, defaultChecked }: { name: string; label: string; defaultChecked?: boolean }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="h-4 w-4 accent-brand-600" />
      {label}
    </label>
  );
}
