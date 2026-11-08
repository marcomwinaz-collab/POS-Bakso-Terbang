import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { PosClient } from "./PosClient";

export default async function KasirPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  await requireUser();
  const { order: orderParam } = await searchParams;

  const [products, categories, tables, settings, openOrders] = await Promise.all([
    db.select().from(schema.products).where(eq(schema.products.active, true)).orderBy(asc(schema.products.name)),
    db.select().from(schema.categories).orderBy(asc(schema.categories.sort), asc(schema.categories.name)),
    db.select().from(schema.diningTables).where(eq(schema.diningTables.active, true)).orderBy(asc(schema.diningTables.id)),
    db.query.settings.findFirst(),
    db.select({ id: schema.orders.id, tableId: schema.orders.tableId }).from(schema.orders).where(eq(schema.orders.status, "OPEN")),
  ]);

  let editing = null;
  if (orderParam) {
    const o = await db.query.orders.findFirst({ where: eq(schema.orders.id, Number(orderParam)) });
    if (o && o.status === "OPEN") {
      const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, o.id));
      editing = { order: o, items };
    }
  }

  return (
    <PosClient
      key={editing?.order.id ?? "new"}
      products={products}
      categories={categories}
      tables={tables}
      occupiedTableIds={openOrders.filter((o) => o.tableId && o.id !== editing?.order.id).map((o) => o.tableId!)}
      taxPercent={settings?.taxPercent ?? 0}
      servicePercent={settings?.servicePercent ?? 0}
      editing={editing}
    />
  );
}
