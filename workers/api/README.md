# MailForge Cloudflare API

This Worker is the first backend slice for MailForge. The existing Next.js dashboard is still hosted separately and currently contains mock data; this Worker does not switch the dashboard to live data yet.

## Cloudflare resources

Create these resources in the same Cloudflare account:
- D1 database: `mailforge`
- Queue: `mailforge-delivery`
- Dead-letter queue: `mailforge-delivery-dlq`

From this directory, run:

```bash
npx wrangler login
npx wrangler d1 create mailforge
```

The production D1 database ID is already configured in `wrangler.toml`. Confirm the ID matches your Cloudflare dashboard before continuing. Then create the queues if they do not already exist and apply the schema:

```bash
npx wrangler queues create mailforge-delivery
npx wrangler queues create mailforge-delivery-dlq
npx wrangler d1 migrations list mailforge --remote
npx wrangler d1 migrations apply mailforge --remote
```

Deploy the Worker:

```bash
npx wrangler deploy
```

## Worker configuration and secrets

`wrangler.toml` is preconfigured for the production dashboard origin `https://mailforge.vercel.app`. Set `APP_ORIGIN` to the origin only (no `/dashboard` path), because CORS compares the browser `Origin` header. For local development, temporarily use `http://localhost:3000` and restore the production value before deploying.

Email sending intentionally requires a configured provider adapter. Set these as Worker secrets only after choosing a provider whose API accepts the JSON payload used in `src/index.ts`:

```bash
npx wrangler secret put DELIVERY_PROVIDER_URL
npx wrangler secret put DELIVERY_PROVIDER_TOKEN
```

Do not commit provider credentials, Cloudflare API tokens, or database credentials to GitHub. Use `wrangler login` for local deployment; a Cloudflare API token is only needed for automated CI/CD, and should be narrowly scoped to this project.

## Current API

- `GET /health`: health check.
- `POST /v1/emails`: submits one email using a MailForge API key in `Authorization: Bearer mf_test_...` or `mf_live_...`. Supports `Idempotency-Key`.

Example body:

```json
{
  "from": "alerts@your-verified-domain.com",
  "to": "recipient@example.com",
  "subject": "Test message",
  "text": "Hello from MailForge"
}
```

The sender domain must already be marked `verified` in D1, and the recipient must not be suppressed. The API key must exist in the `api_keys` table with a SHA-256 hash of the complete key. A key-management endpoint and dashboard integration are not implemented yet.

## Delivery-provider contract

The consumer POSTs `{ from, to, subject, text, html, metadata }` to `DELIVERY_PROVIDER_URL` with a Bearer token. A 2xx response means the provider accepted the message; this does **not** mean the recipient mailbox has received it. A provider-specific adapter and signed bounce/delivery event ingestion are still needed before production.

## Production checklist

- Implement account sign-in, secure sessions, workspace creation, and membership checks.
- Add a secure API-key creation/revocation flow; display each secret only once.
- Implement DNS verification for sending domains; never mark domains verified based on client input.
- Choose and test the delivery provider and adapt its request/response format.
- Add provider webhook verification for delivered, bounced, deferred, and complaint events.
- Add quotas, per-key rate limits, abuse controls, retention policies, and monitoring.
- Connect dashboard pages to authenticated APIs and remove mock data.
- Test migrations and delivery in a staging Cloudflare account before production.
