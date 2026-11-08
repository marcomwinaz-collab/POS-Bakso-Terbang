import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getActiveOutlet, listOutlets, requireUser } from "@/lib/auth";
import { TablesClient } from "./TablesClient";

export default async function MejaPage({ searchParams }: { searchParams: Promise<{ outlet?: string }> }) {
  const user = await requireUser("ADMIN");
  const outlets = await listOutlets();
  const sp = await searchParams;
  const active = await getActiveOutlet(user);
  const outletId = Number(sp.outlet) || active?.id || outlets[0]?.id;
  const [tables, open] = await Promise.all([
    db.select().from(schema.diningTables).where(eq(schema.diningTables.outletId, outletId ?? 0)),
    db.select({ tableId: schema.orders.tableId }).from(schema.orders).where(eq(schema.orders.status, "OPEN")),
  ]);
  tables.sort((a, b) => a.number.localeCompare(b.number, "id", { numeric: true }));
  return (
    <TablesClient
      outlets={outlets.map((o) => ({ id: o.id, name: o.name }))}
      outletId={outletId ?? 0}
      tables={tables}
      occupied={open.map((o) => o.tableId!).filter(Boolean)}
    />
  );
}
