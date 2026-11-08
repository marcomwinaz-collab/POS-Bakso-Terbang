import { NextResponse, type NextRequest } from "next/server";
import { getSession } from "@/lib/auth";
import {
  parseRange,
  refundList,
  salesByCategory,
  salesByOutlet,
  salesByProduct,
  salesByType,
  salesDetail,
  salesSummary,
} from "@/lib/queries";
import { formatDateTime, PAYMENT_LABEL, STATUS_LABEL, TYPE_LABEL } from "@/lib/format";

type Cell = string | number | null | undefined;

function csv(rows: Cell[][]) {
  const esc = (v: Cell) => `"${String(v ?? "").replaceAll('"', '""')}"`;
  return "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.role !== "ADMIN") return NextResponse.redirect(new URL("/login", req.url));
  const sp = Object.fromEntries(req.nextUrl.searchParams);
  const range = parseRange(sp);
  const f = { start: range.start, end: range.end, outletId: Number(sp.outlet) || null };
  const tab = sp.tab ?? "ringkasan";
  let rows: Cell[][] = [];

  if (tab === "ringkasan") {
    const s = await salesSummary(f);
    rows = [
      ["Keterangan", "Nilai"],
      ["Jumlah transaksi", s.count],
      ["Item terjual", s.itemsSold],
      ["Penjualan kotor", s.gross],
      ["Diskon", s.discount],
      ["Penjualan bersih", s.net],
      ["Service charge", s.service],
      ["Pajak", s.tax],
      ["Total pendapatan", s.total],
      ["Rata-rata per transaksi", s.avg],
      ["Jumlah tamu", s.guests],
      ["Jumlah refund", s.refundCount],
      ["Nominal refund", s.refundTotal],
      [],
      ["Metode pembayaran", "Transaksi", "Nominal"],
      ...s.payments.map((p) => [PAYMENT_LABEL[p.method], p.count, p.total]),
    ];
  } else if (tab === "detail") {
    const data = await salesDetail({ ...f, status: sp.status });
    rows = [["No. struk", "Waktu", "Outlet", "Jenis order", "Meja", "Pelanggan", "Kasir", "Produk", "Kategori", "Qty", "Harga", "Subtotal item", "Subtotal struk", "Diskon", "Service", "Pajak", "Total struk", "Metode bayar", "Status"]];
    for (const { order: o, outletName, cashierName, items } of data) {
      const head = [o.code, formatDateTime(o.paidAt ?? o.createdAt), outletName, TYPE_LABEL[o.type], o.tableNumber, o.customerName, cashierName];
      const tail = [o.subtotal, o.discount, o.service, o.tax, o.total, o.paymentMethod ? PAYMENT_LABEL[o.paymentMethod] : "", STATUS_LABEL[o.status]];
      for (const it of items) rows.push([...head, it.name, it.categoryName, it.qty, it.price, it.subtotal, ...tail]);
      if (!items.length) rows.push([...head, "", "", "", "", "", ...tail]);
    }
  } else if (tab === "produk") {
    const [data, cats] = await Promise.all([salesByProduct(f), salesByCategory(f)]);
    rows = [["Produk", "Kategori", "Qty", "Penjualan"], ...data.map((r) => [r.name, r.category, r.qty, r.gross]), [], ["Kategori", "", "Qty", "Penjualan"], ...cats.map((c) => [c.name, "", c.qty, c.gross])];
  } else if (tab === "outlet") {
    const data = await salesByOutlet(f);
    rows = [
      ["Outlet", "Transaksi", "Penjualan kotor", "Diskon", "Penjualan bersih", "Service", "Pajak", "Total", "Rata-rata", "Jumlah refund", "Nominal refund"],
      ...data.map((r) => [r.name, r.count, r.gross, r.discount, r.net, r.service, r.tax, r.total, r.avg, r.refundCount, r.refundTotal]),
    ];
  } else if (tab === "jenis") {
    const data = await salesByType(f);
    rows = [["Jenis order", "Transaksi", "Penjualan bersih", "Total", "Rata-rata", "Tamu"], ...data.map((r) => [TYPE_LABEL[r.type], r.count, r.net, r.total, r.avg, r.guests])];
  } else if (tab === "refund") {
    const data = await refundList(f);
    rows = [
      ["No. struk", "Outlet", "Waktu transaksi", "Waktu refund", "Kasir", "Direfund oleh", "Alasan", "Nominal"],
      ...data.map(({ order: o, outletName, cashierName, refundedBy }) => [o.code, outletName, formatDateTime(o.paidAt), formatDateTime(o.refundedAt), cashierName, refundedBy, o.cancelReason, o.total]),
    ];
  }

  return new NextResponse(csv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="laporan-${tab}_${range.from}_${range.to}.csv"`,
    },
  });
}
