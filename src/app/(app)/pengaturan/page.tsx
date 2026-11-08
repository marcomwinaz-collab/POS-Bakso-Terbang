import { db } from "@/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { SettingsForm } from "./SettingsForm";

export default async function PengaturanPage() {
  await requireUser("ADMIN");
  const s = await db.query.settings.findFirst();
  return (
    <main>
      <PageHeader title="Pengaturan" subtitle="Informasi toko, pajak, dan struk" />
      <div className="px-4 pb-8 sm:px-6">
        <SettingsForm
          settings={{
            storeName: s?.storeName ?? "Bakso Terbang",
            address: s?.address ?? "",
            phone: s?.phone ?? "",
            taxPercent: s?.taxPercent ?? 0,
            servicePercent: s?.servicePercent ?? 0,
            receiptFooter: s?.receiptFooter ?? "",
          }}
        />
      </div>
    </main>
  );
}
