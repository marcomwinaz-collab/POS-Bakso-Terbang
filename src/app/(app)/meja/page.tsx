import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { TablesClient } from "./TablesClient";

export default async function MejaPage() {
  await requireUser("ADMIN");
  const [tables, open] = await Promise.all([
    db.select().from(schema.diningTables).orderBy(asc(schema.diningTables.id)),
    db.select({ tableId: schema.orders.tableId }).from(schema.orders).where(eq(schema.orders.status, "OPEN")),
  ]);
  return <TablesClient tables={tables} occupied={open.map((o) => o.tableId!).filter(Boolean)} />;
}
