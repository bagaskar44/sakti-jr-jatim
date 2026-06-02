# SAKTI JR-JATIM Project Progress

Generated: 2026-06-02

## 1. Ringkasan Project

SAKTI JR-JATIM adalah dashboard internal untuk monitoring operasional Jasa Raharja Kantor Wilayah Jawa Timur. Aplikasi saat ini berfokus pada dashboard pendapatan yang bersumber dari Google Sheets, disinkronkan ke Supabase, lalu ditampilkan dalam dashboard web berbasis Next.js.

Tujuan besar project:

- Menyediakan overview dashboard lintas fungsi: Pendapatan, Pelayanan, Kecelakaan, dan Kegiatan.
- Menyediakan drilldown pendapatan per unit/wilayah dan per sumber pendapatan.
- Menyediakan Master Unit sebagai canonical source untuk nama unit, alias, parent-child, tipe unit, status aktif, dan koordinat.
- Menyediakan import, validasi, sync, dan audit log untuk data pendapatan.
- Menjadi fondasi untuk modul Pelayanan, Kecelakaan, dan Kegiatan setelah schema/data modul tersebut tersedia.

Status saat ini: fondasi aplikasi, auth, dashboard pendapatan, Master Unit, import pendapatan, peta Leaflet/OpenStreetMap, dan placeholder modul non-pendapatan sudah terbentuk. Modul Pelayanan, Kecelakaan, dan Kegiatan masih memakai data static/placeholder.

## 2. Stack Teknologi

| Area | Teknologi |
| --- | --- |
| Framework | Next.js 16.2.6 App Router |
| UI | React 19.2.4, Tailwind CSS 4 |
| Auth & database | Supabase SSR, Supabase JS |
| Import data | Google Sheets API via `googleapis` |
| Chart | Recharts |
| Map | Leaflet, React Leaflet, OpenStreetMap tile |
| Icon | lucide-react |
| Language | TypeScript strict mode |

Important project rule: `AGENTS.md` menegaskan bahwa versi Next.js ini punya perubahan API/convention. Sebelum mengubah kode Next.js, baca dokumentasi lokal di `node_modules/next/dist/docs/`.

## 3. Struktur Direktori Penting

```text
app/
  page.tsx                         Overview Dashboard
  layout.tsx                       Root layout dan AppShell
  globals.css                      Global theme, komponen CSS, Leaflet CSS hooks
  login/page.tsx                   Login Supabase Auth
  pendapatan/page.tsx              Dashboard drilldown pendapatan
  pelayanan/page.tsx               Placeholder detail pelayanan
  kecelakaan/page.tsx              Placeholder detail kecelakaan
  kegiatan/page.tsx                Placeholder detail kegiatan
  admin/
    import-pendapatan/page.tsx     Validasi, sync, audit import pendapatan
    master-unit/page.tsx           CRUD Master Unit
    import-pelayanan/page.tsx      Placeholder import pelayanan
    import-kecelakaan/page.tsx     Placeholder import kecelakaan
    import-kegiatan/page.tsx       Placeholder import kegiatan
  api/
    dashboard/revenue/*            Endpoint data dashboard pendapatan
    revenue/*                      Endpoint validasi/sync/audit pendapatan
    master/units/*                 Endpoint CRUD dan seed Master Unit
    test-sheets/route.ts           Endpoint tes akses Google Sheets

components/
  layout/AppShell.tsx              Sidebar, menu utama, menu admin
  dashboard/*                      KPI, filter, chart, map, table, section card
  admin/*                          Leaflet map picker Master Unit

lib/
  supabase/*                       Client browser dan service-role server client
  revenue/*                        Reader Google Sheets, parser, validator
  master/units.ts                  Helper Master Unit, seed, alias resolver
  dashboard/period.ts              Resolver periode dashboard
  formatters.ts                    Format Rupiah, angka, persen, bulan

supabase/migrations/
  202605310001_master_units.sql
  202605310002_master_unit_dishub_dllaj.sql
  202605310003_backfill_dishub_dllaj_unit_types.sql
  202605310004_deactivate_iwkl_detail_source_units.sql
  202605310005_revenue_base_schema.sql

docs/
  DEPLOYMENT_READINESS.md          Checklist deploy dan smoke test
```

## 4. Environment dan Secret

Environment variable yang dipakai:

