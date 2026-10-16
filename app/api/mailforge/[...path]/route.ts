import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const API_BASE = (process.env.MAILFORGE_API_URL || "https://mailforge-api.mailforge.workers.dev").replace(/\/$/, "");

async function proxy(request: NextRequest, context: { params: { path: string[] } }) {
  const path = context.params.path.map((part) => encodeURIComponent(part)).join("/");
  const target = new URL(`/${path}`, API_BASE);
  target.search = request.nextUrl.search;

  const headers = new Headers();
  for (const name of ["accept", "content-type", "authorization", "cookie", "idempotency-key"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  const init: RequestInit = { method: request.method, headers, redirect: "manual", cache: "no-store" };
  if (!["GET", "HEAD"].includes(request.method)) init.body = await request.arrayBuffer();

  try {
    const upstream = await fetch(target, init);
    const responseHeaders = new Headers();
    for (const name of ["content-type", "cache-control", "set-cookie", "retry-after"]) {
      const value = upstream.headers.get(name);
      if (value) responseHeaders.set(name, value);
    }
    responseHeaders.set("cache-control", "no-store");
    return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
  } catch {
    return Response.json({ error: { code: "api_unavailable", message: "MailForge API is temporarily unavailable." } }, { status: 502 });
  }
}

export const GET = proxy;
export const POST = proxy;
export const DELETE = proxy;
export const PATCH = proxy;
export const PUT = proxy;
