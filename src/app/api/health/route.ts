import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/** Pemeriksaan kesehatan: apakah konfigurasi & koneksi database berjalan. Tidak menampilkan data rahasia. */
export async function GET() {
  const clean = (v?: string) => (v ?? "").trim().replace(/^["']|["']$/g, "").trim();
  const url = clean(process.env.DATABASE_URL);
  const rawUrl = process.env.DATABASE_URL ?? "";
  const config = {
    DATABASE_URL: url
      ? (url.startsWith("libsql://") || url.startsWith("https://") ? "terisi (Turso)" : url.startsWith("file:") ? "file lokal (tidak bisa di Vercel)" : "format tidak dikenal, harus diawali libsql://") +
        (rawUrl !== url ? " — ada spasi/tanda kutip, sebaiknya dihapus" : "")
      : "KOSONG",
    DATABASE_AUTH_TOKEN: process.env.DATABASE_AUTH_TOKEN ? "terisi" : "KOSONG",
    AUTH_SECRET: !process.env.AUTH_SECRET ? "KOSONG" : process.env.AUTH_SECRET.length < 16 ? "terlalu pendek (min. 16 karakter)" : "terisi",
  };
  try {
    const { client } = await import("@/db");
    const { ensureDatabase } = await import("@/db/init");
    await ensureDatabase(client);
    const users = await client.execute("select count(*) as n from users");
    const outlets = await client.execute("select count(*) as n from outlets");
    return NextResponse.json({ status: "ok", config, database: "terhubung", users: Number(users.rows[0].n), outlets: Number(outlets.rows[0].n) });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json(
      { status: "error", config, database: "gagal", error: msg.replace(/eyJ[\w.-]+/g, "[token]").slice(0, 300) },
      { status: 500 },
    );
  }
}