| Variable | Scope | Fungsi |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Client/server | URL Supabase untuk auth browser dan proxy |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client/server | Supabase anon key |
| `SUPABASE_URL` | Server only | URL Supabase untuk service-role route/helper |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Service role key untuk operasi server-side |
| `GOOGLE_CLIENT_EMAIL` | Server only | Email Google service account |
| `GOOGLE_PRIVATE_KEY` | Server only | Private key Google service account |
| `GOOGLE_SHEET_ID` | Server only | Spreadsheet sumber data pendapatan |

Catatan keamanan:

- `.env.local` berisi credential aktif dan sudah di-ignore oleh `.gitignore`.
- Jangan commit `.env.local`.
- Jangan menulis isi key ke dokumen, README, issue, atau log.
- Karena credential pernah terlihat di percakapan, sangat disarankan melakukan rotasi Google service account private key dan Supabase service role key sebelum production.

## 5. Auth, Role, dan Access Control

Auth memakai Supabase Auth. Boundary route diatur melalui `proxy.ts`, bukan `middleware.ts`.

Role aplikasi:

| Role | Status |
| --- | --- |
| `ADMIN_KANWIL` | Admin penuh untuk Master Unit, import, dan API admin |
| `VIEWER` | Akses dashboard umum |
| `ADMIN_LOKET` | Sudah didefinisikan, belum diberi hak admin Kanwil |

Access rule saat ini:

| Route | Akses |
| --- | --- |
| `/login` | Public, redirect ke `/` jika sudah login |
| `/` | Semua user login |
| `/pendapatan` | Semua user login |
| `/pelayanan`, `/kecelakaan`, `/kegiatan` | Semua user login |
| `/admin/*` | `ADMIN_KANWIL` saja |
| `/api/dashboard/*` | Semua user login |
| `/api/revenue/*` | `ADMIN_KANWIL` saja |
| `/api/master/*` | `ADMIN_KANWIL` saja |
| `/api/test-sheets` | `ADMIN_KANWIL` saja |

Login page sudah punya:

- Supabase `signInWithPassword`.
- Error message yang lebih jelas untuk email belum konfirmasi, credential salah, dan rate limit.
- Sanitasi `next` redirect agar tidak menjadi open redirect.

## 6. Layout dan Navigasi

`components/layout/AppShell.tsx` menangani shell aplikasi.

Menu utama:

- Overview
- Pendapatan
- Pelayanan
- Kecelakaan
- Kegiatan

Menu admin untuk `ADMIN_KANWIL`:

- Master Unit
- Import Pendapatan
- Import Pelayanan
- Import Kecelakaan
- Import Kegiatan

Sidebar desktop fixed di kiri. Mobile memakai top bar sticky dan drawer.

## 7. Overview Dashboard

File utama: `app/page.tsx`.

Status saat ini:

- Filter overview mendukung tahun, bulan, opsi bulan `ALL`, dan unit.
- Filter unit sudah berupa select berdasarkan daftar unit dari API.
- Tahun/bulan auto-apply saat berubah.
- KPI cards sudah menampilkan:
  - Total Pendapatan
  - Capaian dibanding periode tahun sebelumnya
  - Total Pelayanan
  - SLA Pelayanan
  - Total Kecelakaan
  - Total Kegiatan
- KPI Pelayanan, Kecelakaan, dan Kegiatan masih static placeholder.
- Di bawah KPI ada sticky tabs fungsi aktif:
  - Pendapatan
  - Pelayanan
  - Kecelakaan
- Default fungsi aktif adalah Pendapatan.
- Tabs fungsi mengubah fokus visualisasi, peta, dan link detail map.

Komponen visualisasi overview:

| Komponen | Status |
| --- | --- |
| `FunctionTrendChart` | Line chart Analisis Tren |
| Top 5 Unit | Bar horizontal Top 5 Unit |
| RevenueMap | Peta Leaflet/OpenStreetMap |
| RevenueSummaryTable | Ringkasan performa wilayah |
| LatestActivitiesSection | Kegiatan terbaru static |

Tren:

- Pendapatan memakai data real dari API overview.
- Tren Pendapatan hanya bergantung pada filter tahun.
- Untuk tahun berjalan, trend dibuat YtD sampai bulan data tersedia.
- Pelayanan dan Kecelakaan memakai static trend placeholder.

