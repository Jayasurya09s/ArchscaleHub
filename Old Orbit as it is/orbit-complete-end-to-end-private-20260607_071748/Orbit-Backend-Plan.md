# Orbit / Workspace Hub — App Structure & Database Plan

**Purpose:** This document is the handover brief for wiring a real backend (Supabase + a WhatsApp provider) to the existing Orbit front-end. It maps every entity already built in the front-end to a database table, defines relationships, and lists exactly what the developer needs to set up. Hand this to a developer or to Codex/Claude Code.

**Current state:** The front-end is a single-file React app (`app.jsx`). All data currently lives in browser state and a JSON backup. This plan moves that data into a real database and adds the server pieces needed for real WhatsApp/email sending and scheduled reminders.

---

## 1. Architecture overview

```
┌─────────────────┐        ┌──────────────────────┐        ┌────────────────────┐
│  Orbit React    │  HTTPS │   Backend API         │  REST  │  Supabase          │
│  front-end      │ <────> │  (Node/Express or     │ <────> │  Postgres + Auth   │
│  (app.jsx)      │        │   Supabase Edge Fns)  │        │  + Storage         │
└─────────────────┘        └──────────────────────┘        └────────────────────┘
                                     │
                                     │  provider API calls + inbound webhooks
                                     ▼
                           ┌──────────────────────┐
                           │  WhatsApp provider    │
                           │  (Interakt / WATI /   │
                           │   Meta Cloud API)     │
                           │  + Email (Resend)     │
                           └──────────────────────┘
```

**Three layers:**

1. **Front-end (exists):** Orbit React app. Change: replace browser-state reads/writes with API calls to the backend. Keep the local JSON backup as an export feature.
2. **Backend (to build):** A thin API that the front-end talks to. Holds secrets (provider keys), runs the scheduler, receives provider webhooks, and reads/writes Supabase. Can be Supabase Edge Functions, or a small Node/Express service on Render/Railway.
3. **Data + integrations (to set up):** Supabase for the database; a WhatsApp provider for sends; Resend (or similar) for email.

**Why a backend is mandatory:** the React app runs in the browser, where API keys cannot be stored safely and no scheduler/webhook receiver can run. Sending real WhatsApp/email and firing timed reminders must happen server-side.

---

## 2. Module → table map (what already exists in the front-end)

Every item below already exists as front-end state. The job is to mirror each as a Supabase table.

| Front-end module | State key(s) | Becomes table(s) |
|---|---|---|
| Members / HR | `users` | `users` |
| Tasks | `tasks`, `taskTemplates`, `focusIds`, `pinnedTasks` | `tasks`, `task_templates` |
| Ideas | `ideas` | `ideas` |
| Departments / org | `departments` | `departments` |
| CRM | `crmContacts`, `crmCompanies`, `crmDeals`, `crmActivities`, `crmPipelines` | `companies`, `contacts`, `deals`, `activities`, `pipelines` |
| Drip marketing | `dripCampaigns`, `dripEnrolments` | `drip_campaigns`, `drip_enrolments` |
| WhatsApp module | `waConnection`, `waTemplates`, `waRules`, `waLogs` | `wa_connections`, `message_templates`, `reminder_rules`, `message_logs` |
| Intranet | `intranetSections`, `intranetContent`, `intranetAnnouncements`, `intranetQuickLinks` | `intranet_sections`, `intranet_content`, `announcements`, `quick_links` |
| Important Dates | `importantDates` | `important_dates` |
| Settings | `permissions`, `tzPrimary`, `tzAdditional`, `dashWidgets`, `role` | `workspace_settings` (single row) |

---

## 3. Database schema (Supabase / Postgres)

All tables get: `id uuid primary key default gen_random_uuid()`, `created_at timestamptz default now()`, `updated_at timestamptz`. Add `workspace_id uuid` to every table now (even single-tenant today) so multi-tenant is possible later without migration. Below, only the meaningful columns are listed.

### Core / org

**users**
- `name text not null`
- `email text`
- `whatsapp text`
- `role text` — admin | manager | member
- `dept_id uuid references departments(id)`
- `reports_to uuid references users(id)` — the reporting manager
- `status text` — active | inactive
- `app_access text[]` — which apps this user can open
- `color text`, `avatar_url text`

**departments**
- `name text not null`, `color text`

### CRM (the heart of the system)

**companies**
- `name text not null`
- `type text` — e.g. "Interior Design Studio"
- `city text`
- `notes text`

