# MailForge Cloudflare API

This Worker powers MailForge's authenticated dashboard and email delivery API. The Next.js app proxies browser requests through a same-origin route to keep session cookies first-party.

## Cloudflare resources

- D1 database: `mailforge`
- Queue: `mailforge-delivery`
- Dead-letter queue: `mailforge-delivery-dlq`

## Deploying

From this directory, run:

```bash
npm install
npx wrangler login
npx wrangler d1 migrations list mailforge --remote
npx wrangler d1 migrations apply mailforge --remote
npx wrangler deploy
```

The production D1 database ID is already configured in `wrangler.toml`. Confirm it matches your Cloudflare dashboard. Apply migrations only when Wrangler lists pending migrations.

## SMTP configuration

MailForge sends email directly through an SMTP server using Cloudflare Workers TCP sockets. Use an SMTP submission endpoint on port **587 with STARTTLS** or **465 with implicit TLS**. Cloudflare Workers cannot connect to SMTP port 25.

Set the following as encrypted Worker secrets. Wrangler prompts for each value; do not put real credentials in source code, `wrangler.toml`, GitHub, or chat.

```powershell
npx wrangler secret put SMTP_HOST
npx wrangler secret put SMTP_PORT
npx wrangler secret put SMTP_SECURITY
npx wrangler secret put SMTP_USERNAME
npx wrangler secret put SMTP_PASSWORD
npx wrangler secret put REGISTRATION_ENABLED
```

Use these values for a typical submission server:

- `SMTP_HOST`: the SMTP provider's submission hostname (not an email address)
- `SMTP_PORT`: `587` for STARTTLS or `465` for implicit TLS
- `SMTP_SECURITY`: `starttls` for port 587, or `tls` for port 465
- `SMTP_USERNAME`: the SMTP username provided by your email service
- `SMTP_PASSWORD`: the SMTP password or provider-issued SMTP credential

Only enter the actual values from your chosen SMTP provider. Do not guess the hostname or use your normal mailbox password unless your provider explicitly instructs you to.

After adding the secrets, deploy the latest backend branch:

```powershell
npx wrangler deploy
```

Adding a secret with `wrangler secret put` itself creates and deploys a new Worker version. You can check secret names (not their values) with `npx wrangler secret list`.

## SMTP connection test

The token-protected `POST /internal/smtp-test` endpoint sends one real test email using the configured SMTP credentials. Enable it by setting the encrypted `SMTP_TEST_TOKEN` secret to a long random value. The endpoint uses `SMTP_USERNAME` as the sender address, which should match the Maileroo SMTP account's sender alias. Send only to an address you control.

Example request:

```powershell
$headers = @{ Authorization = "Bearer $env:SMTP_TEST_TOKEN"; "Content-Type" = "application/json" }
$body = @{ to = "you@example.com"; subject = "MailForge SMTP test" } | ConvertTo-Json
Invoke-RestMethod -Method Post -Uri "https://mailforge-api.mailforge.workers.dev/internal/smtp-test" -Headers $headers -Body $body
```

Keep the token secret. A successful response means the configured SMTP server accepted the message, not that it reached the inbox.

## Current API

- `GET /health`: health check.
- `POST /v1/emails`: queues an email using a MailForge API key in `Authorization: Bearer mf_test_...` or `Authorization: Bearer mf_live_...`. Supports `Idempotency-Key`.

Example body:

```json
{
  "from": "alerts@your-verified-domain.com",
  "to": "recipient@example.com",
  "subject": "Test message",
  "text": "Hello from MailForge",
  "html": "<p>Hello from MailForge</p>"
}
```

The sender domain must be marked `verified` in D1, and the recipient must not be suppressed. For initial Maileroo testing only, the exact address configured in `SMTP_USERNAME` is also allowed as the sender. Do not treat this provider sender exception as a multi-tenant production domain-verification system.

## Dashboard authentication and APIs

Account registration is disabled unless the encrypted Worker secret `REGISTRATION_ENABLED` is set to `true`. Enable it only while creating the first owner account, then set it back to `false` (or remove the secret) before exposing the dashboard publicly. Sign-in remains available when registration is disabled.

The dashboard uses a same-origin Next.js proxy at `/api/mailforge/*`; the proxy forwards to `MAILFORGE_API_URL` (must be set to the intended Worker URL). Set `MAILFORGE_API_URL` in Vercel if you deploy the Worker at a different URL.

- `POST /v1/auth/register`: create an account and workspace. Passwords are PBKDF2-SHA-256 hashed; sessions are random, stored as hashes, and returned as Secure, HttpOnly cookies.
- `POST /v1/auth/login`, `POST /v1/auth/logout`, `GET /v1/auth/me`: session management.
- `GET /v1/api-keys`, `POST /v1/api-keys`, `DELETE /v1/api-keys/:id`: create/list/revoke workspace API keys. Full secrets are returned only at creation.
- `GET /v1/overview`: live workspace counters, domain counts, and recent email activity.
- `GET /v1/emails`: workspace-scoped email logs with `limit`, `offset`, `status`, and `search` filters.
- `GET /v1/emails/:id`: workspace-scoped message details, delivery attempts, and event history.
- `GET /v1/domains`: list configured sending domains.

The overview, API-key, and email-activity dashboard pages now use live API data. Domain management, suppressions, webhooks, and some usage/settings screens still need live integration. Account email verification, password reset, strong abuse/rate controls, and customer-managed DNS verification are not implemented yet; do not open public self-registration for unrestricted production traffic until these controls are added.

## SMTP delivery behavior

The queue consumer connects to the configured SMTP submission host, negotiates TLS, authenticates using SMTP AUTH PLAIN, submits the message, and records the SMTP response and attempt in D1. A successful SMTP `250` after DATA means the SMTP server accepted the message; it does **not** guarantee final mailbox delivery. Provider-specific bounce, complaint, and delivery webhooks are not implemented yet.

Transient SMTP 4xx errors and connection errors are retried by the queue; permanent 5xx SMTP rejections are recorded as failed. Configure your SMTP provider to authorize the sender domain and sender address before testing. Some providers require the sender domain to be verified with SPF and DKIM.

## Production checklist

- Implement account sign-in, secure sessions, workspace creation, and membership checks.
- Add a secure API-key creation/revocation flow; display each secret only once.
- Implement DNS verification for sending domains; never mark domains verified based on client input.
- Add provider webhook verification for delivered, bounced, deferred, and complaint events.
- Add quotas, per-key rate limits, abuse controls, retention policies, and monitoring.
- Connect dashboard pages to authenticated APIs and remove mock data.
- Test migrations and delivery in a staging Cloudflare account before production.
