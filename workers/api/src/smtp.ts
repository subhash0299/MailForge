import { connect, type Socket } from "cloudflare:sockets";

export interface SmtpEnv {
  SMTP_HOST?: string;
  SMTP_PORT?: string;
  SMTP_SECURITY?: "tls" | "starttls";
  SMTP_USERNAME?: string;
  SMTP_PASSWORD?: string;
}

export interface SmtpMessage {
  from: string;
  to: string;
  subject: string;
  text: string | null;
  html: string | null;
}

interface SmtpReply {
  code: number;
  text: string;
}

export class SmtpDeliveryError extends Error {
  readonly code: number;
  readonly retryable: boolean;

  constructor(message: string, code = 0, retryable = true) {
    super(message);
    this.name = "SmtpDeliveryError";
    this.code = code;
    this.retryable = retryable;
  }
}

const encoder = new TextEncoder();

function base64Utf8(value: string): string {
  const bytes = encoder.encode(value);
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) {
    binary += String.fromCharCode(...bytes.subarray(offset, Math.min(offset + 0x8000, bytes.length)));
  }
  return btoa(binary);
}

function wrapBase64(value: string): string {
  const encoded = base64Utf8(value);
  return encoded.match(/.{1,76}/g)?.join("\r\n") ?? "";
}

