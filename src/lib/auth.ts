import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import type { Outlet } from "@/db/schema";
import { SESSION_COOKIE, verifySession } from "./session";

export const OUTLET_COOKIE = "pos_outlet";

export type CurrentUser = {
  uid: number;
  name: string;
  username: string;
  role: "ADMIN" | "KASIR";
  outletId: number | null;
};

export async function getSession(): Promise<CurrentUser | null> {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  // pastikan user masih aktif & ambil data terbaru
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, session.uid) });
  if (!user || !user.active) return null;
  return { uid: user.id, name: user.name, username: user.username, role: user.role, outletId: user.outletId };
}

export async function requireUser(role?: "ADMIN"): Promise<CurrentUser> {
  const s = await getSession();
  if (!s) redirect("/login");
  if (role === "ADMIN" && s.role !== "ADMIN") redirect("/kasir");
  return s;
}

/**
 * Outlet tempat user sedang bertugas.
 * Kasir: outlet yang ditetapkan di akunnya. Admin: outlet yang dipilih (cookie), default outlet aktif pertama.
 */
export async function getActiveOutlet(user: CurrentUser): Promise<Outlet | null> {
  const all = await db.select().from(schema.outlets).where(eq(schema.outlets.active, true)).orderBy(asc(schema.outlets.id));
  if (!all.length) return null;
  let wanted: number | null = user.outletId;
  if (user.role === "ADMIN") {
    const store = await cookies();
    wanted = Number(store.get(OUTLET_COOKIE)?.value) || null;
  }
  return all.find((o) => o.id === wanted) ?? (user.role === "KASIR" && user.outletId ? null : all[0]);
}

export async function listOutlets() {
  return db.select().from(schema.outlets).orderBy(asc(schema.outlets.id));
}
