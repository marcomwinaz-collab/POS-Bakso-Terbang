import { and, asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { getActiveOutlet, requireUser } from "@/lib/auth";
import { PosClient } from "./PosClient";

export default async function KasirPage({ searchParams }: { searchParams: Promise<{ order?: string }> }) {
  const user = await requireUser();
  const outlet = await getActiveOutlet(user);
  if (!outlet) {
    return (
      <main className="flex min-h-screen items-center justify-center p-6 text-center text-stone-500">
        Outlet Anda tidak aktif atau belum ditetapkan. Hubungi admin.
      </main>
    );
  }
  const { order: orderParam } = await searchParams;

  const [products, categories, tables, openOrders] = await Promise.all([
    db.select().from(schema.products).where(eq(schema.products.active, true)).orderBy(asc(schema.products.name)),
    db.select().from(schema.categories).orderBy(asc(schema.categories.sort), asc(schema.categories.name)),
    db
      .select()
      .from(schema.diningTables)
      .where(and(eq(schema.diningTables.active, true), eq(schema.diningTables.outletId, outlet.id))),
    db
      .select({ id: schema.orders.id, tableId: schema.orders.tableId })
      .from(schema.orders)
      .where(and(eq(schema.orders.status, "OPEN"), eq(schema.orders.outletId, outlet.id))),
  ]);
  tables.sort((a, b) => a.number.localeCompare(b.number, "id", { numeric: true }));

  let editing = null;
  if (orderParam) {
    const o = await db.query.orders.findFirst({ where: eq(schema.orders.id, Number(orderParam)) });
    if (o && o.status === "OPEN" && o.outletId === outlet.id) {
      const items = await db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, o.id));
      editing = { order: o, items };
    }
  }

  return (
    <PosClient
      key={editing?.order.id ?? "new"}
      outlet={{
        name: outlet.name,
        taxPercent: outlet.taxPercent,
        servicePercent: outlet.servicePercent,
        autoPrint: outlet.autoPrintReceipt,
        kitchen: outlet.printKitchenTicket,
      }}
      products={products}
      categories={categories}
      tables={tables}
      occupiedTableIds={openOrders.filter((o) => o.tableId && o.id !== editing?.order.id).map((o) => o.tableId!)}
      editing={editing}
    />
  );
}
