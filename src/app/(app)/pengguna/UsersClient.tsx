"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { deleteUser, saveUser } from "@/app/actions/admin";
import { PageHeader } from "@/components/PageHeader";
import { Checkbox, Field, FormModal } from "@/components/FormModal";

type U = { id: number; name: string; username: string; role: "ADMIN" | "KASIR"; active: boolean };

export function UsersClient({ users, meId }: { users: U[]; meId: number }) {
  const [edit, setEdit] = useState<U | "new" | null>(null);
  const [, start] = useTransition();
  const u = edit === "new" ? null : edit;

  return (
    <main>
      <PageHeader title="Pengguna" subtitle="Akun admin dan kasir">
        <button className="btn-primary" onClick={() => setEdit("new")}>
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
                  <td>{x.active ? "Aktif" : "Nonaktif"}</td>
                  <td className="text-right whitespace-nowrap">
                    <button className="btn-ghost p-1.5" onClick={() => setEdit(x)} aria-label="Ubah">
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
              <select name="role" className="input" defaultValue={u?.role ?? "KASIR"}>
                <option value="KASIR">Kasir</option>
                <option value="ADMIN">Admin</option>
              </select>
            </Field>
          </div>
          <Field label={u ? "Password baru" : "Password"} hint={u ? "Kosongkan jika tidak ingin mengganti" : "Minimal 6 karakter"}>
            <input name="password" type="password" className="input" required={!u} autoComplete="new-password" />
          </Field>
          <Checkbox name="active" label="Akun aktif" defaultChecked={u?.active ?? true} />
        </FormModal>
      )}
    </main>
  );
}
