# Deployment Readiness SAKTI JR-JATIM

Dokumen ini adalah checklist final untuk menjalankan dashboard SAKTI JR-JATIM di environment baru atau sebelum deploy production.

## 1. Environment Variables

Gunakan `.env.example` sebagai acuan. Variabel yang wajib ada:

| Variable | Scope | Keterangan |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser/server | URL project Supabase untuk auth browser dan proxy. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser/server | Supabase anon key. |
| `SUPABASE_URL` | Server only | URL project Supabase untuk service role route. |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Service role key untuk route database server-side. Jangan expose ke client. |
| `GOOGLE_CLIENT_EMAIL` | Server only | Email service account Google. |
| `GOOGLE_PRIVATE_KEY` | Server only | Private key service account. Simpan dengan `\n` newline escape. |
| `GOOGLE_SHEET_ID` | Server only | ID spreadsheet sumber pendapatan. |

Catatan:
- `NEXT_PUBLIC_*` aman dibaca client, tetapi `SUPABASE_SERVICE_ROLE_KEY` dan Google credentials harus hanya berada di server/deployment secret.
- Untuk Vercel atau hosting lain, isi semua variable di dashboard environment project.

## 2. Supabase SQL

Jika project belum linked ke Supabase CLI, jalankan SQL melalui Supabase SQL Editor sesuai urutan file ini:

1. `supabase/migrations/202605310001_master_units.sql`
2. `supabase/migrations/202605310002_master_unit_dishub_dllaj.sql`
3. `supabase/migrations/202605310003_backfill_dishub_dllaj_unit_types.sql`
4. `supabase/migrations/202605310004_deactivate_iwkl_detail_source_units.sql`

Prasyarat database yang sudah ada:
- Tabel pendapatan: `revenue_import_batches`, `revenue_swdkllj`, `revenue_iwkbu`, `revenue_iwkl`, `revenue_iwkl_details`, `revenue_sync_logs`.
- View dashboard: `v_revenue_latest_batch`, `v_revenue_overview_monthly`, `v_revenue_source_composition`, `v_revenue_by_unit_monthly`, `v_revenue_swdkllj_monthly`, `v_revenue_iwkbu_monthly`, `v_revenue_iwkl_monthly`, `v_revenue_iwkl_detail_monthly`.
- Tabel auth profile: `profiles` dengan kolom `id` dan `role`.

Role yang dipakai aplikasi:
- `ADMIN_KANWIL`: akses admin penuh, import, master unit, API admin.
- `VIEWER`: akses dashboard dan pendapatan.
- `ADMIN_LOKET`: terdaftar sebagai role aplikasi, belum diberi akses admin Kanwil.

## 3. Google Sheets

Service account harus diberi akses baca ke spreadsheet sumber. Sheet/range yang dibaca aplikasi:

| Sheet | Range |
| --- | --- |
| `SWDKLLJ` | `A:G` |
| `SWDKLLJ_Detail` | `A:H` |
| `IWKBU` | `A:G` |
| `IWKBU_Detail` | `A:H` |
| `IWKL` | `A:C` |
| `IWKL_Detail` | `A:D` |

Tes koneksi sebagai admin:

```text
GET /api/test-sheets
```

Endpoint ini admin-only.

## 4. Auth & Access Rules

Boundary akses diatur di `proxy.ts`.

| Route | Akses |
| --- | --- |
| `/login` | Public, redirect ke `/` jika sudah login. |
| `/` | Semua user login. |
| `/pendapatan` | Semua user login. |
| `/admin/*` | `ADMIN_KANWIL` saja. |
| `/api/dashboard/*` | Semua user login. |
| `/api/revenue/*` | `ADMIN_KANWIL` saja. |
| `/api/master/*` | `ADMIN_KANWIL` saja. |
| `/api/test-sheets` | `ADMIN_KANWIL` saja. |

Manual auth smoke test:

1. Login sebagai `ADMIN_KANWIL`, pastikan menu `Master Unit` dan `Import Pendapatan` muncul.
2. Login sebagai `VIEWER`, pastikan menu admin tidak muncul.
3. Viewer membuka `/admin/master-unit` harus diarahkan ke `/`.
4. Viewer hit `/api/revenue/sync-logs`, `/api/master/units`, dan `/api/test-sheets` harus mendapat `403`.
5. User tanpa login membuka `/` harus diarahkan ke `/login?next=/`.

## 5. Import & Master Unit Smoke Test

Urutan setup data:

1. Login sebagai admin.
2. Buka `/admin/master-unit`.
3. Klik `Generate dari Data Pendapatan` setelah tabel revenue existing tersedia.
4. Lengkapi koordinat minimal untuk `KANWIL`, `CABANG`, dan `KANTOR_PELAYANAN` prioritas.
5. Pastikan `DISHUB` dan `DLLAJ` memakai tipe unit yang benar.
6. Pastikan sumber IWKL seperti `ASDP`, `PELNI`, `PELRA`, dan operator sejenis tidak aktif sebagai master unit.
7. Buka `/admin/import-pendapatan`.
8. Klik `Validasi Data`.
9. Jika hanya warning unit belum terpetakan yang bisa diterima, lanjut `Sync ke Supabase`.
10. Cek `Riwayat Sync Pendapatan` dan buka dashboard periode tersebut.

## 6. Build Checklist

Jalankan sebelum deploy:

```bash
npm install
npm run lint
npm run build
```

Ekspektasi:
- Lint tanpa error.
- Build Next.js sukses.
- Output build menampilkan `Proxy (Middleware)`, bukan warning deprecated `middleware`.

## 7. Functional Smoke Test

Setelah deploy:

1. Login berhasil dan redirect `next` bekerja hanya untuk path internal.
2. Dashboard overview memuat KPI, distribusi, top unit, peta OpenStreetMap, dan tabel wilayah.
3. Marker peta muncul untuk unit aktif yang punya koordinat.
4. Klik marker atau top unit masuk ke `/pendapatan` dengan unit terpilih.
5. Halaman `/pendapatan` bisa drilldown `SWDKLLJ`, `IWKBU`, dan `IWKL`.
6. Admin bisa CRUD Master Unit dan alias.
7. Alias duplikat ditolak dengan pesan jelas.
8. Import validasi/sync berjalan, warning tidak memblokir sync.
9. Riwayat sync menampilkan row count, total, status, batch ID, dan spreadsheet ID.

## 8. Known Follow-ups

Detail kecil yang bisa dirapikan setelah progress utama selesai:

- Migrasi schema revenue base ke migration lengkap jika ingin environment baru benar-benar bootstrap dari nol.
- Tambah halaman khusus health/status internal jika dibutuhkan monitoring deployment.
- Tambah pagination server-side untuk riwayat sync jika log sudah sangat banyak.
- Rapikan microcopy, spacing, dan empty state setelah semua flow utama final.
