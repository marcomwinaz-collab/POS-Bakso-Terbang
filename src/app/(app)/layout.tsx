import { Sidebar } from "@/components/Sidebar";
import { requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return (
    <div className="min-h-screen">
      <Sidebar user={user} />
      <div className="lg:pl-60">{children}</div>
    </div>
  );
}
