import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { SESSION_COOKIE, verifySession, type SessionPayload } from "./session";

export async function getSession(): Promise<SessionPayload | null> {
  const store = await cookies();
  const session = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  // pastikan user masih aktif
  const user = await db.query.users.findFirst({ where: eq(schema.users.id, session.uid) });
  if (!user || !user.active) return null;
  return { uid: user.id, name: user.name, username: user.username, role: user.role };
}

export async function requireUser(role?: "ADMIN"): Promise<SessionPayload> {
  const s = await getSession();
  if (!s) redirect("/login");
  if (role === "ADMIN" && s.role !== "ADMIN") redirect("/kasir");
  return s;
}