**contacts** *(a person; a "stakeholder" is just a contact with a company_id)*
- `name text not null`
- `whatsapp text not null` — **required** (front-end enforces name + WhatsApp)
- `email text`
- `company_id uuid references companies(id) on delete set null` — null = independent/freelancer
- `role text` — designation
- `pipeline_id uuid references pipelines(id)`
- `stage text` — current lifecycle stage id within that pipeline
- `tags text[]` — doubles as "interests"
- `city text`, `source text`, `notes text`

**pipelines** *(editable, multiple)*
- `name text not null`
- `stages jsonb` — array of `{ id, label, color, kind }` where kind ∈ entry|normal|won|dead
- `form jsonb` — optional capture-form definition (future public landing page)

**deals** *(sales pipeline; one per opportunity/project)*
- `title text not null`
- `contact_id uuid references contacts(id) on delete set null`
- `company_id uuid references companies(id) on delete set null`
- `stage text` — new | qualified | proposal | negotiation | won | lost
- `value numeric`
- `expected_close date`
- `owner_id uuid references users(id)`
- `notes text`

**activities** *(timeline log against a contact and/or deal)*
- `contact_id uuid references contacts(id) on delete cascade`
- `deal_id uuid references deals(id) on delete set null`
- `type text` — note | email | whatsapp | call | meeting
- `note text`
- `at date`
- `by_user_id uuid references users(id)`

> **Key relationships:** one company → many contacts (`contacts.company_id`); one contact → many deals (`deals.contact_id`); a deal also stores `company_id` so it survives a contact leaving. The "person left / replace" flow reassigns `deals.contact_id` to a successor while keeping `company_id`.

### Tasks

**tasks**
- `title text not null`, `description text`
- `type text`, `dept_id uuid`
- `assigned_by uuid references users(id)`
- `assigned_to uuid references users(id)`
- `manager_id uuid references users(id)` — approver/loop
- `priority text`, `status text`
- `due timestamptz`, `start_date date`, `end_date date`
- `focus boolean`, `focus_date date`
- `recurring boolean`, `estimate_minutes int`
- `channels jsonb` — `{ whatsapp, email, inApp }` per task
- `reminders jsonb`, `checklist jsonb`, `tags text[]`
- `watchers uuid[]`, `dependencies jsonb`, `comments jsonb`, `activity jsonb`

**task_templates**
- `name text`, `payload jsonb`

### Marketing / messaging

**message_templates**
- `name text not null`
- `use_case text`
- `body text` — with `{{variables}}`
- `status text` — draft | approved | active | inactive

**reminder_rules** *(trigger → condition → delay → action)*
- `name text not null`
- `trigger_type text` — proposal_sent | invoice_due | task_due | meeting_soon | project_stage | client_onboard
- `condition text`
- `delay_minutes int` — negative = before the event
- `recipient_type text` — lead | client | team | manager | admin | custom
- `template_id uuid references message_templates(id)`
- `active boolean`

**drip_campaigns**
- `name text not null`
- `channel text` — whatsapp | email
- `status text` — draft | active | paused
- `pipeline_id uuid references pipelines(id)`
- `audience jsonb` — `{ stages: [...], tags: [...] }`
- `steps jsonb` — ordered array of `{ type: send|wait|condition|stage|exit, ... }`

