# Orbit Workspace Hub

Local React + Node scaffold for the Orbit / Workspace Hub artifact.

## Run locally

```bash
npm install
npm run api
npm run dev
```

Open http://localhost:5173.

The frontend seeds localStorage from `src/data/orbit-backup-seed.json` on first load. It will not overwrite existing browser data.

## Backend

The local API runs on http://127.0.0.1:8787.

- `GET /health`
- `POST /wa/send-test`
- `POST /wa/send`
- `GET /webhooks/whatsapp`
- `POST /webhooks/whatsapp`
- `POST /webhooks/email`
- `POST /scheduler/run-once`

By default, WhatsApp sends are mocked and recorded locally. To prepare real delivery, copy `.env.example` to `.env` and add Supabase plus provider credentials.

## Supabase

Paste `supabase/schema.sql` into the Supabase SQL Editor to create the tables from the backend plan.