Peta:

- Menggunakan Leaflet/OpenStreetMap.
- Marker berasal dari Master Unit aktif yang punya koordinat.
- Unit yang ditampilkan di peta dibatasi ke tipe `KANWIL`, `CABANG`, dan `KANTOR_PELAYANAN`.
- Marker popup menampilkan preview "In Update...", metrik Pendapatan/Pelayanan/Kecelakaan, dan tombol detail.
- Tombol detail menuju:
  - `/pendapatan` jika fungsi aktif Pendapatan.
  - `/pelayanan` jika fungsi aktif Pelayanan.
  - `/kecelakaan` jika fungsi aktif Kecelakaan.

## 8. Dashboard Pendapatan

File utama: `app/pendapatan/page.tsx`.

Fungsi utama:

- Dashboard detail pendapatan per periode.
- Filter tahun, bulan, sumber, dan unit.
- Tab sumber:
  - Semua
  - SWDKLLJ
  - IWKBU
  - IWKL
- KPI dan chart pendapatan per sumber.
- Top unit dan tabel ringkasan.
- Drilldown per sumber pendapatan:
  - SWDKLLJ summary/detail.
  - IWKBU summary/detail.
  - IWKL summary/detail.
- Link dari Overview Top 5 Unit, peta, dan tabel mengarah ke halaman ini dengan query `year`, `month`, `unit`, `source`, dan `tab`.

Endpoint dashboard pendapatan:

| Endpoint | Fungsi |
| --- | --- |
| `GET /api/dashboard/revenue/overview` | Overview, comparison, composition, top unit, trend |
| `GET /api/dashboard/revenue/units` | Ranking unit, mendukung `month=all` |
| `GET /api/dashboard/revenue/map` | Data marker peta dari Master Unit dan revenue |
| `GET /api/dashboard/revenue/swdkllj` | Data SWDKLLJ summary/detail |
| `GET /api/dashboard/revenue/iwkbu` | Data IWKBU summary/detail |
| `GET /api/dashboard/revenue/iwkl` | Data IWKL summary/detail |

## 9. Import Pendapatan

File utama: `app/admin/import-pendapatan/page.tsx`.

Import pendapatan sudah menjadi flow admin yang cukup lengkap:

1. Admin memilih periode tahun dan bulan.
2. Admin menjalankan validasi data dari Google Sheets.
3. UI menampilkan:
   - status validasi,
   - row count per sheet,
   - total pendapatan,
   - technical errors,
   - business warnings,
   - detail warning unit belum terpetakan.
4. Jika tidak ada error, admin bisa sync ke Supabase.
5. Sync membuat batch baru untuk periode terkait.
6. Batch lama periode yang sama dihapus sebelum insert ulang.
7. Riwayat sync tersimpan ke `revenue_sync_logs`.
8. UI menampilkan audit log dengan filter status, tahun, dan bulan.
9. Admin bisa membuka detail audit dan lanjut ke dashboard periode.

Sheet yang dibaca:

| Sheet | Range | Tujuan |
| --- | --- | --- |
| `SWDKLLJ` | `A:G` | Summary SWDKLLJ |
| `SWDKLLJ_Detail` | `A:H` | Detail SWDKLLJ per parent |
| `IWKBU` | `A:G` | Summary IWKBU |
| `IWKBU_Detail` | `A:H` | Detail IWKBU per parent |
| `IWKL` | `A:C` | Summary IWKL |
| `IWKL_Detail` | `A:D` | Detail IWKL per jenis/operator |

Parser:

- Normalisasi text dasar: trim dan uppercase.
- Parser Rupiah mendukung format `Rp`, titik ribuan, dan koma desimal.
- Parser jumlah mendukung format Indonesia.
- Parser persen mendukung koma desimal.
- Hardcoded alias Mojokerto/Mojekerto masih dipertahankan sebagai fallback.

Validasi:

- Header tiap sheet dicek.
- Required field utama dicek.
- Duplikasi data diberi warning.
- Row bernilai nol diberi warning.
- Subtotal detail dibandingkan dengan summary.
- Unit yang belum masuk Master Unit menjadi warning, bukan blocker.

Sync:

