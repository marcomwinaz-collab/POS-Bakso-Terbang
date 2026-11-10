"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { db, schema } from "@/db";
import { getActiveOutlet, requireUser } from "@/lib/auth";
import { getOpenShift, shiftReport } from "@/lib/shift";

export type ShiftResult = { ok: true; shiftId: number } | { ok: false; error: string };

/** Buka kasir dengan modal awal */
export async function openShift(openingCash: number): Promise<ShiftResult> {
  const user = await requireUser();
  const outlet = await getActiveOutlet(user);
  if (!outlet) return { ok: false, error: "Outlet tidak aktif." };
  const cash = Math.round(Number(openingCash));
  if (!Number.isFinite(cash) || cash < 0) return { ok: false, error: "Modal awal tidak valid." };
  if (await getOpenShift(outlet.id)) return { ok: false, error: "Kasir di outlet ini sudah dibuka." };
  const [row] = await db
    .insert(schema.cashierShifts)
    .values({ outletId: outlet.id, openingCash: cash, openedById: user.uid, openedAt: new Date(), status: "OPEN" })
    .returning({ id: schema.cashierShifts.id });
  revalidatePath("/tutup-kasir");
  return { ok: true, shiftId: row.id };
}

/** Tutup kasir (settlement): simpan uang yang dihitung di laci */
export async function closeShift(shiftId: number, countedCash: number, note: string): Promise<ShiftResult> {
  const user = await requireUser();
  const shift = await db.query.cashierShifts.findFirst({ where: eq(schema.cashierShifts.id, shiftId) });
  if (!shift || shift.status !== "OPEN") return { ok: false, error: "Sesi kasir tidak ditemukan atau sudah ditutup." };
  if (user.role !== "ADMIN" && shift.outletId !== user.outletId) return { ok: false, error: "Sesi kasir bukan dari outlet Anda." };
  const counted = Math.round(Number(countedCash));
  if (!Number.isFinite(counted) || counted < 0) return { ok: false, error: "Jumlah uang di laci tidak valid." };

  const closedAt = new Date();
  const report = await shiftReport({ ...shift, closedAt });
  const res = await db
    .update(schema.cashierShifts)
    .set({
      status: "CLOSED",
      closedAt,
      closedById: user.uid,
      expectedCash: report.expectedCash,
      countedCash: counted,
      note: note.trim() || null,
    })
    .where(and(eq(schema.cashierShifts.id, shift.id), eq(schema.cashierShifts.status, "OPEN")))
    .returning({ id: schema.cashierShifts.id });
  if (!res.length) return { ok: false, error: "Sesi kasir sudah ditutup." };
  revalidatePath("/tutup-kasir");
  return { ok: true, shiftId: shift.id };
}