**drip_enrolments** *(a contact's position in a campaign — this is the "state")*
- `campaign_id uuid references drip_campaigns(id) on delete cascade`
- `contact_id uuid references contacts(id) on delete cascade`
- `step_index int`
- `status text` — active | completed | exited
- `last_opened boolean`, `last_clicked boolean`
- `enrolled_at date`
- `next_run_at timestamptz` — **the scheduler reads this** to know when to advance a waiting contact

**wa_connections** *(one row; the connected number)*
- `provider text` — cloud | wati | interakt | twilio
- `phone_number text`
- `phone_number_id text`, `waba_id text`
- `status text` — connected | disconnected | error
- `health text`
- `last_connected_at timestamptz`, `last_message_at timestamptz`
- `daily_limit int`, `sent_today int`
- **Secrets (`access_token`, `app_secret`, `webhook_verify_token`) do NOT go in this table.** Store them as backend environment variables / Supabase Vault, never returned to the front-end.

**message_logs**
- `recipient text`, `number text`
- `type text`, `related_module text`, `related_record_id uuid`
- `provider_message_id text`
- `status text` — queued | sent | delivered | read | failed
- `error text`
- `sent_by text`
- `sent_at / delivered_at / read_at / failed_at timestamptz`

### Knowledge / content

**intranet_sections**
- `name text`, `icon text`, `color text`, `description text`
- `parent_id uuid references intranet_sections(id)`
- `sort int`, `visibility text`, `status text`
- `ai_search boolean`, `comments boolean`, `versioning boolean`

**intranet_content**
- `section_id uuid references intranet_sections(id) on delete cascade`
- `title text`, `type text`, `status text`
- `excerpt text`, `body text` — markdown
- `tags text[]`, `author text`, `updated_at timestamptz`

**announcements**, **quick_links** — simple `{ title/label, body/url, at }`.

**important_dates**
- `name text`, `category text` — holiday|festival|observance|awareness|industry
- `start_date date`, `end_date date`
- `recurrence text`, `scope text`, `status text`
- `mode text`, `city text`, `country text`, `venue text` (events)
- `discipline_tags text[]`, `official_link text`, `notes text`, `approx boolean`

**workspace_settings** *(single row)*
- `name text`, `tz_primary text`, `tz_additional text[]`
- `permissions jsonb`, `dash_widgets jsonb`

---

## 4. The backend pieces to build

### 4.1 API endpoints (thin CRUD + actions)
- Standard REST for each table (`GET/POST/PATCH/DELETE /contacts`, etc.). Supabase auto-generates most of this via PostgREST — minimal code.
- **Action endpoints** (the logic that can't be plain CRUD):
  - `POST /wa/send-test` — send a test WhatsApp via the provider, write a `message_logs` row.
  - `POST /wa/send` — internal, used by the scheduler and drips.
  - `POST /webhooks/whatsapp` — **inbound** from the provider; updates `message_logs.status` (delivered/read) and sets `drip_enrolments.last_opened/last_clicked` to advance journeys.
  - `POST /webhooks/email` — same idea for email opens/clicks (Resend).

### 4.2 The scheduler (fires timed reminders + advances drips)
- A cron job (Supabase Edge Function on a schedule, or a worker on Render) that runs every few minutes:
  1. Find `tasks` whose reminder time is due and `channels.whatsapp = true` → call `/wa/send`.
  2. Find `drip_enrolments` where `next_run_at <= now()` and `status = active` → advance the step, send if it's a `send` step, set the next `next_run_at` for `wait` steps.
- This is what makes "2 hrs before" actually fire. Without it, nothing is automatic.

### 4.3 Secrets
- Provider access token, app secret, webhook verify token, email API key → **environment variables** (or Supabase Vault). Never in a table, never sent to the browser.

---

## 5. What YOU (non-technical) set up vs. the developer

**You can do (dashboard, no code):**
1. Create the Supabase project (pick Mumbai/Singapore region).
2. Sign up for **Interakt** or **WATI**, get the API key + test number.
3. Sign up for **Resend** (email), get the API key.
4. Create the tables — either via Supabase's visual Table Editor, or paste the SQL (generated from this schema) into the SQL Editor.

**Developer does (≈1–2 days):**
1. Deploy the backend (Edge Functions or a small Node service on Render).
2. Put the API keys into environment variables.
3. Wire the front-end's data calls to the API.
4. Build the 4 action endpoints + the scheduler.
5. Register the webhook URLs in the provider dashboard.

**AI (Claude Code / Codex) can generate:** the full SQL schema from §3, the CRUD layer, the action endpoints, and the scheduler code — which cuts the developer's time significantly.

---

## 6. Recommended build order

1. **Supabase project + tables** (you) — get the database standing.
2. **Migrate current data** — export the app's JSON backup, transform to table rows (one-time script the developer writes from this map).
3. **Read path first** — point the front-end at the API for reads, confirm data shows.
4. **Write path** — create/edit/delete through the API.
5. **WhatsApp send** — provider + `/wa/send-test`; test to your own phone.
6. **Webhooks** — delivery/read status + drip open/click advancing.
7. **Scheduler** — timed task reminders + drip waits firing automatically.

Steps 1–5 are enough for a **real client demo** (real send to a phone). Steps 6–7 make the automation fully autonomous.

---

## 7. Minimum viable demo (fastest real WhatsApp send)

If the only near-term goal is showing a client a real WhatsApp message from task delegation:
- Supabase (or even skip it initially — store the test in memory),
- **Interakt/WATI** account + key,
- one backend endpoint `/wa/send-test` deployed on Render,
- wire the app's existing **Send Test Message** button to call it.

That alone — roughly half a day for a developer — produces a real message on your phone in front of the client, using the UI you already have.
