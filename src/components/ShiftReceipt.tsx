import type { Outlet } from "@/db/schema";
import { formatDateTime, PAYMENT_LABEL } from "@/lib/format";
import type { ShiftReport } from "@/lib/shift";

export type ShiftPrintKind = "transaksi" | "menu";

type Props = {
  kind: ShiftPrintKind;
  outlet: Outlet;
  report: ShiftReport;
  openingCash: number;
  printedAt: Date;
};

const n = (v: number) => Math.round(v).toLocaleString("id-ID");

/**
 * Struk laporan tutup kasir (thermal 58/80 mm), dicetak 2 lembar:
 * "Transaksi Penjualan" dan "Penjualan Menu". Tanpa kolom tanda tangan.
 */
export function ShiftReceipt({ kind, outlet, report, openingCash, printedAt }: Props) {
  const width = outlet.paperWidth === 58 ? "58mm" : "80mm";
  const wrap = { width, fontSize: `${outlet.fontSize}px` } as const;

  return (
    <div className="receipt-page bg-white p-3 font-mono leading-snug text-black" style={wrap}>
      <div className="text-center">
        <div className="font-bold">{outlet.name}</div>
        {outlet.address && <div className="whitespace-pre-line">{outlet.address}</div>}
      </div>
      <Divider />
      <div className="text-center font-bold">
        <div>LAPORAN TUTUP KASIR</div>
        <div>{kind === "transaksi" ? "TRANSAKSI PENJUALAN" : "PENJUALAN MENU"}</div>
      </div>
      <div className="mt-1.5">
        <Info l="Kasir" r={report.openedByName} />
        <Info l="Waktu Buka" r={formatDateTime(report.start)} />
        <Info l="Waktu Tutup" r={formatDateTime(report.end)} />
      </div>
      <Divider />

      {kind === "transaksi" ? (
        <>
          <Row l="Modal Awal" r={n(openingCash)} />
          {report.byMethod.filter((m) => m.method === "CASH" || m.count > 0).map((m) => (
            <Row key={m.method} l={PAYMENT_LABEL[m.method]} r={n(m.total)} />
          ))}
          <Row l="Penerimaan Kasir" r={n(report.totalSales)} />
          <Divider />
          <Row l="Total Penerimaan" r={n(report.totalSales)} />
          <Divider />
          <Row l="Saldo Akhir" r={n(report.endingBalance)} bold />
          <Divider />
          <Row l="Pajak" r={n(report.tax)} />
          {report.service > 0 && <Row l="Service" r={n(report.service)} />}
          <Row l="Total Diskon" r={n(report.discount)} />
          {report.refundCount > 0 && <Row l={`Refund (${report.refundCount})`} r={n(report.refundTotal)} />}
          <Divider />
          <Row l="Transaksi Selesai" r={n(report.transactions)} />
          <Row l="Total Item Terjual" r={n(report.itemsSold)} />
        </>
      ) : (
        <>
          <div className="font-bold">Produk Terjual</div>
          <Divider />
          {report.products.map((p) => (
            <Row key={p.name} l={p.name} r={n(p.qty)} wrapLeft />
          ))}
          {!report.products.length && <div className="text-center">- Belum ada penjualan -</div>}
          <Divider />
          <Row l="Total" r={n(report.itemsSold)} bold />
        </>
      )}

      <div className="my-1.5 border-t-2 border-double border-black" />
      <div className="text-center">Dicetak : {formatDateTime(printedAt)}</div>
    </div>
  );
}

function Divider() {
  return <div className="my-1.5 border-t border-dashed border-black" />;
}

function Info({ l, r }: { l: string; r: string }) {
  return (
    <div className="flex gap-1">
      <span className="w-[42%] shrink-0">{l}</span>
      <span>: {r}</span>
    </div>
  );
}

function Row({ l, r, bold, wrapLeft }: { l: string; r: string; bold?: boolean; wrapLeft?: boolean }) {
  return (
    <div className={`flex justify-between gap-2 ${bold ? "font-bold" : ""}`}>
      <span className={wrapLeft ? "min-w-0 break-words" : "whitespace-pre"}>{l}</span>
      <span className="shrink-0 text-right">{r}</span>
    </div>
  );
}
