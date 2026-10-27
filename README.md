# PanenLog

Buku timbang digital: catat berat tiap karung hasil panen, jumlah dan rata-rata dihitung otomatis,
laporan bisa diunduh (Excel, CSV, PDF) atau dikirim lewat WhatsApp.

**Stack:** Next.js 16 (App Router, TypeScript) · Supabase (Auth + Postgres + RLS) · Vercel

---

## 1. Siapkan Supabase

1. Buat project di [supabase.com](https://supabase.com). Pilih region **Southeast Asia (Singapore)**.
2. Buka **SQL Editor**, lalu jalankan dua berkas ini **berurutan** (tempel isinya, tekan **Run**):
   1. `supabase/migrations/0001_init.sql`: tabel `profiles`, `seasons`, `plots`, `sacks`, aturan keamanan (RLS),
      nomor karung otomatis, dan fungsi hapus akun.
   2. `supabase/migrations/0002_redesign.sql`: tanggal selesai panen, penanda cadangan terakhir, dan fungsi
      pemulihan cadangan yang atomik. Sudah pernah menjalankan `0001`? Cukup jalankan `0002` saja; aman diulang.
3. Buka **Authentication > Sign In / Providers**:
   - **Email**: aktif secara bawaan. Untuk mencoba cepat, matikan **Confirm email**. Untuk produksi, biarkan aktif.
   - **Google** (opsional): isi Client ID dan Secret dari Google Cloud Console.
4. Buka **Authentication > URL Configuration**:
   - **Site URL**: `http://localhost:3000` (nanti ganti dengan domain Vercel Anda).
   - **Redirect URLs**: tambahkan `http://localhost:3000/**` dan `https://NAMA-APP.vercel.app/**`.
5. Buka **Project Settings > API Keys**, salin **Project URL** dan **Publishable key** (`sb_publishable_...`).

## 2. Jalankan di komputer

```bash
cp .env.example .env.local     # isi URL dan Publishable key dari langkah 1.5
npm install
npm run dev                    # http://localhost:3000
```

## 3. Deploy ke Vercel

1. Push folder ini ke repositori GitHub.
2. Di [vercel.com/new](https://vercel.com/new), **Import** repositori itu. Framework terdeteksi otomatis sebagai Next.js.
3. Di **Environment Variables**, isi dua variabel yang sama dengan `.env.local`:
   `NEXT_PUBLIC_SUPABASE_URL` dan `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
4. **Deploy**. Setelah mendapat domain, kembali ke Supabase (langkah 1.4) dan isi **Site URL** serta **Redirect URLs**
   dengan domain itu. Tanpa ini, tautan konfirmasi email, reset kata sandi, dan masuk dengan Google tidak akan kembali ke aplikasi.

`vercel.json` menaruh fungsi server di Singapura (`sin1`), dekat dengan database Supabase dan pengguna di Indonesia.

## 4. Cadangan dan memindahkan catatan dari PanenLog versi HTML

Menu **Akun > Cadangan data** menyediakan **Unduh cadangan** (berkas `.json`) dan **Salin teks**.
Formatnya sama dengan versi HTML, jadi bisa dipakai bolak-balik.

Untuk memindahkan catatan dari versi HTML: di sana unduh cadangannya, lalu di sini buka
**Akun > Pulihkan dari berkas** (atau **Pulihkan dari teks**).

Pemulihan **mengganti seluruh catatan** akun dengan isi cadangan, setelah Anda mengonfirmasi
(jumlah panen dan karung yang akan diganti ditampilkan dulu). Prosesnya satu transaksi database:
bila ada yang gagal, catatan lama tetap utuh.

## Struktur proyek

```
proxy.ts                      Menyegarkan sesi Supabase + menjaga halaman privat (pengganti middleware di Next 16)
app/
  (auth)/masuk/               Halaman masuk dan daftar
  (app)/                      Halaman privat: Beranda, panen/, laporan/, akun/ (layout memuat data di server)
  auth/callback/route.ts      Menukar kode dari Google/email dengan sesi
components/views/             Tampilan Beranda, Panen, Laporan, Akun
components/app-shell.tsx      Menggambar halaman setelah terpasang di browser (tanggal mengikuti zona waktu perangkat)
public/fonts/                 Manrope dan Archivo (di-host sendiri, tanpa Google Fonts)
lib/store.tsx                 State aplikasi + simpan ke Supabase (tampil dulu, simpan di latar, batalkan bila gagal)
lib/format.ts                 Format angka, tanggal, dan periode panen
lib/report.ts                 Teks laporan, Excel berformat, PDF berbranding, dan CSV (dimuat saat tombol ditekan)
lib/backup.ts                 Format cadangan, kompatibel dengan versi HTML lama
lib/supabase/                 Klien browser, klien server, dan logika proxy
supabase/migrations/          Skema database
```

## Catatan keamanan

- Publishable key memang untuk dipakai di browser. Yang menjaga data adalah **RLS**: tiap pengguna hanya
  bisa membaca dan mengubah barisnya sendiri. Aplikasi ini tidak memakai secret/service key.
- Jika aplikasi dibuka untuk umum, aktifkan **CAPTCHA** di Authentication > Attack Protection
  agar pendaftaran tidak dibanjiri akun palsu.
- Di Authentication > Sign In / Providers > Email, Anda bisa mengaktifkan **Secure password change** agar
  pengguna harus login ulang baru boleh mengganti kata sandi.
- Berat disimpan sebagai bilangan bulat dalam 1/100 kg (5250 = 52,50 kg), jadi penjumlahan tidak pernah kena galat desimal.
