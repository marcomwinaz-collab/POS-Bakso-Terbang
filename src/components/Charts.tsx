"use client";

import { Bar, BarChart, CartesianGrid, LabelList, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { rupiah } from "@/lib/format";

const BRAND = "#d93408";
const GRID = "#e7e5e4";
const AXIS = "#78716c";

export type Point = { label: string; value: number; count?: number; total?: number };

export function short(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + " jt";
  if (n >= 1_000) return Math.round(n / 1_000).toLocaleString("id-ID") + " rb";
  return n.toLocaleString("id-ID");
}

function Tip({
  active,
  payload,
  label,
  money,
  unit,
}: {
  active?: boolean;
  payload?: { value: number; payload: Point }[];
  label?: string;
  money: boolean;
  unit: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs shadow-md">
      <div className="mb-0.5 font-semibold text-stone-900">{label ?? p.payload.label}</div>
      <div className="text-stone-700">{money ? rupiah(p.value) : `${p.value.toLocaleString("id-ID")} ${unit}`}</div>
      {money && p.payload.count !== undefined && <div className="text-stone-500">{p.payload.count.toLocaleString("id-ID")} transaksi</div>}
      {!money && p.payload.total !== undefined && <div className="text-stone-500">{rupiah(p.payload.total)}</div>}
    </div>
  );
}

/** Grafik batang vertikal satu seri */
export function ColumnChart({ data, money = true, unit = "transaksi", height = 256 }: { data: Point[]; money?: boolean; unit?: string; height?: number }) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={{ stroke: GRID }} interval="preserveStartEnd" minTickGap={12} />
          <YAxis tickFormatter={short} allowDecimals={false} tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={false} width={44} />
          <Tooltip content={<Tip money={money} unit={unit} />} cursor={{ fill: "#f5f5f4" }} />
          <Bar dataKey="value" fill={BRAND} radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Grafik batang horizontal dengan label nilai */
export function HBarChart({ data, money = true, unit = "", labelWidth = 110 }: { data: Point[]; money?: boolean; unit?: string; labelWidth?: number }) {
  if (!data.length) return <p className="py-10 text-center text-sm text-stone-400">Belum ada data.</p>;
  return (
    <div style={{ height: Math.max(100, data.length * 36 + 8) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 56, left: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="label" tick={{ fontSize: 12, fill: "#44403c" }} tickLine={false} axisLine={false} width={labelWidth} />
          <Tooltip content={<Tip money={money} unit={unit} />} cursor={{ fill: "#f5f5f4" }} />
          <Bar dataKey="value" fill={BRAND} radius={[0, 4, 4, 0]} barSize={16}>
            <LabelList dataKey="value" position="right" formatter={(v: unknown) => short(Number(v))} style={{ fontSize: 11, fill: "#44403c" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
