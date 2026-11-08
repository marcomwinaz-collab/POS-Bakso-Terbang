import { and, desc, eq, inArray } from "drizzle-orm";
import { db, schema } from "@/db";
import { getActiveOutlet, requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/PageHeader";
import { OpenBillCard } from "./OpenBillCard";

export default async function PesananPage() {
  const user = await requireUser();
  const outlet = await getActiveOutlet(user);
  if (!outlet) return <main className="p-10 text-center text-stone-500">Outlet tidak aktif.</main>;

  const orders = await db
    .select()
    .from(schema.orders)
    .where(and(eq(schema.orders.status, "OPEN"), eq(schema.orders.outletId, outlet.id)))
    .orderBy(desc(schema.orders.createdAt));
  const items = orders.length
    ? await db.select().from(schema.orderItems).where(inArray(schema.orderItems.orderId, orders.map((o) => o.id)))
    : [];

  return (
    <main>
      <PageHeader title="Open Bill" subtitle={`${outlet.name} · ${orders.length} pesanan belum dibayar`} />
      <div className="grid gap-4 px-4 pb-8 sm:grid-cols-2 sm:px-6 xl:grid-cols-3">
        {orders.map((order) => (
          <OpenBillCard
            key={order.id}
            order={order}
            items={items.filter((i) => i.orderId === order.id)}
            autoPrint={outlet.autoPrintReceipt}
            kitchen={outlet.printKitchenTicket}
          />
        ))}
        {!orders.length && <div className="card col-span-full p-10 text-center text-stone-500">Tidak ada open bill saat ini.</div>}
      </div>
    </main>
  );
}
