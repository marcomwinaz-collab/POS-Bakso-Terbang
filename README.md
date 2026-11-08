# POS Bakso Terbang

Aplikasi kasir (Point of Sale) dan dashboard berbasis web untuk **Bakso Terbang**. Dibangun dengan Next.js 15, Drizzle ORM, dan SQLite (libSQL).

## Fitur

**Kasir**
- Pilih menu per kategori, pencarian cepat, catatan per item (mis. "tidak pedas")
- Makan di tempat (dengan pilihan meja) atau bawa pulang
- **Open bill**: simpan pesanan per meja, ubah/tambah item, bayar belakangan
- Diskon nominal atau persen, pajak/PB1 dan service charge otomatis
- Pembayaran Tunai (hitung kembalian + tombol nominal cepat), QRIS, Debit, Transfer
- Cetak struk 80 mm, juga tagihan sementara untuk open bill

**Produk & Stok**
- Kelola produk, kategori, HPP/modal, dan margin
- Stok berkurang otomatis saat transaksi lunas; kembali saat transaksi dibatalkan
- Stok masuk, stok keluar (rusak/basi), dan stok opname, dengan riwayat lengkap
- Peringatan stok menipis
- Produk tanpa lacak stok (mis. es teh, nasi)

**Dashboard & Laporan** (khusus admin)
- Omzet, jumlah transaksi, rata-rata per transaksi, laba kotor, dibandingkan dengan periode sebelumnya
- Grafik omzet harian, jam ramai, metode pembayaran, penjualan per kategori
- Menu terlaris
- Riwayat transaksi dengan filter tanggal/status dan **export CSV** (bisa dibuka di Excel)

**Pengguna & Hak akses**
- Peran **Admin** (akses penuh) dan **Kasir** (kasir, open bill, transaksi)
- Pembatalan transaksi lunas hanya oleh admin, wajib dengan alasan

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
| Admin | `admin` | `admin123` |
| Kasir | `kasir` | `kasir123` |

> **Segera ganti kedua password ini** di menu Pengguna setelah login pertama.

Opsional, untuk mencoba dashboard dengan data contoh 30 hari: `npm run db:demo` (jangan dijalankan di database yang dipakai berjualan).

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

Nama toko, alamat, pajak, service charge, dan catatan kaki struk diatur dari menu **Pengaturan** di aplikasi.

## Struktur kode

```
src/
  app/
    (app)/kasir       Layar kasir
    (app)/pesanan     Open bill
    (app)/transaksi   Riwayat transaksi + export CSV
    (app)/dashboard   Dashboard laporan
    (app)/produk, kategori, stok, meja, pengguna, pengaturan
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
