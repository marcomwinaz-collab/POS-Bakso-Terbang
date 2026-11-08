import { db } from "@/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { SettingsForm } from "./SettingsForm";

export default async function PengaturanPage() {
  await requireUser("ADMIN");
  const s = await db.query.settings.findFirst();
  return (
    <main>
      <PageHeader title="Pengaturan Umum" subtitle="Pajak & service diatur per outlet di menu Outlet; struk di menu Printer & Struk" />
      <div className="px-4 pb-8 sm:px-6">
        <SettingsForm businessName={s?.businessName ?? "Bakso Terbang"} />
      </div>
    </main>
  );
}
