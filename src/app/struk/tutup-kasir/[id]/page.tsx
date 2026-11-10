import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { db, schema } from "@/db";
import { requireUser } from "@/lib/auth";
import { shiftReport } from "@/lib/shift";
import { ShiftReceipt, type ShiftPrintKind } from "@/components/ShiftReceipt";
import { AutoPrint } from "../../AutoPrint";

export const dynamic = "force-dynamic";

/** Cetak laporan tutup kasir: 2 lembar (Transaksi Penjualan + Penjualan Menu), atau satu lembar lewat ?only= */
export default async function StrukTutupKasirPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ only?: string; auto?: string }>;
}) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const shift = await db.query.cashierShifts.findFirst({ where: eq(schema.cashierShifts.id, Number(id)) });
  if (!shift) notFound();
  if (user.role !== "ADMIN" && shift.outletId !== user.outletId) notFound();
  const outlet = await db.query.outlets.findFirst({ where: eq(schema.outlets.id, shift.outletId) });
  if (!outlet) notFound();

  const report = await shiftReport(shift);
  const kinds: ShiftPrintKind[] = sp.only === "menu" ? ["menu"] : sp.only === "transaksi" ? ["transaksi"] : ["transaksi", "menu"];
  const printedAt = new Date();

  return (
    <div className="flex min-h-screen flex-col items-center bg-stone-100 py-6 print:bg-white print:py-0">
      <style>{`@page { size: ${outlet.paperWidth}mm auto; margin: 0; } @media print { .shift-sheet + .shift-sheet { break-before: page; page-break-before: always; } }`}</style>
      <AutoPrint auto={sp.auto === "1"} />
      <div className="flex flex-col gap-4 print:block">
        {kinds.map((k) => (
          <div key={k} className="shift-sheet shadow print:shadow-none">
            <ShiftReceipt kind={k} outlet={outlet} report={report} openingCash={shift.openingCash} printedAt={printedAt} />
          </div>
        ))}
      </div>
    </div>
  );
}