- Error validasi membatalkan sync.
- Warning tidak membatalkan sync.
- Data masuk ke:
  - `revenue_import_batches`
  - `revenue_swdkllj`
  - `revenue_iwkbu`
  - `revenue_iwkl`
  - `revenue_iwkl_details`
  - `revenue_sync_logs`

## 10. Master Unit

File UI: `app/admin/master-unit/page.tsx`.

Helper/API utama:

- `lib/master/units.ts`
- `GET/POST /api/master/units`
- `GET/PATCH/DELETE /api/master/units/[id]`
- `POST /api/master/units/seed-from-revenue`

Master Unit saat ini berfungsi sebagai pusat canonical unit:

- `unit_name`
- `canonical_name`
- `unit_type`
- `parent_unit_id`
- `latitude`
- `longitude`
- `is_active`
- alias list

Tipe unit:

- `KANWIL`
- `CABANG`
- `KANTOR_PELAYANAN`
- `SAMSAT`
- `LOKET`
- `OPERATOR`
- `DISHUB`
- `DLLAJ`
- `LAINNYA`

Fitur halaman Master Unit:

- Search unit atau alias.
- Filter tipe unit.
- Filter aktif/nonaktif.
- Statistik total/aktif/nonaktif.
- Form tambah/edit.
- Parent Unit dari semua unit aktif, bukan hanya unit hasil filter tabel.
- Exclude unit yang sedang diedit agar tidak bisa memilih dirinya sendiri sebagai parent.
- Map picker Leaflet untuk memilih koordinat.
- Alias list.
- Soft deactivate via tombol Nonaktif.
- Generate kandidat dari data pendapatan.

Seed dari revenue:

- Membaca unit dari tabel revenue.
- Menghindari duplikasi canonical/alias existing.
- Menambahkan alias canonical untuk unit baru.
- Infer tipe unit berdasarkan nama/level.
- `DISHUB` dan `DLLAJ` otomatis dikenali.
- `CABANG` dan `KANTOR_PELAYANAN` tanpa parent diarahkan ke `KANTOR WILAYAH JAWA TIMUR` jika unit Kanwil tersedia.
- Sumber IWKL Detail seperti operator/jenis tidak lagi dianggap master unit aktif; migration deactivation tersedia.

Resolver Master Unit di pipeline revenue:

- Membaca `master_unit_aliases`.
- Mengganti `unit_name` dan `parent_unit_name` ke `master_units.canonical_name` jika alias ditemukan.
- Jika tidak ditemukan, menambah warning `Unit belum terpetakan di Master Unit`.
- Sync tetap lanjut walau ada unit belum terpetakan.

## 11. Modul Pelayanan, Kecelakaan, dan Kegiatan

Status saat ini: placeholder.

Route detail:

- `/pelayanan`
- `/kecelakaan`
- `/kegiatan`

Route import admin:

- `/admin/import-pelayanan`
- `/admin/import-kecelakaan`
- `/admin/import-kegiatan`

Semua route memakai `ModulePlaceholderPage` dan menerima query:

- `year`
- `month`
- `unit`

Jika user klik detail dari peta Overview dengan fungsi aktif Pelayanan/Kecelakaan, user diarahkan ke placeholder sesuai fungsi dan unit.

Yang belum ada:

- Schema database real.
- Import pipeline real.
- Parser dan validator real.
- Dashboard detail real.
- KPI real.
- Tren real.
- Aktivitas real.

## 12. Database dan Migration

Migration yang sudah ditrack lokal:

1. `202605310001_master_units.sql`
   - Extension `pgcrypto`.
   - Enum `master_unit_type`.
   - Tabel `master_units`.
   - Tabel `master_unit_aliases`.
   - Index parent, type, active, alias unit.
   - Trigger `updated_at`.
   - RLS enabled.

2. `202605310002_master_unit_dishub_dllaj.sql`
   - Tambah enum `DISHUB`.
   - Tambah enum `DLLAJ`.
   - Backfill default parent Cabang/Pelayanan ke Kanwil.

3. `202605310003_backfill_dishub_dllaj_unit_types.sql`
   - Backfill unit `LAINNYA` yang mengandung DISHUB/DLLAJ menjadi tipe terkait.

4. `202605310004_deactivate_iwkl_detail_source_units.sql`
   - Menonaktifkan unit bertipe `OPERATOR` yang berasal dari sumber/jenis IWKL Detail.
   - Sudah dibuat defensif jika tabel revenue belum tersedia saat migration berjalan.

