# POS Bakso Terbang

Aplikasi kasir (Point of Sale) dan dashboard berbasis web untuk **Bakso Terbang**. Dibangun dengan Next.js 15, Drizzle ORM, dan SQLite (libSQL).

## Fitur

**Kasir**
- Pilih menu per kategori, cari menu, beri catatan per item (mis. "tidak pedas")
- Jenis order: **Makan di tempat** (no. meja + jumlah tamu), **Bawa pulang**, **Online/Ojol**
- **Open bill** per meja: simpan dulu, ubah/tambah item, bayar belakangan
- Diskon nominal/persen, pajak (PB1) dan service charge otomatis per outlet
- Pembayaran Tunai (kembalian + tombol nominal cepat), QRIS, Debit, Transfer
- Refund transaksi lunas (khusus admin, wajib alasan)

**Pengaturan**
- **Produk & harga**, kategori
- **No. meja** per outlet (tambah satu-satu atau sekaligus, mis. meja 1–20)
- **Outlet/cabang**: kode struk, alamat, pajak, service charge
- **Printer & struk** per outlet: kertas 58/80 mm, ukuran huruf, logo, header/footer, cetak otomatis, jumlah salinan, tiket dapur, cetak uji
- Pengguna: Admin (semua outlet) dan Kasir (ditempatkan di satu outlet)

**Laporan Sales** (khusus admin, filter tanggal & outlet, export CSV)
- Ringkasan sales: penjualan kotor, diskon, bersih, service, pajak, total, metode pembayaran
- Detail sales: setiap transaksi beserta itemnya
- Sales produk: qty & nilai per produk dan per kategori
- Sales outlet: perbandingan antar cabang
- Jenis order: makan di tempat vs bawa pulang vs online
- Refund: daftar refund, alasan, dan siapa yang melakukan

**Analisis**
- Produk terlaris (qty & pendapatan) dan produk kurang laku
- Jam teramai, hari teramai, peta keramaian hari × jam
- Tren pendapatan harian, rata-rata item & belanja per transaksi, jenis order, metode pembayaran

## Menjalankan di komputer

Kebutuhan: [Node.js](https://nodejs.org) 20 atau lebih baru.

```bash
git clone https://github.com/marcomwinaz-collab/pos-bakso-terbang.git
cd pos-bakso-terbang
npm install
cp .env.example .env        # lalu ubah AUTH_SECRET
npm run setup               # membuat tabel + data awal (menu, meja, akun)
npm run dev
```

Buka http://localhost:3000.

| Akun | Username | Password |
|------|----------|----------|
| Admin (semua outlet) | `admin` | `admin123` |
| Kasir Outlet Pusat | `kasir` | `kasir123` |
| Kasir Outlet Cabang 2 | `kasir2` | `kasir123` |

> **Segera ganti password-password ini** di menu Pengguna setelah login pertama.

Opsional, untuk mencoba laporan & analisis dengan data contoh 30 hari: `npm run db:demo` (jangan dijalankan di database yang dipakai berjualan).

## Menjalankan untuk operasional (produksi)

### Opsi A: Satu komputer/VPS di toko (paling sederhana)

```bash
npm install
npm run setup
npm run build
npm start                  # berjalan di port 3000
```

Perangkat kasir lain (tablet/HP) di jaringan WiFi yang sama bisa membuka `http://<IP-komputer>:3000`.
Jika diakses lewat `http` (bukan `https`), tambahkan `INSECURE_COOKIE=1` di `.env` agar login berfungsi.
Untuk berjalan otomatis saat komputer menyala, gunakan [PM2](https://pm2.keymetrics.io): `npx pm2 start npm --name pos -- start`.

Data tersimpan di file `data/pos.db`. **Backup file ini secara rutin.**

### Opsi B: Online di Vercel + Turso (gratis untuk skala kecil)

1. Buat database di [Turso](https://turso.tech), salin URL (`libsql://...`) dan token-nya.
2. Isi `.env` lokal dengan `DATABASE_URL` dan `DATABASE_AUTH_TOKEN` Turso, lalu jalankan `npm run setup` sekali.
3. Import repo ini di [Vercel](https://vercel.com), tambahkan environment variable `DATABASE_URL`, `DATABASE_AUTH_TOKEN`, `AUTH_SECRET`, dan `TZ_OFFSET_HOURS=7`.
4. Deploy.

## Pengaturan

| Variabel | Keterangan |
|----------|------------|
| `DATABASE_URL` | `file:./data/pos.db` (lokal) atau URL Turso |
| `DATABASE_AUTH_TOKEN` | Token Turso (kosongkan jika lokal) |
| `AUTH_SECRET` | String acak panjang untuk mengamankan sesi login |
| `TZ_OFFSET_HOURS` | Zona waktu laporan: 7 = WIB, 8 = WITA, 9 = WIT |
| `INSECURE_COOKIE` | Isi `1` jika produksi diakses tanpa HTTPS |

Nama usaha diatur di **Pengaturan → Umum**; alamat, pajak, dan service charge di **Outlet**; tampilan struk dan cetak otomatis di **Printer & Struk**.

### Printer thermal

Aplikasi mencetak lewat browser, jadi semua printer thermal yang terpasang di perangkat kasir (USB, Bluetooth, atau LAN) bisa dipakai. Jadikan printer thermal sebagai printer default, pilih margin *None* di dialog cetak, lalu jalankan Chrome dengan opsi `--kiosk-printing` agar struk langsung tercetak tanpa dialog.

## Struktur kode

```
src/
  app/
    (app)/kasir       Layar kasir
    (app)/pesanan     Open bill
    (app)/transaksi   Riwayat transaksi outlet (cetak ulang, refund)
    (app)/dashboard   Ringkasan hari ini
    (app)/laporan     Laporan sales (6 jenis) + export CSV
    (app)/analisis    Analisis penjualan
    (app)/produk, kategori, meja, outlet, printer, pengguna, pengaturan
    struk/[id]        Halaman cetak struk
    actions/          Server actions (pesanan, admin, login)
  db/schema.ts        Skema database
  lib/                Auth, format rupiah/tanggal, perhitungan total
scripts/              Seed data awal & data demo
```

## Perintah

| Perintah | Fungsi |
|----------|--------|
| `npm run dev` | Mode pengembangan |
| `npm run build` / `npm start` | Build & jalankan produksi |
| `npm run db:push` | Sinkronkan skema ke database (setelah mengubah `schema.ts`) |
| `npm run db:seed` | Isi data awal (hanya jika database masih kosong) |
| `npm run db:demo` | Tambah transaksi contoh |
