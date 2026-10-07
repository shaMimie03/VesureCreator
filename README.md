# Vesure Creator Tracker

Vesure Creator Tracker is a Next.js application for managing TikTok creator
relationships. It uses Supabase for authentication and PostgreSQL data storage,
and provides creator imports, outreach tracking, product and message-template
management, dashboard summaries, and optional scheduled reminder queues.

## Contents

- [Technology](#technology)
- [Features](#features)
- [Run locally](#run-locally)
- [Configure Supabase](#configure-supabase)
- [Database setup](#database-setup)
- [Import creator data](#import-creator-data)
- [Scheduled reminders](#scheduled-reminders)
- [Security and private configuration](#security-and-private-configuration)
- [Validation](#validation)
- [Project layout](#project-layout)

## Technology

- Next.js 16 with React 19 and TypeScript
- Supabase Auth, PostgreSQL, Row Level Security, and Edge Functions
- Tailwind CSS
- Papa Parse for CSV files and `read-excel-file` for Excel workbooks
- Zod for server-action input validation

## Features

- Email magic-link authentication for existing Supabase users
- Searchable, filterable, sortable, paginated creator list
- Creator profile editing, product and PIC assignment, and activity history
- CSV and `.xlsx` creator import with handle normalization and duplicate checks
- Manual WhatsApp message preparation and contact logging
- Dashboard totals, status/category summaries, and follow-up indicators
- Product, template, brand, commission, and follow-up settings management
- Optional scheduled reminders that queue messages for manual sending

## Run locally

### Prerequisites

- Node.js 20.9 or later
- npm
- A Supabase project configured as described below

From the repository root:

```powershell
npm ci
Copy-Item .env.example .env.local
npm run dev
```

Open <http://localhost:3000>. Stop the development server with `Ctrl+C`.
Restart it after changing `.env.local`.

## Configure Supabase

### Application environment

Set the following values in your local, untracked `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

The legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` is also supported instead of the
publishable-key variable. Use values from your own Supabase project; never
replace the placeholders in `.env.example` with real credentials.

### Authentication

1. In Supabase **Authentication → URL Configuration**, set the local Site URL
   to `http://localhost:3000`.
2. Add `http://localhost:3000/auth/callback` to the allowed redirect URLs.
   Add the corresponding callback URL for each deployed application origin.
3. Enable the email provider, password sign-in, and email delivery in Supabase.
4. Invite approved users through **Authentication → Users → Add user**. Do not
   enable public self-sign-up: every authenticated account can access the
   shared creator workspace under the current row-level security policies.
5. Existing invited users can sign in with a password. They can choose
   **Forgot password?** to set or recover one, or use email-link sign-in as a
   fallback. New invitees should accept their Supabase invitation before
   signing in.

Unauthenticated users are redirected to `/login`; signed-in users are directed
to `/dashboard`. The login screen does not create unapproved accounts.

## Database setup

Run the SQL files in the Supabase SQL Editor in sequence:

1. [`supabase/migrations/001_initial_schema.sql`](./supabase/migrations/001_initial_schema.sql)
   creates the core tables, indexes, RLS policies, and starter products,
   templates, and settings. It does not insert creator records.
2. [`supabase/migrations/002_scheduled_reminders.sql`](./supabase/migrations/002_scheduled_reminders.sql)
   adds the pending-send state, scheduled-run deduplication table, and update
   triggers needed by scheduled reminders.
3. [`supabase/migrations/003_schedule_reminders.sql`](./supabase/migrations/003_schedule_reminders.sql)
   installs the daily cron jobs. Only run this after deploying the Edge
   Functions and adding the required Vault secrets described below.

Migration 001 is an initial provisioning script, not a data-reset tool. Do not
run it again on a project where it has already been applied; it can conflict
with existing policies and triggers. Later migrations add features to the
existing schema and include guards for supported repeat operations. Always
review SQL changes and back up production data before modifying a live
database.

## Import creator data

Open **Import** in the application and select a CSV or Excel `.xlsx` file. The
Excel importer reads the first worksheet. The first row must contain column
headings; recognized fields include:

| Stored field | Accepted headings |
| --- | --- |
| Creator name | `Creator Name`, `Name`, `Creator` |
| TikTok handle | `Handle`, `TikTok`, `TikTok Handle` |
| WhatsApp number | `WhatsApp`, `Phone`, `WhatsApp Number` |
| Email | `Email`, `Email Address` |
| Category | `Category` |
| Followers | `Followers`, `Follower Count` |
| Engagement rate | `Engagement`, `Engagement Rate` |
| Source | `Source` |
| Status | `Status` |
| PIC | `PIC`, `Owner` |
| Notes | `Notes` |

Creator name and TikTok handle are required. Handles are normalized before
checking for duplicates. Rows with duplicate handles already in the file or
database are skipped and reported; import does not overwrite existing creator
records. Unrecognized columns (for example, revenue or growth metrics) are not
stored.

For CSV files, export as **CSV UTF-8** from your spreadsheet application.

## Scheduled reminders

Scheduled reminders are optional. They **do not send WhatsApp messages**.
They create pending entries in a creator's contact timeline; a team member
copies the message, sends it through WhatsApp manually, and marks it as sent
in the app. The contact timestamp and follow-up status are then updated.

To enable them:

1. Apply migration 002.
2. Install the Supabase CLI, authenticate, and link this local project to your
   Supabase project:

   ```powershell
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   ```

3. Deploy each function:

   ```powershell
   npx supabase functions deploy follow_up_7_days
   npx supabase functions deploy follow_up_30_days
   npx supabase functions deploy sample_reminder_day_3
   npx supabase functions deploy sample_reminder_day_7
   ```

4. In Supabase **Database → Vault**, add these secrets using values from your
   own project:
   - `creator_tracker_project_url`: the Supabase project URL.
   - `creator_tracker_service_role_key`: the Supabase service-role secret.
5. Apply migration 003. It schedules the four jobs daily at 02:00 UTC
   (10:00 Malaysia time).

The reminder processor uses the follow-up intervals in Settings and requires
active WhatsApp templates of the matching type whose names identify day 7,
day 30, day 3, or day 7 as appropriate. Check the Supabase Edge Function and
cron logs if reminders are not appearing.

## Security and private configuration

- `.env.local` and other `.env*` files are ignored by Git. Only the
  placeholder-only `.env.example` is intended to be tracked.
- Never commit, paste into source files, or expose a service-role key through
  a `NEXT_PUBLIC_` variable. Store the reminder service-role secret in Supabase
  Vault only.
- The publishable/anon key is used by the browser client. It is not a
  substitute for Row Level Security; keep RLS enabled and review policies
  whenever access requirements change.
- The initial schema grants full row access to authenticated Supabase users.
  Invite only people who are authorized to view and update this project's
  creator data.
- Supabase CLI state under `supabase/.temp/` is local and ignored by Git.
- Before pushing, check `git status` and confirm that `.env.local`, exports,
  and other private data files are not staged.

## Validation

Run the production build and lint checks before publishing changes:

```powershell
npm run build
npm run lint
```

## Project layout

```text
app/                         Next.js pages and authentication callback
components/                  Application UI, creator and settings workflows
lib/actions/                 Validated server actions for database mutations
lib/creators/                Shared creator constants and validation values
lib/supabase/                Supabase browser/server clients and auth proxy
lib/data.ts                  Supabase-backed read/query helpers
supabase/functions/          Scheduled reminder Edge Functions
supabase/migrations/         SQL schema and scheduled-job migrations
types/db.ts                  Shared application database types
```

## Deployment notes

Deploy the Next.js application to your chosen hosting provider and configure
its environment variables in that provider's private settings. Configure the
production URL and `/auth/callback` under Supabase Authentication redirect
settings. Deploy the Supabase migrations and Edge Functions separately; a
successful application deployment does not automatically apply database
migrations or enable scheduled reminders.
