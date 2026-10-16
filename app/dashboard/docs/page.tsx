'use client';

import { useState } from 'react';
import { Copy, Check, BookOpen, Terminal, CheckCircle2, Circle, Lock } from 'lucide-react';

import { PageHeader } from '@/components/dashboard/page-header';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface EndpointDoc {
  method: string;
  path: string;
  title: string;
  implemented: boolean;
  description: string;
  requestExample: string;
  responseExample: string;
  curlExample: string;
  errors: { code: number; message: string }[];
}

const endpoints: EndpointDoc[] = [
  {
    method: 'POST',
    path: '/v1/emails',
    title: 'Send an Email',
    implemented: true,
    description: 'Submit a new email for delivery. The email is queued and sent asynchronously through the configured transport.',
    requestExample: `{
  "from": "no-reply@mailforge.dev",
  "to": "user@example.com",
  "subject": "Welcome to MailForge",
  "html": "<h1>Welcome!</h1><p>Thanks for signing up.</p>",
  "text": "Welcome! Thanks for signing up.",
  "tags": ["transactional", "welcome"],
  "headers": {
    "X-Custom-Header": "value"
  }
}`,
    responseExample: `{
  "id": "msg_4f8x2j9a1b3c7d",
  "status": "queued",
  "message": "Email queued for delivery",
  "created_at": "2026-10-16T12:00:00Z"
}`,
    curlExample: `curl -X POST https://api.mailforge.dev/v1/emails \\
  -H "Authorization: Bearer mf_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{
    "from": "no-reply@mailforge.dev",
    "to": "user@example.com",
    "subject": "Welcome to MailForge",
    "html": "<h1>Welcome!</h1>"
  }'`,
    errors: [
      { code: 400, message: 'Invalid request body — missing required fields' },
      { code: 401, message: 'Missing or invalid API key' },
      { code: 403, message: 'Sender domain is not verified' },
      { code: 429, message: 'Rate limit exceeded — retry after 1 second' },
    ],
  },
  {
    method: 'GET',
    path: '/v1/emails/{id}',
    title: 'Retrieve an Email',
    implemented: true,
    description: 'Get the current status and metadata for a specific email by its message ID.',
    requestExample: `// Path parameter: id (string) — the message ID returned when sending`,
    responseExample: `{
  "id": "msg_4f8x2j9a1b3c7d",
  "status": "delivered",
  "from": "no-reply@mailforge.dev",
  "to": "user@example.com",
  "subject": "Welcome to MailForge",
  "created_at": "2026-10-16T12:00:00Z",
  "updated_at": "2026-10-16T12:00:15Z",
  "attempts": [
    {
      "attempt": 1,
      "status": "accepted",
      "smtp_code": 250,
      "smtp_response": "250 OK Message accepted",
      "timestamp": "2026-10-16T12:00:05Z"
    }
  ],
  "events": [
    { "type": "email.queued", "timestamp": "2026-10-16T12:00:00Z" },
    { "type": "email.accepted", "timestamp": "2026-10-16T12:00:05Z" },
    { "type": "email.delivered", "timestamp": "2026-10-16T12:00:15Z" }
  ]
}`,
    curlExample: `curl https://api.mailforge.dev/v1/emails/msg_4f8x2j9a1b3c7d \\
  -H "Authorization: Bearer mf_live_your_api_key"`,
    errors: [
      { code: 401, message: 'Missing or invalid API key' },
      { code: 404, message: 'Email not found' },
    ],
  },
  {
    method: 'POST',
    path: '/v1/domains',
    title: 'Add a Sending Domain',
    implemented: true,
    description: 'Register a new sending domain. Returns DNS records that must be added to the domain\'s DNS configuration.',
    requestExample: `{
  "domain": "example.com"
}`,
    responseExample: `{
  "id": "dom_a1b2c3d4",
  "domain": "example.com",
  "status": "pending",
  "verification_token": "mf-verify-a1b2c3d4e5f6",
  "dns_records": {
    "spf": {
      "type": "TXT",
      "name": "example.com",
      "value": "v=spf1 include:_spf.mailforge.dev ~all"
    },
    "dkim": {
      "type": "TXT",
      "name": "mailforge._domainkey.example.com",
      "value": "v=DKIM1; k=rsa; p=MIGfMA0GCS..."
    },
    "dmarc": {
      "type": "TXT",
      "name": "_dmarc.example.com",
      "value": "v=DMARC1; p=quarantine; pct=100"
    },
    "return_path": {
      "type": "CNAME",
      "name": "rp.example.com",
      "value": "rp.mailforge.net"
    }
  },
  "created_at": "2026-10-16T12:00:00Z"
}`,
    curlExample: `curl -X POST https://api.mailforge.dev/v1/domains \\
  -H "Authorization: Bearer mf_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{ "domain": "example.com" }'`,
    errors: [
      { code: 400, message: 'Invalid domain format' },
      { code: 401, message: 'Missing or invalid API key' },
      { code: 409, message: 'Domain already exists' },
    ],
  },
  {
    method: 'GET',
    path: '/v1/domains/{id}',
    title: 'Retrieve a Domain',
    implemented: true,
    description: 'Get the verification status and DNS records for a specific sending domain.',
    requestExample: `// Path parameter: id (string) — the domain ID`,
    responseExample: `{
  "id": "dom_a1b2c3d4",
  "domain": "example.com",
  "status": "verified",
  "verified_at": "2026-10-18T14:30:00Z",
  "dns_records": {
    "spf": { "verified": true },
    "dkim": { "verified": true },
    "dmarc": { "verified": true },
    "return_path": { "verified": true }
  }
}`,
    curlExample: `curl https://api.mailforge.dev/v1/domains/dom_a1b2c3d4 \\
  -H "Authorization: Bearer mf_live_your_api_key"`,
    errors: [
      { code: 401, message: 'Missing or invalid API key' },
      { code: 404, message: 'Domain not found' },
    ],
  },
  {
    method: 'POST',
    path: '/v1/api-keys',
    title: 'Generate an API Key',
    implemented: true,
    description: 'Create a new API key. The secret is returned only once in the response — store it securely.',
    requestExample: `{
  "name": "Production Server",
  "type": "live",
  "restrictions": {
    "domain": "mailforge.dev"
  }
}`,
    responseExample: `{
  "id": "key_x1y2z3",
  "name": "Production Server",
  "type": "live",
  "key": "mf_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0",
  "created_at": "2026-10-16T12:00:00Z",
  "message": "Store this key securely — it will not be shown again"
}`,
    curlExample: `curl -X POST https://api.mailforge.dev/v1/api-keys \\
  -H "Authorization: Bearer mf_live_your_api_key" \\
  -H "Content-Type: application/json" \\
  -d '{ "name": "Production Server", "type": "live" }'`,
    errors: [
      { code: 400, message: 'Invalid request body' },
      { code: 401, message: 'Missing or invalid API key' },
      { code: 403, message: 'Insufficient permissions' },
    ],
  },
];

