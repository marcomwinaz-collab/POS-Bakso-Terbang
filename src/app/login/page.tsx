"use client";

import { useActionState } from "react";
import { login } from "@/app/actions/auth";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, undefined);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-700 via-brand-600 to-brand-400 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 text-center">
          <img src="/logo.png" alt="Bakso Terbang" className="mx-auto mb-2 w-56" />
          <h1 className="sr-only">Bakso Terbang</h1>
          <p className="text-sm text-stone-500">Masuk ke sistem kasir</p>
        </div>
        <form action={action} className="space-y-4">
          <div>
            <label className="label" htmlFor="username">Username</label>
            <input id="username" name="username" className="input" autoComplete="username" autoFocus required />
          </div>
          <div>
            <label className="label" htmlFor="password">Password</label>
            <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
          </div>
          {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
          <button className="btn-primary w-full py-2.5" disabled={pending}>
            {pending ? "Memproses..." : "Masuk"}
          </button>
        </form>
      </div>
    </main>
  );
}
