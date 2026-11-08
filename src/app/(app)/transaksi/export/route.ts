import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import { listTransactions, parseRange } from "@/lib/queries";
import { formatDateTime, PAYMENT_LABEL, STATUS_LABEL, TYPE_LABEL } from "@/lib/format";

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.redirect(new URL("/login", req.url));
  const sp = Object.fromEntries(req.nextUrl.searchParams);
  const range = parseRange(sp);
  const rows = await listTransactions({ ...range, status: sp.status });

  const esc = (v: unknown) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  const header = ["No", "Waktu", "Tipe", "Meja", "Pelanggan", "Kasir", "Subtotal", "Diskon", "Service", "Pajak", "Total", "Metode", "Status"];
  const lines = rows.map(({ order: o, tableName, cashierName }) =>
    [
      o.code,
      formatDateTime(o.paidAt ?? o.createdAt),
      TYPE_LABEL[o.type],
      tableName,
      o.customerName,
      cashierName,
      o.subtotal,
      o.discount,
      o.service,
      o.tax,
      o.total,
      o.paymentMethod ? PAYMENT_LABEL[o.paymentMethod] : "",
      STATUS_LABEL[o.status],
    ]
      .map(esc)
      .join(","),
  );
  const csv = "﻿" + [header.map(esc).join(","), ...lines].join("\r\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="transaksi_${range.from}_${range.to}.csv"`,
    },
  });
}
