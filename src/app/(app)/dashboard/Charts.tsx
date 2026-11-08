"use client";

import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, LabelList } from "recharts";
import { rupiah } from "@/lib/format";

const BRAND = "#d93408";
const GRID = "#e7e5e4";
const AXIS = "#78716c";

function short(n: number) {
  if (n >= 1_000_000) return (n / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 1 }) + " jt";
  if (n >= 1_000) return Math.round(n / 1_000).toLocaleString("id-ID") + " rb";
  return String(n);
}

function Tip({ active, payload, label, money = true }: { active?: boolean; payload?: { value: number; payload: Record<string, number> }[]; label?: string; money?: boolean }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  return (
    <div className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs shadow-md">
      <div className="mb-0.5 font-semibold text-stone-900">{label ?? (p.payload as unknown as { name: string }).name}</div>
      <div className="text-stone-600">{money ? rupiah(p.value) : `${p.value} transaksi`}</div>
      {money && p.payload.count !== undefined && <div className="text-stone-400">{p.payload.count} transaksi</div>}
      {!money && p.payload.omzet !== undefined && <div className="text-stone-400">{rupiah(p.payload.omzet)}</div>}
    </div>
  );
}

export function DailyChart({ data }: { data: { label: string; omzet: number; count: number }[] }) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={{ stroke: GRID }} interval="preserveStartEnd" minTickGap={16} />
          <YAxis tickFormatter={short} tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={false} width={48} />
          <Tooltip content={<Tip />} cursor={{ fill: "#f5f5f4" }} />
          <Bar dataKey="omzet" fill={BRAND} radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HourlyChart({ data }: { data: { label: string; count: number; omzet: number }[] }) {
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={GRID} />
          <XAxis dataKey="label" tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={{ stroke: GRID }} interval="preserveStartEnd" minTickGap={12} />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: AXIS }} tickLine={false} axisLine={false} width={32} />
          <Tooltip content={<Tip money={false} />} cursor={{ fill: "#f5f5f4" }} />
          <Bar dataKey="count" fill={BRAND} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function HBarChart({ data }: { data: { name: string; value: number; count?: number }[] }) {
  if (!data.length) return <p className="py-10 text-center text-sm text-stone-400">Belum ada data.</p>;
  return (
    <div style={{ height: Math.max(120, data.length * 44) }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 0, right: 64, left: 0, bottom: 0 }}>
          <XAxis type="number" hide />
          <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: "#44403c" }} tickLine={false} axisLine={false} width={100} />
          <Tooltip content={<Tip />} cursor={{ fill: "#f5f5f4" }} />
          <Bar dataKey="value" fill={BRAND} radius={[0, 4, 4, 0]} barSize={18}>
            <LabelList dataKey="value" position="right" formatter={(v: unknown) => short(Number(v))} style={{ fontSize: 11, fill: "#44403c" }} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
