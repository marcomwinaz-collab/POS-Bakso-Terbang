import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { Receipt } from "@/components/Receipt";
import { AutoPrint } from "../AutoPrint";

export const dynamic = "force-dynamic";

/** Cetak uji untuk memeriksa pengaturan printer suatu outlet */
export default async function TestPrintPage({ searchParams }: { searchParams: Promise<{ outlet?: string; auto?: string }> }) {
  await requireUser("ADMIN");
  const sp = await searchParams;
  const outlet = await db.query.outlets.findFirst({ where: eq(schema.outlets.id, Number(sp.outlet)) });
  if (!outlet) notFound();
  const settings = await db.query.settings.findFirst();
  const now = new Date();
  const items = [
    { name: "Bakso Urat", qty: 2, price: 18000, subtotal: 36000, note: "tidak pedas" },
    { name: "Es Teh Manis", qty: 2, price: 5000, subtotal: 10000, note: null },
  ];
  const subtotal = 46000;
  const service = Math.round((subtotal * outlet.servicePercent) / 100);
  const tax = Math.round(((subtotal + service) * outlet.taxPercent) / 100);
  const total = subtotal + service + tax;
  const order = {
    code: `${outlet.code}-TEST`,
    type: "DINE_IN" as const,
    tableNumber: "1",
    customerName: "Cetak Uji",
    guests: 2,
    status: "PAID" as const,
    subtotal,
    discount: 0,
    service,
    tax,
    total,
    paymentMethod: "CASH" as const,
    paidAmount: Math.ceil(total / 50000) * 50000,
    change: Math.ceil(total / 50000) * 50000 - total,
    note: null,
    createdAt: now,
    paidAt: now,
    cancelReason: null,
  };

  return (
    <div className="flex min-h-screen flex-col items-center bg-stone-100 py-6 print:bg-white print:py-0">
      <style>{`@page { size: ${outlet.paperWidth}mm auto; margin: 0; }`}</style>
      <AutoPrint auto={sp.auto === "1"} />
      <div className="shadow print:shadow-none">
        <Receipt mode="receipt" businessName={settings?.businessName ?? "Bakso Terbang"} outlet={outlet} order={order} items={items} cashierName="Admin" />
      </div>
    </div>
  );
}
