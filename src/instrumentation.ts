// Dijalankan sekali saat server Next.js mulai: menyiapkan tabel & data awal secara otomatis.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { client } = await import("./db");
  const { ensureDatabase } = await import("./db/init");
  try {
    await ensureDatabase(client, (m) => console.log("[db]", m));
  } catch (e) {
    console.error("[db] Gagal menyiapkan database. Periksa DATABASE_URL dan DATABASE_AUTH_TOKEN.", e);
  }
}
