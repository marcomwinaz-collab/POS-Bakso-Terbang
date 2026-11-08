import { Sidebar } from "@/components/Sidebar";
import { getActiveOutlet, listOutlets, requireUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const [active, outlets] = await Promise.all([getActiveOutlet(user), listOutlets()]);
  return (
    <div className="min-h-screen">
      <Sidebar
        user={user}
        activeOutlet={active ? { id: active.id, name: active.name } : null}
        outlets={user.role === "ADMIN" ? outlets.filter((o) => o.active).map((o) => ({ id: o.id, name: o.name })) : []}
      />
      <div className="lg:pl-60">{children}</div>
    </div>
  );
}
