// Dipakai oleh middleware (edge) dan server — jangan impor database di sini.
import { SignJWT, jwtVerify } from "jose";

export const SESSION_COOKIE = "pos_session";

export type SessionPayload = {
  uid: number;
  name: string;
  username: string;
  role: "ADMIN" | "KASIR";
};

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 16) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET belum diatur (minimal 16 karakter).");
    }
    return new TextEncoder().encode("dev-secret-bakso-terbang-jangan-dipakai-produksi");
  }
  return new TextEncoder().encode(s);
}

export async function signSession(p: SessionPayload) {
  return new SignJWT({ ...p })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secret());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

/** Halaman yang hanya boleh diakses ADMIN */
export const ADMIN_PATHS = ["/dashboard", "/produk", "/kategori", "/stok", "/meja", "/pengguna", "/pengaturan"];
