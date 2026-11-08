"use server";

import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db, schema } from "@/db";
import { SESSION_COOKIE, signSession } from "@/lib/session";

export async function login(_prev: { error?: string } | undefined, formData: FormData) {
  const username = String(formData.get("username") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) return { error: "Username dan password wajib diisi." };

  let role: "ADMIN" | "KASIR";
  try {
    const user = await db.query.users.findFirst({ where: eq(schema.users.username, username) });
    if (!user || !user.active || !(await bcrypt.compare(password, user.passwordHash))) {
      return { error: "Username atau password salah." };
    }
    const token = await signSession({ uid: user.id, name: user.name, username: user.username, role: user.role });
    const store = await cookies();
    store.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIE !== "1",
      path: "/",
      maxAge: 60 * 60 * 12,
    });
    role = user.role;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[login]", e);
    if (msg.includes("AUTH_SECRET")) return { error: "Server belum dikonfigurasi: AUTH_SECRET belum diisi (min. 16 karakter)." };
    return { error: "Tidak bisa terhubung ke database. Buka /api/health untuk detail." };
  }
  redirect(role === "ADMIN" ? "/dashboard" : "/kasir");
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  redirect("/login");
}
