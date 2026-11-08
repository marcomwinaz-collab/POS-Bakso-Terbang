import { desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { OpenBillCard } from "./OpenBillCard";

export default async function PesananPage() {
  await requireUser();
  const orders = await db
    .select({
      order: schema.orders,
      tableName: schema.diningTables.name,
    })
    .from(schema.orders)
    .leftJoin(schema.diningTables, eq(schema.orders.tableId, schema.diningTables.id))
    .where(eq(schema.orders.status, "OPEN"))
    .orderBy(desc(schema.orders.createdAt));

  const items = orders.length
    ? await db.select().from(schema.orderItems).where(inArray(schema.orderItems.orderId, orders.map((o) => o.order.id)))
    : [];

  return (
    <main>
      <PageHeader title="Open Bill" subtitle={`${orders.length} pesanan belum dibayar`} />
      <div className="grid gap-4 px-4 pb-8 sm:grid-cols-2 sm:px-6 xl:grid-cols-3">
        {orders.map(({ order, tableName }) => (
          <OpenBillCard
            key={order.id}
            order={order}
            tableName={tableName}
            items={items.filter((i) => i.orderId === order.id)}
          />
        ))}
        {!orders.length && (
          <div className="card col-span-full p-10 text-center text-stone-500">Tidak ada open bill saat ini.</div>
        )}
      </div>
    </main>
  );
}