5. `202605310005_revenue_base_schema.sql`
   - Tabel `profiles` untuk role user.
   - Trigger auto-create profile saat user Supabase Auth dibuat.
   - Tabel revenue base:
     - `revenue_import_batches`
     - `revenue_swdkllj`
     - `revenue_iwkbu`
     - `revenue_iwkl`
     - `revenue_iwkl_details`
     - `revenue_sync_logs`
   - View dashboard revenue:
  - `v_revenue_latest_batch`
  - `v_revenue_overview_monthly`
  - `v_revenue_source_composition`
  - `v_revenue_by_unit_monthly`
  - `v_revenue_swdkllj_monthly`
  - `v_revenue_iwkbu_monthly`
  - `v_revenue_iwkl_monthly`
  - `v_revenue_iwkl_detail_monthly`
   - Index utama untuk batch, periode, unit, parent, dan sync logs.
   - RLS enabled untuk tabel revenue.

Implikasi: schema utama Pendapatan dan Master Unit sekarang sudah ditrack di migration lokal. Tetap perlu smoke test di Supabase project fresh untuk memastikan bootstrap dari nol berjalan sesuai ekspektasi.

## 13. UI dan Design System

Global styling ada di `app/globals.css`.

Komponen CSS utama:

- `.jr-page`
- `.jr-card`
- `.jr-label`
- `.jr-field`
- `.jr-button-primary`
- `.jr-button-secondary`
- `.jr-button-soft`
- `.jr-table-shell`
- `.jr-table-head`
- `.jr-state`

Karakter visual saat ini:

- Dashboard operasional dengan card radius 8px.
- Warna utama biru `#1f4fea`.
- Sidebar gelap.
- Konten utama terang.
- Leaflet map full-width di dalam card.
- Sticky tabs fungsi pada Overview.
- Table dan filter dibuat dense untuk workflow internal.

## 14. File Asset

Asset publik saat ini:

- `public/images/logo-jasa-raharja.png`
- `public/images/logo-jasa-raharja-transparent.png`
- Default SVG bawaan Next.js masih ada:
  - `window.svg`
  - `vercel.svg`
  - `next.svg`
  - `globe.svg`
  - `file.svg`

Logo Jasa Raharja dipakai di AppShell dan Login page.

## 15. Progress Selesai

Fondasi aplikasi:

- Next.js app structure.
- TypeScript strict.
- Tailwind CSS 4.
- AppShell dengan sidebar desktop dan drawer mobile.
- Login Supabase Auth.
- Proxy auth dan role guard.
- README singkat.
- Deployment readiness checklist.

Pendapatan:

- Google Sheets reader.
- Parser 6 sheet pendapatan.
- Business validator.
- API validasi.
- API sync.
- API sync logs.
- UI Import Pendapatan.
- Audit log UI.
- Dashboard Pendapatan.
- Drilldown SWDKLLJ/IWKBU/IWKL.
- Overview revenue API.
- Unit ranking API.
- Map API.
- Support `month=all` untuk overview/unit/map.
- Migration revenue/base lengkap untuk tabel dan view yang dipakai dashboard.

Master Unit:

- Migration Master Unit dan alias.
- CRUD API.
- CRUD UI admin.
- Soft deactivate.
- Seed dari revenue.
- Alias resolver di pipeline revenue.
- Warning unit belum terpetakan, sync tetap lanjut.
- DISHUB/DLLAJ support.
- Parent default ke Kanwil.
- Deactivation sumber IWKL Detail/OPERATOR.
- Leaflet map picker koordinat.

Overview:

- KPI cards lintas fungsi.
- Sticky tabs fungsi aktif.
- Analisis Tren line chart.
- Top 5 Unit.
- Leaflet/OpenStreetMap.
- Unit filter.
- Static preview untuk Pelayanan/Kecelakaan/Kegiatan.
- Kegiatan terbaru static.

Placeholder modul:

- Detail Pelayanan.
- Detail Kecelakaan.
- Detail Kegiatan.
- Import Pelayanan.
- Import Kecelakaan.
- Import Kegiatan.

## 16. Progress Belum Selesai

Prioritas besar yang belum selesai:

