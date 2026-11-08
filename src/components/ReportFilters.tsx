import Link from "next/link";
import { Download } from "lucide-react";
import { addDays, todayLocal } from "@/lib/format";

function presets() {
  const today = todayLocal();
  const [y, m] = today.split("-").map(Number);
  const monthStart = `${y}-${String(m).padStart(2, "0")}-01`;
  const prevMonthEnd = addDays(monthStart, -1);
  const prevMonthStart = prevMonthEnd.slice(0, 8) + "01";
  return [
    { label: "Hari ini", from: today, to: today },
    { label: "Kemarin", from: addDays(today, -1), to: addDays(today, -1) },
    { label: "7 hari", from: addDays(today, -6), to: today },
    { label: "30 hari", from: addDays(today, -29), to: today },
    { label: "Bulan ini", from: monthStart, to: today },
    { label: "Bulan lalu", from: prevMonthStart, to: prevMonthEnd },
  ];
}

/** Baris filter laporan: preset tanggal, rentang tanggal, outlet, dan tombol export */
export function ReportFilters({
  basePath,
  params,
  from,
  to,
  outletId,
  outlets,
  exportHref,
  extra,
}: {
  basePath: string;
  params?: Record<string, string>;
  from: string;
  to: string;
  outletId: number | null;
  outlets: { id: number; name: string }[];
  exportHref?: string;
  extra?: React.ReactNode;
}) {
  const qs = (p: Record<string, string>) =>
    new URLSearchParams(Object.fromEntries(Object.entries({ ...params, outlet: outletId ? String(outletId) : "", ...p }).filter(([, v]) => v))).toString();
  return (
    <div className="card mb-4 space-y-3 p-4">
      <div className="flex flex-wrap gap-1.5">
        {presets().map((p) => {
          const active = p.from === from && p.to === to;
          return (
            <Link
              key={p.label}
              href={`${basePath}?${qs({ from: p.from, to: p.to })}`}
              className={`rounded-full px-3 py-1 text-xs font-medium ${active ? "bg-brand-600 text-white" : "bg-stone-100 text-stone-700 hover:bg-stone-200"}`}
            >
              {p.label}
            </Link>
          );
        })}
      </div>
      <form className="flex flex-wrap items-end gap-3">
        {Object.entries(params ?? {}).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
        <div>
          <label className="label">Dari</label>
          <input type="date" name="from" defaultValue={from} className="input" />
        </div>
        <div>
          <label className="label">Sampai</label>
          <input type="date" name="to" defaultValue={to} className="input" />
        </div>
        <div>
          <label className="label">Outlet</label>
          <select name="outlet" defaultValue={outletId ?? ""} className="input">
            <option value="">Semua outlet</option>
            {outlets.map((o) => (
              <option key={o.id} value={o.id}>{o.name}</option>
            ))}
          </select>
        </div>
        {extra}
        <button className="btn-primary">Tampilkan</button>
        {exportHref && (
          <a href={exportHref} className="btn-secondary ml-auto">
            <Download size={16} /> Export CSV
          </a>
        )}
      </form>
    </div>
  );
}
