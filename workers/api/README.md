# MailForge Cloudflare API

This Worker is the first backend slice for MailForge. The existing Next.js dashboard is still hosted separately and currently contains mock data; this Worker does not switch the dashboard to live data yet.

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

The sender domain must already be marked `verified` in D1, and the recipient must not be suppressed. The API key must exist in the `api_keys` table with a SHA-256 hash of the complete key. A key-management endpoint and dashboard integration are not implemented yet.

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