const authExample = `// All API requests require an Authorization header with your API key:

Authorization: Bearer mf_live_a1b2c3d4e5f6g7h8...

// Test keys (mf_test_*) use mock data and never send real emails.
// Live keys (mf_live_*) send through the configured email transport.`;

const rateLimitExample = `// Rate limit headers are included in every response:

X-RateLimit-Limit: 50
X-RateLimit-Remaining: 49
X-RateLimit-Reset: 1697456400

// When rate limited, the API returns HTTP 429:

{
  "error": {
    "code": "rate_limited",
    "message": "Rate limit exceeded. Retry after 1 second.",
    "retry_after": 1
  }
}`;

function CodeBlock({ code, label }: { code: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className="group relative">
      {label && (
        <div className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          <Terminal className="h-3.5 w-3.5" />
          {label}
        </div>
      )}
      <div className="relative rounded-lg border border-border bg-background/50 p-4 overflow-x-auto scrollbar-thin">
        <button
          onClick={copy}
          className="absolute right-3 top-3 flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground opacity-0 transition-opacity hover:bg-secondary hover:text-foreground group-hover:opacity-100"
        >
          {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
        <pre className="text-xs leading-relaxed text-foreground/90 font-mono whitespace-pre">{code}</pre>
      </div>
    </div>
  );
}

const methodColors: Record<string, string> = {
  GET: 'bg-accent/10 text-accent border-accent/20',
  POST: 'bg-success/10 text-success border-success/20',
  PUT: 'bg-warning/10 text-warning border-warning/20',
  DELETE: 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function DocsPage() {
  const [activeEndpoint, setActiveEndpoint] = useState(0);
  const ep = endpoints[activeEndpoint];

  return (
    <div>
      <PageHeader
        title="API Documentation"
        description="Complete reference for the MailForge REST API. All endpoints use JSON and require Bearer token authentication."
      />

      <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <Lock className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Authentication</h3>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            All requests require a Bearer token in the Authorization header.
          </p>
          <CodeBlock code={authExample} />
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Rate Limiting</h3>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">
            Requests are rate-limited per API key. Limits are returned in response headers.
          </p>
          <CodeBlock code={rateLimitExample} />
        </Card>

        <Card className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Implementation Status</h3>
          </div>
          <div className="space-y-2">
            {endpoints.map((e, i) => (
              <button
                key={i}
                onClick={() => setActiveEndpoint(i)}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-xs transition-colors ${
                  i === activeEndpoint ? 'bg-primary/10 text-primary' : 'hover:bg-secondary text-muted-foreground'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`rounded border px-1.5 py-0.5 text-[10px] font-mono font-medium ${methodColors[e.method]}`}>
                    {e.method}
                  </span>
                  <span className="font-mono">{e.path}</span>
                </span>
                {e.implemented ? (
                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" />
                ) : (
                  <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                )}
              </button>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className={`rounded border px-2 py-0.5 text-xs font-mono font-medium ${methodColors[ep.method]}`}>
              {ep.method}
            </span>
            <code className="text-sm font-mono text-foreground">{ep.path}</code>
          </div>
          <Badge variant={ep.implemented ? 'default' : 'secondary'}>
            {ep.implemented ? 'Implemented' : 'Planned'}
          </Badge>
        </div>

        <h3 className="text-base font-semibold text-foreground">{ep.title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{ep.description}</p>

        <div className="mt-6">
          <Tabs defaultValue="curl">
            <TabsList>
              <TabsTrigger value="curl">cURL</TabsTrigger>
              <TabsTrigger value="request">Request</TabsTrigger>
              <TabsTrigger value="response">Response</TabsTrigger>
              <TabsTrigger value="errors">Errors</TabsTrigger>
            </TabsList>

            <TabsContent value="curl" className="mt-4">
              <CodeBlock code={ep.curlExample} label="Example request" />
            </TabsContent>

            <TabsContent value="request" className="mt-4">
              <CodeBlock code={ep.requestExample} label="Request body" />
            </TabsContent>

            <TabsContent value="response" className="mt-4">
              <CodeBlock code={ep.responseExample} label="200 OK — Response body" />
            </TabsContent>

            <TabsContent value="errors" className="mt-4">
              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-secondary/30">
                      <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ep.errors.map((err, i) => (
                      <tr key={i} className="border-b border-border/50 last:border-0">
                        <td className="px-4 py-2.5">
                          <span className={`rounded px-1.5 py-0.5 font-mono text-xs font-medium ${
                            err.code >= 500 ? 'bg-destructive/10 text-destructive'
                            : err.code === 429 ? 'bg-warning/10 text-warning'
                            : err.code === 404 ? 'bg-muted text-muted-foreground'
                            : 'bg-destructive/10 text-destructive'
                          }`}>
                            {err.code}
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-sm text-foreground/80">{err.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </Card>
    </div>
  );
}
