// Dipakai oleh middleware (edge) dan server — jangan impor database di sini.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "pos_session";

export type SessionPayload = {
  uid: number;
  name: string;
  username: string;
  role: "ADMIN" | "KASIR";
};

const clean = (v?: string) => (v ?? "").trim().replace(/^["']|["']$/g, "").trim();
let cachedKey: Uint8Array | null = null;

/**
 * Kunci penandatangan sesi. Pakai AUTH_SECRET bila diisi; jika tidak,
 * diturunkan (SHA-256) dari token database yang juga rahasia.
 */
async function secret(): Promise<Uint8Array> {
  if (cachedKey) return cachedKey;
  const enc = new TextEncoder();
  const s = clean(process.env.AUTH_SECRET);
  if (s.length >= 16) return (cachedKey = enc.encode(s));
  const dbToken = clean(process.env.DATABASE_AUTH_TOKEN) || clean(process.env.TURSO_AUTH_TOKEN);
  if (dbToken) {
    const digest = await crypto.subtle.digest("SHA-256", enc.encode("pos-bakso-terbang/session/" + dbToken));
    return (cachedKey = new Uint8Array(digest));
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error("AUTH_SECRET belum diatur (minimal 16 karakter).");
  }
  return (cachedKey = enc.encode("dev-secret-bakso-terbang-jangan-dipakai-produksi"));
}

export async function signSession(p: SessionPayload) {
  return new SignJWT({ ...p })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(await secret());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, await secret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/** Halaman yang hanya boleh diakses ADMIN */
export const ADMIN_PATHS = ["/dashboard", "/laporan", "/analisis", "/produk", "/kategori", "/meja", "/outlet", "/printer", "/pengguna", "/pengaturan"];
