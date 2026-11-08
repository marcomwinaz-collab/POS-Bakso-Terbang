"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { deleteUser, saveUser } from "@/app/actions/admin";
import { PageHeader } from "@/components/PageHeader";
import { Checkbox, Field, FormModal } from "@/components/FormModal";

type U = { id: number; name: string; username: string; role: "ADMIN" | "KASIR"; outletId: number | null; active: boolean };

export function UsersClient({ users, meId, outlets }: { users: U[]; meId: number; outlets: { id: number; name: string }[] }) {
  const [edit, setEdit] = useState<U | "new" | null>(null);
  const [role, setRole] = useState<"ADMIN" | "KASIR">("KASIR");
  const outletName = new Map(outlets.map((o) => [o.id, o.name]));
  const open = (x: U | "new") => {
    setRole(x === "new" ? "KASIR" : x.role);
    setEdit(x);
  };
  const [, start] = useTransition();
  const u = edit === "new" ? null : edit;

  return (
    <main>
      <PageHeader title="Pengguna" subtitle="Akun admin dan kasir">
        <button className="btn-primary" onClick={() => open("new")}>
          <Plus size={16} /> Tambah Pengguna
        </button>
      </PageHeader>
      <div className="px-4 pb-8 sm:px-6">
        <div className="card max-w-3xl overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>Nama</th>
                <th>Username</th>
                <th>Peran</th>
                <th>Outlet</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((x) => (
                <tr key={x.id} className={x.active ? "" : "opacity-50"}>
                  <td className="font-medium">
                    {x.name} {x.id === meId && <span className="text-xs text-stone-400">(Anda)</span>}
                  </td>
                  <td className="font-mono text-xs">{x.username}</td>
                  <td>
                    <span className={`badge ${x.role === "ADMIN" ? "bg-brand-100 text-brand-800" : "bg-stone-100 text-stone-700"}`}>
                      {x.role === "ADMIN" ? "Admin" : "Kasir"}
                    </span>
                  </td>
                  <td>{x.role === "ADMIN" ? "Semua outlet" : x.outletId ? outletName.get(x.outletId) : "-"}</td>
                  <td>{x.active ? "Aktif" : "Nonaktif"}</td>
                  <td className="text-right whitespace-nowrap">
                    <button className="btn-ghost p-1.5" onClick={() => open(x)} aria-label="Ubah">
                      <Pencil size={16} />
                    </button>
                    {x.id !== meId && (
                      <button
                        className="btn-ghost p-1.5 text-red-600"
                        aria-label="Hapus"
                        onClick={() =>
                          confirm(`Hapus ${x.name}? (Akun yang pernah bertransaksi akan dinonaktifkan)`) &&
                          start(async () => {
                            const r = await deleteUser(x.id);
                            if (r?.error) alert(r.error);
                          })
                        }
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {edit && (
        <FormModal title={u ? "Ubah Pengguna" : "Tambah Pengguna"} action={saveUser} onClose={() => setEdit(null)}>
          <input type="hidden" name="id" value={u?.id ?? ""} />
          <Field label="Nama lengkap">
            <input name="name" className="input" defaultValue={u?.name} required autoFocus />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Username">
              <input name="username" className="input" defaultValue={u?.username} required autoComplete="off" />
            </Field>
            <Field label="Peran">
              <select name="role" className="input" value={role} onChange={(e) => setRole(e.target.value as "ADMIN" | "KASIR")}>
                <option value="KASIR">Kasir</option>
                <option value="ADMIN">Admin</option>
              </select>
            </Field>
          </div>
          {role === "KASIR" ? (
            <Field label="Outlet tempat bertugas">
              <select name="outletId" className="input" defaultValue={u?.outletId ?? outlets[0]?.id} required>
                {outlets.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </Field>
          ) : (
            <p className="rounded-lg bg-stone-50 px-3 py-2 text-xs text-stone-500">Admin dapat mengakses semua outlet, laporan, dan pengaturan.</p>
          )}
          <Field label={u ? "Password baru" : "Password"} hint={u ? "Kosongkan jika tidak ingin mengganti" : "Minimal 6 karakter"}>
            <input name="password" type="password" className="input" required={!u} autoComplete="new-password" />
          </Field>
          <Checkbox name="active" label="Akun aktif" defaultChecked={u?.active ?? true} />
        </FormModal>
      )}
    </main>
  );
}
