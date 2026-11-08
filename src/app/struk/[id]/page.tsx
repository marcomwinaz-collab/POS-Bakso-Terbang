import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { Receipt, type PrintMode } from "@/components/Receipt";
import { AutoPrint } from "../AutoPrint";

export const dynamic = "force-dynamic";

export default async function StrukPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ mode?: string; auto?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const order = await db.query.orders.findFirst({ where: eq(schema.orders.id, Number(id)) });
  if (!order) notFound();
  if (user.role !== "ADMIN" && order.outletId !== user.outletId) notFound();

  const [items, outlet, settings, cashier] = await Promise.all([
    db.select().from(schema.orderItems).where(eq(schema.orderItems.orderId, order.id)),
    db.query.outlets.findFirst({ where: eq(schema.outlets.id, order.outletId) }),
    db.query.settings.findFirst(),
    order.cashierId ? db.query.users.findFirst({ where: eq(schema.users.id, order.cashierId) }) : null,
  ]);
  if (!outlet) notFound();

  const mode = sp.mode ?? (order.status === "OPEN" ? "bill" : "receipt");
  const pages: { mode: PrintMode; copy?: string }[] = [];
  if (mode === "kitchen") pages.push({ mode: "kitchen" });
  else if (mode === "bill" || order.status === "OPEN") pages.push({ mode: "bill" });
  else {
    const copies = outlet.receiptCopies;
    for (let i = 0; i < copies; i++) pages.push({ mode: "receipt", copy: copies > 1 ? (i === 0 ? "-- Pelanggan --" : "-- Arsip --") : undefined });
    if (mode === "both") pages.push({ mode: "kitchen" });
  }

  return (
    <div className="flex min-h-screen flex-col items-center bg-stone-100 py-6 print:bg-white print:py-0">
      <style>{`@page { size: ${outlet.paperWidth}mm auto; margin: 0; } @media print { .receipt-page { break-after: page; } .receipt-page:last-child { break-after: auto; } }`}</style>
      <AutoPrint auto={sp.auto === "1"} />
      <div className="flex flex-col gap-4 print:gap-0">
        {pages.map((p, i) => (
          <div key={i} className="shadow print:shadow-none">
            <Receipt
              mode={p.mode}
              copyLabel={p.copy}
              businessName={settings?.businessName ?? "Bakso Terbang"}
              outlet={outlet}
              order={order}
              items={items}
              cashierName={cashier?.name}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
