# Vesure Creator Tracker

Next.js creator-tracking app with Supabase authentication and database integration.

## Run locally

Requirements: Node.js and npm.

```powershell
cd C:\WORKVESURE\vesure-creator-tracker
npm install
npm run dev
```

Open <http://localhost:3000>. Stop the server with `Ctrl+C`.

## Configure Supabase magic-link authentication

1. Create a Supabase project and copy its Project URL and anon/public key from **Project Settings → API**.
2. Copy `.env.example` to `.env.local` in the project root and set:

   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
   ```

   The legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY` variable is also supported.

3. In Supabase **Authentication → URL Configuration**, set the local Site URL to `http://localhost:3000` and add `http://localhost:3000/auth/callback` to the allowed redirect URLs. Add the matching deployed URL before deploying.
4. Enable the email provider and configure email delivery in Supabase.
5. Create/invite the people who should be allowed to access the system under **Authentication → Users**. The app requests magic links with account creation disabled; users must already exist.
6. Restart `npm run dev` after creating or changing `.env.local`.
7. Open `/login`, enter an existing user's email, and follow the email link on the same browser/device. The callback exchanges the link for a session and sends the user to `/dashboard`. Authenticated users visiting `/login` are also redirected to the dashboard; unauthenticated users are redirected to `/login`.

Do not expose a Supabase service-role key in a `NEXT_PUBLIC_` variable or in browser code. `.env.local` is ignored by Git.

## Database

Run `supabase/migrations/001_initial_schema.sql` in the Supabase SQL Editor to create the tables, access policies, indexes, and seed settings/products/templates. It does not create any creator records.

To turn scheduled reminders on after the initial schema is installed, complete these steps in order:

1. Run `supabase/migrations/002_scheduled_reminders.sql` in the Supabase SQL Editor. It adds the pending-message status and an idempotency table.
2. Install/use the Supabase CLI, log in, link your project, and deploy each Edge Function:

   ```powershell
   npx supabase login
   npx supabase link --project-ref YOUR_PROJECT_REF
   npx supabase functions deploy follow_up_7_days
   npx supabase functions deploy follow_up_30_days
   npx supabase functions deploy sample_reminder_day_3
   npx supabase functions deploy sample_reminder_day_7
   ```

3. In Supabase **Database → Vault**, add:
   - Name `creator_tracker_project_url`, value your Supabase Project URL.
   - Name `creator_tracker_service_role_key`, value your Supabase service-role secret key. Keep it in Vault only; never put it in `.env.local` with a `NEXT_PUBLIC_` prefix or commit it.
4. Run `supabase/migrations/003_schedule_reminders.sql` in the SQL Editor. It schedules each function daily at 02:00 UTC (10:00 MYT).

Each function queues a `pending_send` contact entry for eligible creators; it does not send WhatsApp messages. On a creator's contact timeline, copy the queued text, send it in WhatsApp yourself, then choose **Mark as sent** so the system records the contact and advances the follow-up status.

## Current application state

The app has dashboard, creator management, import, and settings screens. Magic-link authentication and route protection are implemented. Excel `.xlsx` and CSV import are supported. Scheduled reminders require the additional migrations, Edge Function deployment, and Vault setup described above.
