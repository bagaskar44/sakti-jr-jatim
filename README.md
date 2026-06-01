# SAKTI JR-JATIM

Dashboard monitoring pendapatan Jasa Raharja Jawa Timur berbasis Next.js, Supabase, dan Google Sheets.

## Quick Start

```bash
npm install
npm run dev
```

Buka `http://localhost:3000`.

## Environment

Salin acuan variable dari `.env.example` ke `.env.local`, lalu isi kredensial Supabase dan Google Sheets.

```bash
npm run lint
npm run build
```

## Deployment

Checklist setup production, SQL Supabase, role auth, Google Sheets, dan smoke test ada di:

[docs/DEPLOYMENT_READINESS.md](docs/DEPLOYMENT_READINESS.md)

## Main Routes

- `/`: Overview dashboard.
- `/pendapatan`: Drilldown pendapatan per unit dan sumber.
- `/admin/master-unit`: Master Unit, alias, parent, koordinat.
- `/admin/import-pendapatan`: Validasi, sync, dan audit import pendapatan.
