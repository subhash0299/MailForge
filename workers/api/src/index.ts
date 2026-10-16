import { sendSmtpEmail, SmtpDeliveryError } from "./smtp";

export interface Env {
  DB: D1Database;
  MAIL_QUEUE: Queue<{ emailLogId: string }>;
  APP_ORIGIN: string;
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_SECURITY?: "tls" | "starttls";
  SMTP_USERNAME?: string;
  SMTP_PASSWORD?: string;
}

type ApiKeyRow = {
  id: string;
  workspace_id: string;
  key_type: "test" | "live";
};

type SendEmailInput = {
  from: string;
  to: string;
  subject: string;
  text?: string;
  html?: string;
  tags?: string[];
};

const json = (data: unknown, status = 200, headers: HeadersInit = {}) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });

function corsHeaders(request: Request, env: Env): HeadersInit {
  const origin = request.headers.get("Origin");
  const allowed = env.APP_ORIGIN.split(",").map((value) => value.trim()).filter(Boolean);
  const headers: Record<string, string> = {
    "access-control-allow-methods": "GET, POST, OPTIONS",
    "access-control-allow-headers": "Authorization, Content-Type, Idempotency-Key",
    "vary": "Origin",
  };
  if (origin && allowed.includes(origin)) headers["access-control-allow-origin"] = origin;
  return headers;
}

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