function safeHeader(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

function encodedSubject(value: string): string {
  const cleaned = safeHeader(value);
  if (/^[\x20-\x7E]*$/.test(cleaned)) return cleaned;
  return `=?UTF-8?B?${base64Utf8(cleaned)}?=`;
}

function buildMimeMessage(message: SmtpMessage): string {
  const headers = [
    `From: <${safeHeader(message.from)}>`,
    `To: <${safeHeader(message.to)}>`,
    `Subject: ${encodedSubject(message.subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: <${crypto.randomUUID()}@mailforge.local>`,
    "MIME-Version: 1.0",
  ];

  if (message.text && message.html) {
    const boundary = `mailforge_${crypto.randomUUID().replace(/-/g, "")}`;
    headers.push(`Content-Type: multipart/alternative; boundary="${boundary}"`);
    return [
      ...headers,
      "",
      `--${boundary}`,
      'Content-Type: text/plain; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      wrapBase64(message.text),
      `--${boundary}`,
      'Content-Type: text/html; charset="UTF-8"',
      "Content-Transfer-Encoding: base64",
      "",
      wrapBase64(message.html),
      `--${boundary}--`,
      "",
    ].join("\r\n");
  }

  const isHtml = Boolean(message.html);
  headers.push(`Content-Type: ${isHtml ? "text/html" : "text/plain"}; charset="UTF-8"`);
  headers.push("Content-Transfer-Encoding: base64");
  return [...headers, "", wrapBase64((isHtml ? message.html : message.text) ?? ""), ""].join("\r\n");
}

class SmtpChannel {
  private reader: ReadableStreamDefaultReader<Uint8Array>;
  private writer: WritableStreamDefaultWriter<Uint8Array>;
  private pending = "";

  constructor(private socket: Socket) {
    this.reader = socket.readable.getReader();
    this.writer = socket.writable.getWriter();
  }

  async write(value: string): Promise<void> {
    await this.writer.write(encoder.encode(value));
  }

  private async readLine(): Promise<string> {
    while (true) {
      const newline = this.pending.indexOf("\n");
      if (newline >= 0) {
        const line = this.pending.slice(0, newline).replace(/\r$/, "");
        this.pending = this.pending.slice(newline + 1);
        return line;
      }

      const result = await this.reader.read();
      if (result.done) throw new SmtpDeliveryError("SMTP server closed the connection unexpectedly.");
      this.pending += new TextDecoder().decode(result.value, { stream: true });
      if (this.pending.length > 16_384) {
        throw new SmtpDeliveryError("SMTP response line exceeded the allowed length.", 0, false);
      }
    }
  }

  async readReply(): Promise<SmtpReply> {
    const lines: string[] = [];
    let code = 0;
    while (true) {
      const line = await this.readLine();
      const match = line.match(/^(\d{3})([ -])(.*)$/);
      if (!match) throw new SmtpDeliveryError(`Invalid SMTP response: ${line.slice(0, 200)}`);
      const lineCode = Number(match[1]);
      if (code === 0) code = lineCode;
      if (lineCode !== code) throw new SmtpDeliveryError("SMTP server returned inconsistent multiline response codes.");
      lines.push(line);
      if (match[2] === " ") return { code, text: lines.join("\n") };
      if (lines.length > 100) throw new SmtpDeliveryError("SMTP server returned too many response lines.", code, false);
    }
  }

  async command(command: string): Promise<SmtpReply> {
    await this.write(`${command}\r\n`);
    return this.readReply();
  }

  releaseForStartTls(): void {
    this.reader.releaseLock();
    this.writer.releaseLock();
  }

  close(): void {
    try { this.reader.releaseLock(); } catch {}
    try { this.writer.releaseLock(); } catch {}
    try { this.socket.close(); } catch {}
  }
}

function requireCode(reply: SmtpReply, allowed: number[]): SmtpReply {
  if (allowed.includes(reply.code)) return reply;
  const safeText = reply.text.slice(0, 500);
  throw new SmtpDeliveryError(
    `SMTP server rejected a command (${reply.code}): ${safeText}`,
    reply.code,
    reply.code >= 400 && reply.code < 500,
  );
}

export async function sendSmtpEmail(env: SmtpEnv, message: SmtpMessage): Promise<SmtpReply> {
  const host = env.SMTP_HOST?.trim();
  const username = env.SMTP_USERNAME;
  const password = env.SMTP_PASSWORD;
  if (!host || !username || !password) {
    throw new SmtpDeliveryError("SMTP configuration is incomplete.", 0, false);
  }

  const port = Number(env.SMTP_PORT || "587");
  if (!Number.isInteger(port) || port < 1 || port > 65535 || port === 25) {
    throw new SmtpDeliveryError("SMTP_PORT must be a valid port other than 25. Use 465 (TLS) or 587 (STARTTLS).", 0, false);
  }

  const security = env.SMTP_SECURITY || (port === 465 ? "tls" : "starttls");
  if (security !== "tls" && security !== "starttls") {
    throw new SmtpDeliveryError('SMTP_SECURITY must be "tls" or "starttls".', 0, false);
  }

  let socket: Socket | null = null;
  let channel: SmtpChannel | null = null;
  try {
    socket = connect({ hostname: host, port }, {
      secureTransport: security === "tls" ? "on" : "starttls",
      allowHalfOpen: false,
    });
    channel = new SmtpChannel(socket);
    requireCode(await channel.readReply(), [220]);
    requireCode(await channel.command("EHLO mailforge.local"), [250]);

    if (security === "starttls") {
      requireCode(await channel.command("STARTTLS"), [220]);
      channel.releaseForStartTls();
      socket = socket.startTls();
      channel = new SmtpChannel(socket);
      requireCode(await channel.command("EHLO mailforge.local"), [250]);
    }

    const auth = base64Utf8(`\u0000${username}\u0000${password}`);
    requireCode(await channel.command(`AUTH PLAIN ${auth}`), [235]);
    requireCode(await channel.command(`MAIL FROM:<${safeHeader(message.from)}>`), [250]);
    requireCode(await channel.command(`RCPT TO:<${safeHeader(message.to)}>`), [250, 251]);
    requireCode(await channel.command("DATA"), [354]);

    const mime = buildMimeMessage(message).replace(/(^|\r\n)\./g, "$1..");
    await channel.write(`${mime}\r\n.\r\n`);
    const accepted = requireCode(await channel.readReply(), [250]);
    try { await channel.command("QUIT"); } catch {}
    return accepted;
  } catch (error) {
    if (error instanceof SmtpDeliveryError) throw error;
    throw new SmtpDeliveryError("Could not connect to or communicate with the SMTP server.");
  } finally {
    channel?.close();
    if (!channel && socket) {
      try { socket.close(); } catch {}
    }
  }
}
