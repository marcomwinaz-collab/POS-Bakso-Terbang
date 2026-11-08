export function rupiah(n: number) {
  return "Rp " + Math.round(n).toLocaleString("id-ID");
}

export const TZ_OFFSET_HOURS = Number(process.env.TZ_OFFSET_HOURS ?? 7);

/** Format tanggal/waktu dalam zona waktu toko */
export function formatDateTime(d: Date | number | null | undefined) {
  if (!d) return "-";
  const date = new Date(typeof d === "number" ? d : d.getTime());
  const local = new Date(date.getTime() + TZ_OFFSET_HOURS * 3600_000);
  const pad = (x: number) => String(x).padStart(2, "0");
  return `${pad(local.getUTCDate())}/${pad(local.getUTCMonth() + 1)}/${local.getUTCFullYear()} ${pad(
    local.getUTCHours(),
  )}:${pad(local.getUTCMinutes())}`;
}

/** "YYYY-MM-DD" hari ini dalam zona waktu toko */
export function todayLocal() {
  const local = new Date(Date.now() + TZ_OFFSET_HOURS * 3600_000);
  return local.toISOString().slice(0, 10);
}

/** Ubah "YYYY-MM-DD" (lokal) menjadi epoch ms awal hari */
export function localDayStart(day: string) {
  return Date.parse(day + "T00:00:00Z") - TZ_OFFSET_HOURS * 3600_000;
}

export function addDays(day: string, n: number) {
  const d = new Date(day + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const PAYMENT_LABEL: Record<string, string> = {
  CASH: "Tunai",
  QRIS: "QRIS",
  DEBIT: "Kartu Debit",
  TRANSFER: "Transfer",
};

export const TYPE_LABEL: Record<string, string> = {
  DINE_IN: "Makan di tempat",
  TAKEAWAY: "Bawa pulang",
  ONLINE: "Online / Ojol",
};

export const STATUS_LABEL: Record<string, string> = {
  OPEN: "Open Bill",
  PAID: "Lunas",
  VOID: "Batal",
  REFUNDED: "Refund",
};

export const STATUS_STYLE: Record<string, string> = {
  PAID: "bg-green-100 text-green-800",
  OPEN: "bg-amber-100 text-amber-800",
  VOID: "bg-stone-200 text-stone-600",
  REFUNDED: "bg-red-100 text-red-800",
};
