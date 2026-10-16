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
  SMTP_TEST_TOKEN?: string;
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
    "access-control-allow-credentials": "true",
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

async function handleSmtpTest(request: Request, env: Env): Promise<Response> {
  if (!env.SMTP_TEST_TOKEN) {
    return json({ error: { code: "not_configured", message: "SMTP test endpoint is disabled until SMTP_TEST_TOKEN is configured." } }, 404);
  }

  const authorization = request.headers.get("Authorization") ?? "";
  if (authorization !== `Bearer ${env.SMTP_TEST_TOKEN}`) {
    return json({ error: { code: "unauthorized", message: "A valid SMTP test token is required." } }, 401);
  }

  if (!env.SMTP_HOST || !env.SMTP_USERNAME || !env.SMTP_PASSWORD) {
    return json({ error: { code: "smtp_not_configured", message: "SMTP credentials are not fully configured." } }, 503);
  }

  let input: { to?: unknown; subject?: unknown };
  try {
    input = await request.json() as { to?: unknown; subject?: unknown };
  } catch {
    return json({ error: { code: "invalid_json", message: "Request body must be valid JSON." } }, 400);
  }

  if (typeof input.to !== "string" || !validEmail(input.to)) {
    return json({ error: { code: "invalid_recipient", message: "Provide a valid recipient email in the to field." } }, 400);
  }

  const from = normalizeEmail(env.SMTP_USERNAME);
  const subject = typeof input.subject === "string" && input.subject.trim()
    ? input.subject.trim().slice(0, 200)
    : "MailForge SMTP connection test";

  try {
    const result = await sendSmtpEmail(env, {
      from,
      to: normalizeEmail(input.to),
      subject,
      text: "This is a test message sent by MailForge to verify the configured SMTP connection.",
      html: null,
    });
    return json({
      status: "accepted_by_smtp",
      from,
      to: normalizeEmail(input.to),
      smtpCode: result.code,
      message: "The SMTP server accepted the test message. This does not guarantee inbox delivery.",
    }, 200);
  } catch (error) {
    const smtpError = error instanceof SmtpDeliveryError ? error : null;
    return json({
      error: {
        code: "smtp_test_failed",
        message: (smtpError?.message ?? "SMTP test failed").slice(0, 500),
        smtpCode: smtpError?.code ?? 0,
        retryable: smtpError?.retryable ?? true,
      },
    }, 502);
  }
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

  if (!input || typeof input !== "object") {
    return json({ error: { code: "invalid_request", message: "Request body must be a JSON object." } }, 400);
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

  // Until customer-managed DNS verification is available, permit only the exact
  // sender identity configured for this SMTP account. Never permit arbitrary
  // addresses on the provider domain.
  const providerSender = env.SMTP_USERNAME ? normalizeEmail(env.SMTP_USERNAME) : "";
  if (!verifiedDomain && from !== providerSender) {
    return json({
      error: {
        code: "domain_not_verified",
        message: "Verify the sender domain in your MailForge dashboard before sending. The configured provider sender is allowed for initial testing.",
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
      if (retryable && message.attempts < 5) {
        message.retry();
      } else {
        if (retryable) {
          const exhaustedAt = new Date().toISOString();
          await env.DB.batch([
            env.DB.prepare("UPDATE email_logs SET status = 'failed', error_details = ?, last_updated = ? WHERE id = ?")
              .bind("Delivery retries exhausted; message sent to dead-letter queue", exhaustedAt, email.id),
            env.DB.prepare("INSERT INTO email_events (id, email_log_id, event_type, description, created_at) VALUES (?, ?, 'email.failed', 'Delivery retries exhausted', ?)")
              .bind(crypto.randomUUID(), email.id, exhaustedAt),
          ]);
        }
        message.ack();
      }
    }
  }
}



type DashboardSession = {
  user_id: string;
  email: string;
  workspace_id: string;
  workspace_name: string;
};

function base64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomToken(bytes = 32): string {
  return base64Url(crypto.getRandomValues(new Uint8Array(bytes)));
}

async function passwordHash(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: 210000 }, material, 256);
  const digest = base64Url(new Uint8Array(bits));
  return \`pbkdf2-sha256$210000$\${btoa(String.fromCharCode(...salt))}$\${digest}\`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, iterations, salt, expected] = stored.split("$");
  if (scheme !== "pbkdf2-sha256" || Number(iterations) !== 210000 || !salt || !expected) return false;
  const saltBytes = Uint8Array.from(atob(salt), (c) => c.charCodeAt(0));
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt: saltBytes, iterations: 210000 }, material, 256);
  return base64Url(new Uint8Array(bits)) === expected;
}

function cookieValue(request: Request, name: string): string | null {
  const cookie = request.headers.get("Cookie") ?? "";
  const match = cookie.match(new RegExp(\`(?:^|;\\\\s*)\${name}=([^;]+)\`));
  return match ? decodeURIComponent(match[1]) : null;
}

async function createSession(env: Env, userId: string): Promise<{ token: string; expiresAt: string }> {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  await env.DB.prepare("INSERT INTO sessions (id, user_id, token_hash, expires_at) VALUES (?, ?, ?, ?)")
    .bind(crypto.randomUUID(), userId, await sha256(token), expiresAt).run();
  return { token, expiresAt };
}

async function getDashboardSession(request: Request, env: Env): Promise<DashboardSession | null> {
  const token = cookieValue(request, "mf_session");
  if (!token) return null;
  return env.DB.prepare(
    \`SELECT u.id AS user_id, u.email, w.id AS workspace_id, w.name AS workspace_name
     FROM sessions s
     JOIN users u ON u.id = s.user_id
     JOIN workspace_members wm ON wm.user_id = u.id
     JOIN workspaces w ON w.id = wm.workspace_id
     WHERE s.token_hash = ? AND s.expires_at > ?
     ORDER BY CASE wm.role WHEN 'owner' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END
     LIMIT 1\`,
  ).bind(await sha256(token), new Date().toISOString()).first<DashboardSession>();
}

function sessionCookie(token: string, maxAge: number): string {
  return \`mf_session=\${encodeURIComponent(token)}; Path=/; HttpOnly; Secure; SameSite=None; Max-Age=\${maxAge}\`;
}

function apiKeySecret(type: "test" | "live"): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = crypto.getRandomValues(new Uint8Array(40));
  let value = "";
  for (const byte of bytes) value += chars[byte % chars.length];
  return \`mf_\${type}_\${value}\`;
}

async function handleDashboardApi(request: Request, env: Env): Promise<Response | null> {
  const url = new URL(request.url);
  const path = url.pathname;
  const method = request.method;

  if (method === "POST" && path === "/v1/auth/register") {
    let body: { email?: unknown; password?: unknown; workspaceName?: unknown };
    try { body = await request.json() as typeof body; } catch {
      return json({ error: { code: "invalid_json", message: "Request body must be valid JSON." } }, 400);
    }
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const password = typeof body.password === "string" ? body.password : "";
    const workspaceName = typeof body.workspaceName === "string" && body.workspaceName.trim()
      ? body.workspaceName.trim().slice(0, 80) : "My Workspace";
    if (!validEmail(email)) return json({ error: { code: "invalid_email", message: "Enter a valid email address." } }, 400);
    if (password.length < 12 || password.length > 200) {
      return json({ error: { code: "weak_password", message: "Password must be between 12 and 200 characters." } }, 400);
    }
    const exists = await env.DB.prepare("SELECT id FROM users WHERE email = ? COLLATE NOCASE LIMIT 1").bind(email).first<{ id: string }>();
    if (exists) return json({ error: { code: "email_exists", message: "An account already exists for this email." } }, 409);

    const userId = crypto.randomUUID();
    const workspaceId = crypto.randomUUID();
    const now = new Date().toISOString();
    const hash = await passwordHash(password);
    try {
      await env.DB.batch([
        env.DB.prepare("INSERT INTO users (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)").bind(userId, email, hash, now),
        env.DB.prepare("INSERT INTO workspaces (id, name, owner_id, created_at) VALUES (?, ?, ?, ?)").bind(workspaceId, workspaceName, userId, now),
        env.DB.prepare("INSERT INTO workspace_members (workspace_id, user_id, role, created_at) VALUES (?, ?, 'owner', ?)").bind(workspaceId, userId, now),
      ]);
      const session = await createSession(env, userId);
      return json({ user: { id: userId, email }, workspace: { id: workspaceId, name: workspaceName } }, 201, {
        "set-cookie": sessionCookie(session.token, 30 * 24 * 60 * 60),
        "cache-control": "no-store",
      });
    } catch {
      return json({ error: { code: "registration_failed", message: "Could not create the account. Please retry." } }, 500);
    }
  }

  if (method === "POST" && path === "/v1/auth/login") {
    let body: { email?: unknown; password?: unknown };
    try { body = await request.json() as typeof body; } catch {
      return json({ error: { code: "invalid_json", message: "Request body must be valid JSON." } }, 400);
    }
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const password = typeof body.password === "string" ? body.password : "";
    const user = await env.DB.prepare("SELECT id, email, password_hash FROM users WHERE email = ? COLLATE NOCASE LIMIT 1")
      .bind(email).first<{ id: string; email: string; password_hash: string | null }>();
    if (!user?.password_hash || !await verifyPassword(password, user.password_hash)) {
      return json({ error: { code: "invalid_credentials", message: "Email or password is incorrect." } }, 401);
    }
    const session = await createSession(env, user.id);
    return json({ user: { id: user.id, email: user.email } }, 200, {
      "set-cookie": sessionCookie(session.token, 30 * 24 * 60 * 60),
      "cache-control": "no-store",
    });
  }

  if (method === "POST" && path === "/v1/auth/logout") {
    const token = cookieValue(request, "mf_session");
    if (token) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(await sha256(token)).run();
    return json({ ok: true }, 200, {
      "set-cookie": sessionCookie("", 0),
      "cache-control": "no-store",
    });
  }

  if (method === "GET" && path === "/v1/auth/me") {
    const session = await getDashboardSession(request, env);
    if (!session) return json({ error: { code: "unauthorized", message: "Sign in to continue." } }, 401, { "cache-control": "no-store" });
    return json({ user: { id: session.user_id, email: session.email }, workspace: { id: session.workspace_id, name: session.workspace_name } }, 200, { "cache-control": "no-store" });
  }

  const session = await getDashboardSession(request, env);
  if (!session) {
    if (path.startsWith("/v1/api-keys") || (method === "GET" && (path === "/v1/emails" || path.startsWith("/v1/emails/"))) || path === "/v1/overview" || path.startsWith("/v1/domains") || path.startsWith("/v1/suppressions")) {
      return json({ error: { code: "unauthorized", message: "Sign in to access workspace data." } }, 401, { "cache-control": "no-store" });
    }
    return null;
  }

  if (method === "GET" && path === "/v1/api-keys") {
    const result = await env.DB.prepare(
      "SELECT id, name, key_type, key_prefix, revoked, last_used_at, created_at FROM api_keys WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 100",
    ).bind(session.workspace_id).all();
    return json({ data: (result.results ?? []).map((row: Record<string, unknown>) => ({
      id: row.id, name: row.name, type: row.key_type, prefix: row.key_prefix,
      revoked: Boolean(row.revoked), lastUsedAt: row.last_used_at, createdAt: row.created_at,
    })) }, 200, { "cache-control": "no-store" });
  }

  if (method === "POST" && path === "/v1/api-keys") {
    let body: { name?: unknown; type?: unknown };
    try { body = await request.json() as typeof body; } catch {
      return json({ error: { code: "invalid_json", message: "Request body must be valid JSON." } }, 400);
    }
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 80) : "";
    const type = body.type === "live" ? "live" : body.type === "test" ? "test" : null;
    if (!name || !type) return json({ error: { code: "invalid_request", message: "Provide a name and type ('test' or 'live')." } }, 400);
    const secret = apiKeySecret(type);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    await env.DB.prepare(
      "INSERT INTO api_keys (id, workspace_id, name, key_type, key_hash, key_prefix, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    ).bind(id, session.workspace_id, name, type, await sha256(secret), secret.slice(0, 12), now).run();
    return json({ data: { id, name, type, prefix: secret.slice(0, 12), createdAt: now, lastUsedAt: null, revoked: false }, secret }, 201, { "cache-control": "no-store" });
  }

  const revokeMatch = path.match(/^\\/v1\\/api-keys\\/([a-f0-9-]+)$/i);
  if (method === "DELETE" && revokeMatch) {
    const result = await env.DB.prepare("UPDATE api_keys SET revoked = 1, revoked_at = ? WHERE id = ? AND workspace_id = ? AND revoked = 0")
      .bind(new Date().toISOString(), revokeMatch[1], session.workspace_id).run();
    if (!result.meta.changes) return json({ error: { code: "not_found", message: "API key not found or already revoked." } }, 404);
    return json({ ok: true });
  }

  if (method === "GET" && path === "/v1/emails") {
    const limit = Math.min(100, Math.max(1, Number(url.searchParams.get("limit") ?? 25) || 25));
    const offset = Math.max(0, Number(url.searchParams.get("offset") ?? 0) || 0);
    const status = url.searchParams.get("status");
    const search = (url.searchParams.get("search") ?? "").trim().slice(0, 120);
    const validStatuses = new Set(["queued", "processing", "accepted", "delivered", "deferred", "bounced", "failed"]);
    const clauses = ["workspace_id = ?"];
    const bindings: (string | number)[] = [session.workspace_id];
    if (status && validStatuses.has(status)) { clauses.push("status = ?"); bindings.push(status); }
    if (search) { clauses.push("(recipient LIKE ? OR sender LIKE ? OR subject LIKE ?)"); bindings.push(\`%\${search}%\`, \`%\${search}%\`, \`%\${search}%\`); }
    const where = clauses.join(" AND ");
    const result = await env.DB.prepare(
      \`SELECT id, recipient, sender, subject, status, domain, smtp_code, smtp_response, error_details, tags_json, submitted_at, last_updated
       FROM email_logs WHERE \${where} ORDER BY submitted_at DESC LIMIT ? OFFSET ?\`,
    ).bind(...bindings, limit, offset).all();
    const count = await env.DB.prepare(\`SELECT COUNT(*) AS total FROM email_logs WHERE \${where}\`).bind(...bindings).first<{ total: number }>();
    return json({ data: result.results ?? [], total: count?.total ?? 0, limit, offset }, 200, { "cache-control": "no-store" });
  }

  const emailDetailMatch = path.match(/^\\/v1\\/emails\\/([a-f0-9-]+)$/i);
  if (method === "GET" && emailDetailMatch) {
    const email = await env.DB.prepare(
      "SELECT * FROM email_logs WHERE id = ? AND workspace_id = ? LIMIT 1",
    ).bind(emailDetailMatch[1], session.workspace_id).first<Record<string, unknown>>();
    if (!email) return json({ error: { code: "not_found", message: "Email not found." } }, 404);
    const [attempts, events] = await Promise.all([
      env.DB.prepare("SELECT id, attempt_number, status, response_code, response_text, duration_ms, created_at FROM delivery_attempts WHERE email_log_id = ? ORDER BY attempt_number DESC").bind(emailDetailMatch[1]).all(),
      env.DB.prepare("SELECT id, event_type, description, created_at FROM email_events WHERE email_log_id = ? ORDER BY created_at DESC").bind(emailDetailMatch[1]).all(),
    ]);
    return json({ data: { ...email, attempts: attempts.results ?? [], events: events.results ?? [] } }, 200, { "cache-control": "no-store" });
  }

  if (method === "GET" && path === "/v1/suppressions") {
    const result = await env.DB.prepare("SELECT id, email, reason, domain, detail, created_at FROM suppressions WHERE workspace_id = ? ORDER BY created_at DESC LIMIT 500")
      .bind(session.workspace_id).all();
    return json({ data: result.results ?? [] }, 200, { "cache-control": "no-store" });
  }

  if (method === "POST" && path === "/v1/suppressions") {
    let body: { email?: unknown; reason?: unknown; detail?: unknown };
    try { body = await request.json() as typeof body; } catch {
      return json({ error: { code: "invalid_json", message: "Request body must be valid JSON." } }, 400);
    }
    const email = typeof body.email === "string" ? normalizeEmail(body.email) : "";
    const reason = body.reason === "hard_bounce" || body.reason === "spam_complaint" || body.reason === "manual" ? body.reason : "manual";
    const detail = typeof body.detail === "string" ? body.detail.trim().slice(0, 500) : "";
    if (!validEmail(email)) return json({ error: { code: "invalid_email", message: "Enter a valid email address." } }, 400);
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    try {
      await env.DB.prepare("INSERT INTO suppressions (id, workspace_id, email, reason, domain, detail, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)")
        .bind(id, session.workspace_id, email, reason, emailDomain(email), detail || null, now).run();
    } catch {
      return json({ error: { code: "already_suppressed", message: "This recipient is already suppressed." } }, 409);
    }
    return json({ data: { id, email, reason, domain: emailDomain(email), detail, created_at: now } }, 201);
  }

  const suppressionMatch = path.match(/^\\/v1\\/suppressions\\/([a-f0-9-]+)$/i);
  if (method === "DELETE" && suppressionMatch) {
    const result = await env.DB.prepare("DELETE FROM suppressions WHERE id = ? AND workspace_id = ?")
      .bind(suppressionMatch[1], session.workspace_id).run();
    if (!result.meta.changes) return json({ error: { code: "not_found", message: "Suppression not found." } }, 404);
    return json({ ok: true });
  }

  if (method === "POST" && path === "/v1/domains") {
    let body: { domain?: unknown };
    try { body = await request.json() as typeof body; } catch {
      return json({ error: { code: "invalid_json", message: "Request body must be valid JSON." } }, 400);
    }
    const domain = typeof body.domain === "string" ? body.domain.trim().toLowerCase().replace(/\\.$/, "") : "";
    const domainPattern = /^(?=.{1,253}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\\.)+[a-z]{2,63}$/;
    if (!domainPattern.test(domain)) return json({ error: { code: "invalid_domain", message: "Enter a valid domain name, such as example.com." } }, 400);
    const existing = await env.DB.prepare("SELECT id FROM sending_domains WHERE workspace_id = ? AND domain = ? COLLATE NOCASE LIMIT 1")
      .bind(session.workspace_id, domain).first<{ id: string }>();
    if (existing) return json({ error: { code: "domain_exists", message: "This domain is already connected to your workspace." } }, 409);
    const id = crypto.randomUUID();
    const token = randomToken(18);
    const now = new Date().toISOString();
    await env.DB.prepare("INSERT INTO sending_domains (id, workspace_id, domain, status, verification_token, created_at) VALUES (?, ?, ?, 'pending', ?, ?)")
      .bind(id, session.workspace_id, domain, token, now).run();
    return json({ data: { id, domain, status: "pending", verification_token: token, created_at: now, verificationRecord: { type: "TXT", name: `_mailforge-verification.${domain}`, value: `mailforge-verification=${token}` } } }, 201, { "cache-control": "no-store" });
  }

  const verifyDomainMatch = path.match(/^\/v1\/domains\/([a-f0-9-]+)\/verify$/i);
  if (method === "POST" && verifyDomainMatch) {
    const domain = await env.DB.prepare("SELECT id, domain, verification_token, status FROM sending_domains WHERE id = ? AND workspace_id = ? LIMIT 1")
      .bind(verifyDomainMatch[1], session.workspace_id).first<{ id: string; domain: string; verification_token: string; status: string }>();
    if (!domain) return json({ error: { code: "not_found", message: "Domain not found." } }, 404);
    try {
      const dnsUrl = new URL("https://cloudflare-dns.com/dns-query");
      dnsUrl.searchParams.set("name", `_mailforge-verification.${domain.domain}`);
      dnsUrl.searchParams.set("type", "TXT");
      const dnsResponse = await fetch(dnsUrl, { headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(5000) });
      if (!dnsResponse.ok) throw new Error("DNS lookup failed");
      const dns = await dnsResponse.json() as { Answer?: Array<{ data?: string }> };
      const expected = `mailforge-verification=${domain.verification_token}`;
      const found = (dns.Answer ?? []).some((answer) => (answer.data ?? "").replace(/(^"|"$)/g, "").includes(expected));
      if (!found) return json({ error: { code: "verification_pending", message: "The verification TXT record was not found yet. DNS changes can take time to propagate." } }, 422);
      const now = new Date().toISOString();
      await env.DB.prepare("UPDATE sending_domains SET status = 'verified', verified_at = ? WHERE id = ? AND workspace_id = ?")
        .bind(now, domain.id, session.workspace_id).run();
      return json({ data: { id: domain.id, domain: domain.domain, status: "verified", verified_at: now }, message: "Domain ownership verified. Ensure your SMTP provider also authorizes this sender domain and its SPF/DKIM records." });
    } catch (error) {
      if (error instanceof Error && error.message === "DNS lookup failed") return json({ error: { code: "dns_unavailable", message: "DNS verification is temporarily unavailable. Try again shortly." } }, 502);
      return json({ error: { code: "dns_unavailable", message: "Could not check DNS right now. Try again shortly." } }, 502);
    }
  }

  if (method === "GET" && path === "/v1/domains") {
    const result = await env.DB.prepare("SELECT id, domain, status, verification_token, spf_verified, dkim_verified, dmarc_verified, verified_at, created_at FROM sending_domains WHERE workspace_id = ? ORDER BY created_at DESC")
      .bind(session.workspace_id).all();
    return json({ data: result.results ?? [] }, 200, { "cache-control": "no-store" });
  }

  if (method === "GET" && path === "/v1/overview") {
    const counts = await env.DB.prepare(
      \`SELECT COUNT(*) AS submitted,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) AS delivered,
        SUM(CASE WHEN status = 'bounced' THEN 1 ELSE 0 END) AS bounced,
        SUM(CASE WHEN status = 'deferred' THEN 1 ELSE 0 END) AS deferred,
        SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) AS failed
       FROM email_logs WHERE workspace_id = ?\`,
    ).bind(session.workspace_id).first<Record<string, number>>();
    const [recent, domainCounts] = await Promise.all([
      env.DB.prepare("SELECT id, recipient, sender, subject, status, submitted_at, last_updated, domain, smtp_code, error_details FROM email_logs WHERE workspace_id = ? ORDER BY submitted_at DESC LIMIT 6").bind(session.workspace_id).all(),
      env.DB.prepare("SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'verified' THEN 1 ELSE 0 END) AS verified FROM sending_domains WHERE workspace_id = ?").bind(session.workspace_id).first<{ total: number; verified: number }>(),
    ]);
    const submitted = counts?.submitted ?? 0;
    const delivered = counts?.delivered ?? 0;
    return json({
      stats: {
        totalSubmitted: submitted, totalDelivered: delivered, totalBounced: counts?.bounced ?? 0,
        deliveryRate: submitted ? Math.round((delivered / submitted) * 1000) / 10 : 0,
        totalDeferred: counts?.deferred ?? 0, totalFailed: counts?.failed ?? 0,
        apiQuotaUsed: submitted, apiQuotaTotal: 3000,
      },
      domains: { total: domainCounts?.total ?? 0, verified: domainCounts?.verified ?? 0 },
      recentEmails: recent.results ?? [],
    }, 200, { "cache-control": "no-store" });
  }

  return null;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });

    const url = new URL(request.url);
    if (request.method === "GET" && url.pathname === "/health") {
      return json({ service: "mailforge-api", status: "ok" }, 200, cors);
    }

    if (request.method === "POST" && url.pathname === "/internal/smtp-test") {
      const response = await handleSmtpTest(request, env);
      const headers = new Headers(response.headers);
      new Headers(cors).forEach((value, key) => headers.set(key, value));
      return new Response(response.body, { status: response.status, headers });
    }

    const dashboardResponse = await handleDashboardApi(request, env);
    if (dashboardResponse) {
      const headers = new Headers(dashboardResponse.headers);
      new Headers(cors).forEach((value, key) => headers.set(key, value));
      return new Response(dashboardResponse.body, { status: dashboardResponse.status, headers });
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