- Schema database lengkap untuk modul Pelayanan.
- Schema database lengkap untuk modul Kecelakaan.
- Schema database lengkap untuk modul Kegiatan.
- Import Google Sheets atau sumber data untuk modul non-pendapatan.
- Parser dan validator modul non-pendapatan.
- Sync dan audit log modul non-pendapatan.
- Dashboard detail Pelayanan/Kecelakaan/Kegiatan real.
- Activity feed real.
- Foto/thumbnail kegiatan/unit real untuk peta dan card kegiatan.
- Uji migration lengkap di Supabase project fresh.
- RLS policies detail untuk tabel Master Unit dan revenue jika perlu akses client langsung.

Detail polish yang masih bisa dirapikan setelah fungsi utama selesai:

- Microcopy dan empty state.
- Konsistensi spacing kecil.
- Pagination server-side audit log.
- Health/status page.
- Export report real.
- Lupa kata sandi real.
- Ganti static credential note di login.
- Uji mobile visual untuk semua halaman.
- Uji viewer/admin role secara manual lengkap.

## 17. Risiko dan Catatan Teknis

1. Secret management
   - `.env.local` tidak boleh masuk git.
   - Credential yang pernah terekspos harus dirotasi sebelum production.

2. Migration perlu diuji fresh
   - Migration lokal sudah mencakup Master Unit dan revenue/base.
   - Perlu diuji di Supabase project fresh karena sebagian schema sebelumnya berasal dari database yang sudah ada.

3. Static data lintas fungsi
   - KPI Pelayanan/Kecelakaan/Kegiatan, trend non-pendapatan, dan latest activities masih placeholder.

4. Peta bergantung koordinat Master Unit
   - Marker hanya muncul untuk unit aktif yang punya latitude/longitude.
   - Coverage peta meningkat jika koordinat Cabang/Pelayanan/Kanwil dilengkapi.

5. Next.js 16
   - Route handler dinamis memakai `params` sebagai promise.
   - Proxy dipakai menggantikan middleware pattern lama.

6. Service role
   - Supabase service role hanya digunakan di server route/helper.
   - Jangan import service role helper ke client component.

## 18. Rekomendasi Next Steps

Urutan kerja yang paling masuk akal setelah progress saat ini:

1. Finalisasi data model Pelayanan, Kecelakaan, dan Kegiatan.
2. Buat migration schema untuk tiga modul tersebut.
3. Buat import pipeline per modul:
   - reader,
   - parser,
   - validator,
   - sync,
   - sync log.
4. Ganti static KPI/trend/activities di Overview dengan data real.
5. Bangun dashboard detail `/pelayanan`, `/kecelakaan`, dan `/kegiatan`.
6. Tambahkan foto/asset kegiatan atau unit untuk popup peta dan activity cards.
7. Jalankan migration lengkap di Supabase project fresh sebagai bootstrap test.
8. Jalankan full smoke test role admin/viewer.
9. Rapikan UI detail kecil.
10. Siapkan deploy production.

## 19. Perintah Verifikasi

Perintah standar sebelum deploy atau handoff:

```bash
npm run lint
npm run build
```

Smoke test manual:

1. Login sebagai `ADMIN_KANWIL`.
2. Buka `/`.
3. Cek KPI, sticky tabs, line chart, Top 5 Unit, peta, tabel, dan kegiatan terbaru.
4. Klik marker peta dengan fungsi Pendapatan, Pelayanan, dan Kecelakaan.
5. Buka `/pendapatan` dan cek drilldown sumber.
6. Buka `/admin/master-unit`, edit unit, koordinat, parent, alias.
7. Buka `/admin/import-pendapatan`, validasi, sync, dan cek audit log.
8. Login sebagai `VIEWER`, pastikan menu admin hilang dan `/admin/*` tidak bisa diakses.

## 20. Kesimpulan Status

Project sudah melewati fase fondasi dan dashboard pendapatan utama. Bagian yang paling matang saat ini adalah Pendapatan dan Master Unit. Overview sudah mulai menjadi dashboard lintas fungsi, tetapi sebagian besar data non-pendapatan masih static. Tahap berikutnya sebaiknya difokuskan pada realisasi data model dan import pipeline untuk Pelayanan, Kecelakaan, dan Kegiatan agar sticky tabs, KPI lintas fungsi, peta, dan activity feed bisa sepenuhnya berbasis data real.
