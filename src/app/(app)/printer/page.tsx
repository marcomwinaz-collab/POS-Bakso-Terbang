import { getActiveOutlet, listOutlets, requireUser } from "@/lib/auth";
import { PrinterForm } from "./PrinterForm";

export default async function PrinterPage({ searchParams }: { searchParams: Promise<{ outlet?: string }> }) {
  const user = await requireUser("ADMIN");
  const outlets = await listOutlets();
  const active = await getActiveOutlet(user);
  const sp = await searchParams;
  const outlet = outlets.find((o) => o.id === Number(sp.outlet)) ?? active ?? outlets[0];
  if (!outlet) return <main className="p-10 text-center text-stone-500">Belum ada outlet.</main>;
  return <PrinterForm key={outlet.id} outlet={outlet} outlets={outlets.map((o) => ({ id: o.id, name: o.name }))} />;
}
