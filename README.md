# Noah & Eve Club Registration

Premium local registration app for Noah & Eve Club.

## Local Run

```powershell
npm run dev
```

Open:

```text
http://127.0.0.1:4180/
```

Or double-click `open-local.bat`.

## What Works Locally

- Full registration form from the brief
- Two-step customer journey with a centered registration panel
- Confirmation page after successful sign up
- Google Calendar, Outlook, and Apple/ICS calendar actions
- Auto-computed age
- Unique membership ID such as `NEC-2026-000001`
- Activation and one-year expiration date
- Duplicate active membership detection by email or mobile number
- Local JSON registration database at `data/registrations.json`
- Admin search and CSV export at `/admin.html`
- Automated welcome/team email trigger
- Email delivery failure does not cancel a saved registration
- Private backend/data folders blocked from direct browser access

Without real email credentials, the email trigger writes messages to:

```text
data/email-outbox.json
```

The local admin token defaults to:

```text
local-dev
```

For production email on Vercel, use either Resend or Google Apps Script:

```text
ADMIN_TOKEN=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
RESEND_API_KEY=
EMAIL_FROM=
TEAM_NOTIFY_EMAIL=
APPS_SCRIPT_EMAIL_WEBHOOK_URL=
APPS_SCRIPT_EMAIL_SECRET=
BOOKING_URL=
```

## Vercel Deployment

The project now includes Vercel API functions in `/api`, while the same logic
still runs locally through `npm run dev`.

1. Create a Supabase project.
2. Run the SQL in `database/supabase-schema.sql` inside Supabase SQL Editor.
3. Add the Vercel environment variables listed above.
4. Configure production email with either Resend or Google Apps Script.
5. Deploy the project folder to Vercel.

When `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are present, registrations
are stored in Supabase. Without those values, local development uses the JSON
files in `data/`.

## Google Apps Script Email

If you do not want Resend, create a Google Apps Script web app using
`tools/google-apps-script-email.gs`.

1. Replace `REPLACE_WITH_LONG_RANDOM_SECRET` with a private random string.
2. Deploy as a Web App.
3. Execute as: Me.
4. Who has access: Anyone.
5. Add the web app URL to Vercel as `APPS_SCRIPT_EMAIL_WEBHOOK_URL`.
6. Add the same private random string as `APPS_SCRIPT_EMAIL_SECRET`.
