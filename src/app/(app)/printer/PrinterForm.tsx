"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Printer } from "lucide-react";
import type { Outlet } from "@/db/schema";
import { savePrinter } from "@/app/actions/admin";
import { PageHeader } from "@/components/PageHeader";
import { Checkbox, Field } from "@/components/FormModal";
import { printUrl } from "@/lib/print";

export function PrinterForm({ outlet, outlets }: { outlet: Outlet; outlets: { id: number; name: string }[] }) {
  const router = useRouter();
  const [state, action, pending] = useActionState(savePrinter, undefined);

  return (
    <main>
      <PageHeader title="Printer & Struk" subtitle="Pengaturan cetak per outlet">
        <select className="input w-auto" value={outlet.id} onChange={(e) => router.push(`/printer?outlet=${e.target.value}`)}>
          {outlets.map((o) => (
            <option key={o.id} value={o.id}>{o.name}</option>
          ))}
        </select>
      </PageHeader>
      <div className="grid gap-4 px-4 pb-8 sm:px-6 xl:grid-cols-[1fr_380px]">
        <form action={action} className="card space-y-5 p-6">
          <input type="hidden" name="outletId" value={outlet.id} />
          <section>
            <h2 className="mb-3 font-semibold">Kertas</h2>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Lebar kertas thermal">
                <select name="paperWidth" className="input" defaultValue={outlet.paperWidth}>
                  <option value={58}>58 mm</option>
                  <option value={80}>80 mm</option>
                </select>
              </Field>
              <Field label="Ukuran huruf (px)">
                <input name="fontSize" type="number" min={9} max={16} className="input" defaultValue={outlet.fontSize} />
              </Field>
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-semibold">Isi struk</h2>
            <div className="space-y-3">
              <Checkbox name="showLogo" label="Tampilkan logo" defaultChecked={outlet.showLogo} />
              <Field label="Teks header tambahan" hint="Mis. NPWP, Instagram, atau jam buka">
                <textarea name="receiptHeader" rows={2} className="input" defaultValue={outlet.receiptHeader} />
              </Field>
              <Field label="Teks footer">
                <textarea name="receiptFooter" rows={2} className="input" defaultValue={outlet.receiptFooter} />
              </Field>
            </div>
          </section>

          <section>
            <h2 className="mb-3 font-semibold">Otomatis</h2>
            <div className="space-y-3">
              <Checkbox name="autoPrintReceipt" label="Cetak struk otomatis setelah pembayaran" defaultChecked={outlet.autoPrintReceipt} />
              <Field label="Jumlah salinan struk">
                <select name="receiptCopies" className="input w-40" defaultValue={outlet.receiptCopies}>
                  <option value={1}>1 (pelanggan)</option>
                  <option value={2}>2 (pelanggan + arsip)</option>
                  <option value={3}>3</option>
                </select>
              </Field>
              <Checkbox
                name="printKitchenTicket"
                label="Cetak tiket dapur otomatis (saat open bill disimpan / pesanan baru dibayar)"
                defaultChecked={outlet.printKitchenTicket}
              />
            </div>
          </section>

          {state?.error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{state.error}</p>}
          {state?.ok && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">{state.message}</p>}
          <div className="flex flex-wrap gap-2">
            <button className="btn-primary" disabled={pending}>
              {pending ? "Menyimpan..." : "Simpan Pengaturan"}
            </button>
            <button type="button" className="btn-secondary" onClick={() => printUrl(`/struk/test?outlet=${outlet.id}`)}>
              <Printer size={16} /> Cetak Uji
            </button>
          </div>
        </form>

        <aside className="card space-y-3 p-6 text-sm text-stone-600">
          <h2 className="font-semibold text-stone-900">Cara menghubungkan printer</h2>
          <ol className="list-decimal space-y-2 pl-4">
            <li>Pasang printer thermal (USB/Bluetooth/LAN) di perangkat kasir dan instal driver-nya.</li>
            <li>Jadikan printer thermal sebagai <b>printer default</b> di sistem operasi.</li>
            <li>
              Di dialog cetak browser, pilih ukuran kertas sesuai printer, margin <b>None</b>, dan matikan <b>Headers and footers</b>.
            </li>
            <li>
              Agar struk langsung tercetak tanpa dialog, jalankan Chrome dengan opsi <code className="rounded bg-stone-100 px-1">--kiosk-printing</code>.
            </li>
            <li>Tekan <b>Cetak Uji</b> untuk memeriksa hasilnya.</li>
          </ol>
          <p className="text-xs text-stone-400">Simpan pengaturan terlebih dahulu sebelum cetak uji.</p>
        </aside>
      </div>
    </main>
  );
}