function validEmail(value: string): boolean {
  return value.length <= 320 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function emailDomain(value: string): string {
  return normalizeEmail(value).split("@")[1] ?? "";
}

async function sha256(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function authenticateApiKey(request: Request, env: Env): Promise<ApiKeyRow | null> {
  const authorization = request.headers.get("Authorization") ?? "";
  const match = authorization.match(/^Bearer\s+(mf_(?:live|test)_[a-z0-9]{40})$/);
  if (!match) return null;

  const keyHash = await sha256(match[1]);
  return env.DB.prepare(
    "SELECT id, workspace_id, key_type FROM api_keys WHERE key_hash = ? AND revoked = 0 LIMIT 1",
  ).bind(keyHash).first<ApiKeyRow>();
}

async function handleSendEmail(request: Request, env: Env): Promise<Response> {
  const apiKey = await authenticateApiKey(request, env);
  if (!apiKey) return json({ error: { code: "unauthorized", message: "A valid MailForge API key is required." } }, 401);

  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength > 1_000_000) {
    return json({ error: { code: "payload_too_large", message: "Request body must be smaller than 1 MB." } }, 413);
  }

  let input: SendEmailInput;
  try {
    input = await request.json() as SendEmailInput;
  } catch {
    return json({ error: { code: "invalid_json", message: "Request body must be valid JSON." } }, 400);
  }

  if (
    typeof input.from !== "string" ||
    typeof input.to !== "string" ||
    typeof input.subject !== "string" ||
    (!input.text && !input.html)
  ) {
    return json({
      error: {
        code: "invalid_request",
        message: "Required fields: from, to, subject, and at least one of text or html.",
      },
    }, 400);
  }

  const from = normalizeEmail(input.from);
  const to = normalizeEmail(input.to);
  if (!validEmail(from) || !validEmail(to)) {
    return json({ error: { code: "invalid_email", message: "The from and to fields must be valid email addresses." } }, 400);
  }
  if (input.subject.length > 998 || input.subject.trim().length === 0) {
    return json({ error: { code: "invalid_subject", message: "Subject must be non-empty and no longer than 998 characters." } }, 400);
  }
  if ((input.text?.length ?? 0) > 500_000 || (input.html?.length ?? 0) > 500_000) {
    return json({ error: { code: "content_too_large", message: "Email text and HTML must each be smaller than 500 KB." } }, 413);
  }
  if (input.tags && (!Array.isArray(input.tags) || input.tags.length > 20 || input.tags.some((tag) => typeof tag !== "string" || tag.length > 100))) {
    return json({ error: { code: "invalid_tags", message: "Tags must be an array of up to 20 strings, each no longer than 100 characters." } }, 400);
  }

  const domain = emailDomain(from);
  const verifiedDomain = await env.DB.prepare(
    "SELECT id FROM sending_domains WHERE workspace_id = ? AND domain = ? COLLATE NOCASE AND status = 'verified' LIMIT 1",
  ).bind(apiKey.workspace_id, domain).first<{ id: string }>();

  if (!verifiedDomain) {
    return json({
      error: {
        code: "domain_not_verified",
        message: "Verify the sender domain in your MailForge dashboard before sending.",
      },
    }, 403);
  }

  const suppressed = await env.DB.prepare(
    "SELECT id FROM suppressions WHERE workspace_id = ? AND email = ? COLLATE NOCASE LIMIT 1",
  ).bind(apiKey.workspace_id, to).first<{ id: string }>();
  if (suppressed) {
    return json({ error: { code: "recipient_suppressed", message: "This recipient is on the workspace suppression list." } }, 422);
  }

  const idempotencyKey = request.headers.get("Idempotency-Key")?.trim() || null;
  if (idempotencyKey && idempotencyKey.length > 200) {
    return json({ error: { code: "invalid_idempotency_key", message: "Idempotency-Key must be 200 characters or fewer." } }, 400);
  }
  if (idempotencyKey) {
    const existing = await env.DB.prepare(
      "SELECT id, status FROM email_logs WHERE workspace_id = ? AND idempotency_key = ? LIMIT 1",
    ).bind(apiKey.workspace_id, idempotencyKey).first<{ id: string; status: string }>();
    if (existing) return json({ id: existing.id, status: existing.status, idempotent: true }, 202);
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const insert = await env.DB.prepare(
    `INSERT INTO email_logs
      (id, workspace_id, api_key_id, idempotency_key, recipient, sender, subject, text_body, html_body, status, domain, tags_json, submitted_at, last_updated)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'queued', ?, ?, ?, ?)`,
  ).bind(
    id,
    apiKey.workspace_id,
    apiKey.id,
    idempotencyKey,
    to,
    from,
    input.subject,
    input.text ?? null,
    input.html ?? null,
    domain,
    JSON.stringify(input.tags ?? []),
    now,
    now,
  ).run();

  if (!insert.success) {
    if (idempotencyKey) {
      const existing = await env.DB.prepare(
        "SELECT id, status FROM email_logs WHERE workspace_id = ? AND idempotency_key = ? LIMIT 1",
      ).bind(apiKey.workspace_id, idempotencyKey).first<{ id: string; status: string }>();
      if (existing) return json({ id: existing.id, status: existing.status, idempotent: true }, 202);
    }
    return json({ error: { code: "database_error", message: "Could not create the email record." } }, 500);
  }

  await env.DB.batch([
    env.DB.prepare("UPDATE api_keys SET last_used_at = ? WHERE id = ?").bind(now, apiKey.id),
    env.DB.prepare("INSERT INTO email_events (id, email_log_id, event_type, description, created_at) VALUES (?, ?, 'email.queued', 'Message accepted by the MailForge API', ?)")
      .bind(crypto.randomUUID(), id, now),
  ]);

  try {
    await env.MAIL_QUEUE.send({ emailLogId: id });
  } catch {
    await env.DB.prepare("UPDATE email_logs SET status = 'failed', error_details = 'Could not enqueue delivery job', last_updated = ? WHERE id = ?")
      .bind(new Date().toISOString(), id).run();
    return json({ error: { code: "queue_unavailable", message: "The email could not be queued. Retry with the same Idempotency-Key." } }, 503);
  }

  return json({ id, status: "queued" }, 202);
}

async function consumeMailQueue(batch: MessageBatch<{ emailLogId: string }>, env: Env): Promise<void> {
  for (const message of batch.messages) {
    const { emailLogId } = message.body;
    const email = await env.DB.prepare(
      "SELECT id, recipient, sender, subject, text_body, html_body, workspace_id FROM email_logs WHERE id = ? LIMIT 1",
    ).bind(emailLogId).first<{
      id: string; recipient: string; sender: string; subject: string;
      text_body: string | null; html_body: string | null; workspace_id: string;
    }>();

    if (!email) {
      message.ack();
      continue;
    }

    if (!env.SMTP_HOST || !env.SMTP_USERNAME || !env.SMTP_PASSWORD) {
      await env.DB.prepare("UPDATE email_logs SET status = 'failed', error_details = 'SMTP is not configured', last_updated = ? WHERE id = ?")
        .bind(new Date().toISOString(), email.id).run();
      message.ack();
      continue;
    }

    const started = Date.now();
    await env.DB.prepare("UPDATE email_logs SET status = 'processing', last_updated = ? WHERE id = ?")
      .bind(new Date().toISOString(), email.id).run();

    try {
      const result = await sendSmtpEmail(env, {
        from: email.sender,
        to: email.recipient,
        subject: email.subject,
        text: email.text_body,
        html: email.html_body,
      });
      const finished = new Date().toISOString();
      const attemptNumber = await env.DB.prepare(
        "SELECT COUNT(*) AS count FROM delivery_attempts WHERE email_log_id = ?",
      ).bind(email.id).first<{ count: number }>();
      const nextAttempt = (attemptNumber?.count ?? 0) + 1;
      await env.DB.batch([
        env.DB.prepare("INSERT INTO delivery_attempts (id, email_log_id, attempt_number, status, response_code, response_text, duration_ms, created_at) VALUES (?, ?, ?, 'accepted', ?, ?, ?, ?)")
          .bind(crypto.randomUUID(), email.id, nextAttempt, result.code, result.text.slice(0, 2000), Date.now() - started, finished),
        env.DB.prepare("UPDATE email_logs SET status = 'accepted', smtp_code = ?, smtp_response = ?, error_details = NULL, last_updated = ? WHERE id = ?")
          .bind(result.code, result.text.slice(0, 2000), finished, email.id),
        env.DB.prepare("INSERT INTO email_events (id, email_log_id, event_type, description, created_at) VALUES (?, ?, 'email.accepted', 'Accepted by configured SMTP server', ?)")
          .bind(crypto.randomUUID(), email.id, finished),
      ]);
      message.ack();
    } catch (error) {
      const smtpError = error instanceof SmtpDeliveryError ? error : null;
      const finished = new Date().toISOString();
      const responseText = (smtpError?.message ?? "SMTP connection failed").slice(0, 2000);
      const statusCode = smtpError?.code ?? 0;
      const retryable = smtpError?.retryable ?? true;
      const attemptNumber = await env.DB.prepare(
        "SELECT COUNT(*) AS count FROM delivery_attempts WHERE email_log_id = ?",
      ).bind(email.id).first<{ count: number }>();
      const nextAttempt = (attemptNumber?.count ?? 0) + 1;
      await env.DB.batch([
        env.DB.prepare("INSERT INTO delivery_attempts (id, email_log_id, attempt_number, status, response_code, response_text, duration_ms, created_at) VALUES (?, ?, ?, 'failed', ?, ?, ?, ?)")
          .bind(crypto.randomUUID(), email.id, nextAttempt, statusCode, responseText, Date.now() - started, finished),
        env.DB.prepare("UPDATE email_logs SET status = ?, smtp_code = ?, smtp_response = ?, error_details = ?, last_updated = ? WHERE id = ?")
          .bind(retryable ? "deferred" : "failed", statusCode, responseText, responseText, finished, email.id),
        env.DB.prepare("INSERT INTO email_events (id, email_log_id, event_type, description, created_at) VALUES (?, ?, ?, ?, ?)")
          .bind(crypto.randomUUID(), email.id, retryable ? "email.deferred" : "email.failed", retryable ? "Temporary SMTP failure; retry scheduled" : "SMTP server rejected the message", finished),
      ]);
      if (retryable) message.retry();
      else message.ack();
    }
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ service: "mailforge-api", status: "ok" }, 200, cors);
    }

    if (request.method === "POST" && url.pathname === "/v1/emails") {
      const response = await handleSendEmail(request, env);
      const headers = new Headers(response.headers);
      new Headers(cors).forEach((value, key) => headers.set(key, value));
      return new Response(response.body, { status: response.status, headers });
    }

    return json({ error: { code: "not_found", message: "Route not found." } }, 404, cors);
  },

  async queue(batch: MessageBatch<{ emailLogId: string }>, env: Env): Promise<void> {
    await consumeMailQueue(batch, env);
  },
} satisfies ExportedHandler<Env, { emailLogId: string }>;
