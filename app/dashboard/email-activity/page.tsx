'use client';

import { useEffect, useState } from 'react';
import { Activity, Search, RefreshCw, CheckCircle2, AlertTriangle, Clock3, Copy, ChevronDown, ChevronUp, Mail, Server } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';
import { formatDateTime, formatRelativeTime } from '@/lib/format';

type EmailRow = { id: string; recipient: string; sender: string; subject: string | null; status: string; domain: string; smtp_code: number | null; smtp_response: string | null; error_details: string | null; tags_json: string | null; submitted_at: string; last_updated: string; text_body?: string | null; html_body?: string | null; api_key_id?: string | null; provider_message_id?: string | null };
type EmailResponse = { data: EmailRow[]; total: number; limit: number; offset: number };
type DetailResponse = { data: EmailRow & { attempts: Array<{ id: string; attempt_number: number; status: string; response_code: number | null; response_text: string | null; duration_ms: number; created_at: string }>; events: Array<{ id: string; event_type: string; description: string; created_at: string }> } };

const statuses = ['all', 'queued', 'processing', 'accepted', 'delivered', 'deferred', 'bounced', 'failed'];

function statusExplanation(status: string) {
  switch (status) {
    case 'accepted': return 'The configured SMTP server accepted the message. Inbox delivery is not confirmed.';
    case 'delivered': return 'A delivery confirmation event was recorded.';
    case 'queued': return 'MailForge has queued this message and it has not completed an SMTP attempt yet.';
    case 'processing': return 'MailForge is currently processing this message.';
    case 'deferred': return 'A temporary delivery issue occurred. MailForge may retry automatically.';
    case 'bounced': return 'The recipient or receiving server reported a bounce.';
    case 'failed': return 'MailForge could not complete delivery. Review the diagnostics and take action.';
    default: return 'Current state recorded by MailForge.';
  }
}

function duration(value: number) {
  if (value < 1000) return `${value} ms`;
  return `${(value / 1000).toFixed(2)} sec`;
}

function createSafeEmailPreview(html: string) {
  // Isolate the preview and remove active content and remote resources.
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  parsed.querySelectorAll('script, iframe, frame, frameset, object, embed, form, input, button, textarea, select, option, link, meta, base, style, video, audio, source, track, svg, math').forEach((node) => node.remove());
  parsed.querySelectorAll('*').forEach((element) => {
    [...element.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      if (name.startsWith('on') || ['style', 'src', 'srcset', 'href', 'xlink:href', 'action', 'formaction', 'poster', 'background', 'srcdoc'].includes(name)) {
        element.removeAttribute(attribute.name);
      }
    });
  });
  return parsed.body.innerHTML;
}

function eventLabel(type: string) {
  const labels: Record<string, string> = {
    'email.queued': 'Queued by MailForge',
    'email.accepted': 'Accepted by SMTP server',
    'email.deferred': 'Temporary delivery issue',
    'email.failed': 'Delivery failed',
    'email.delivered': 'Delivery confirmed',
    'email.bounced': 'Message bounced',
  };
  return labels[type] ?? type.replace(/^email\./, '').replace(/[._]/g, ' ').replace(/^\w/, (value) => value.toUpperCase());
}

export default function EmailActivityPage() {
  const [rows, setRows] = useState<EmailRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<DetailResponse['data'] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [showDiagnostics, setShowDiagnostics] = useState(false);\n  const [previewMode, setPreviewMode] = useState<'rendered' | 'text'>('rendered');

  async function load() {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ limit: '25', offset: String(offset) });
      if (status !== 'all') params.set('status', status);
      if (search.trim()) params.set('search', search.trim());
      const result = await apiRequest<EmailResponse>(`/v1/emails?${params.toString()}`);
      setRows(result.data);
      setTotal(result.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load email activity.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { const initialStatus = new URLSearchParams(window.location.search).get('status'); if (initialStatus && statuses.includes(initialStatus)) { setStatus(initialStatus); setOffset(0); } }, []);
  useEffect(() => { void load(); }, [offset, status]);
  useEffect(() => { const timer = window.setTimeout(() => { setOffset(0); void load(); }, 250); return () => window.clearTimeout(timer); }, [search]);

  async function showDetails(id: string) {
    setError('');
    setShowDiagnostics(false);
    try {
      const result = await apiRequest<DetailResponse>(`/v1/emails/${id}`);
      setSelected(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load message details.');
    }
  }

  async function copyValue(value: string) {
    try { await navigator.clipboard.writeText(value); } catch { setError('Could not copy to clipboard.'); }
  }

  const attempts = selected?.attempts ?? [];
  const successful = selected?.status === 'accepted' || selected?.status === 'delivered';
  const hasFailure = selected ? ['failed', 'deferred', 'bounced'].includes(selected.status) : false;
  const events = [...(selected?.events ?? [])].sort((a, b) => a.created_at.localeCompare(b.created_at));

  return (
    <div>
      <PageHeader title="Email Activity" description="Understand each message's delivery status, attempts, timeline, and technical diagnostics." action={<Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>} />
      {error && <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><input aria-label="Search email activity" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search recipient, sender, or subject…" className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary" /></div>
          <select aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value); setOffset(0); }} className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary">{statuses.map((item) => <option key={item} value={item}>{item === 'all' ? 'All statuses' : item.charAt(0).toUpperCase() + item.slice(1)}</option>)}</select>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead><tr className="border-b border-border text-xs text-muted-foreground"><th className="px-3 py-3 font-medium">Recipient / Subject</th><th className="px-3 py-3 font-medium">Sender</th><th className="px-3 py-3 font-medium">Status</th><th className="px-3 py-3 font-medium">SMTP code</th><th className="px-3 py-3 font-medium">Submitted</th><th className="px-3 py-3 font-medium"></th></tr></thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="px-3 py-10 text-center text-sm text-muted-foreground">Loading email logs…</td></tr> :
                rows.length === 0 ? <tr><td colSpan={6} className="px-3 py-10 text-center"><Activity className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-2 text-sm text-muted-foreground">No matching emails yet.</p></td></tr> :
                rows.map((row) => <tr key={row.id} className="border-b border-border/70 last:border-0"><td className="max-w-[280px] px-3 py-3"><p className="truncate text-sm font-medium text-foreground">{row.recipient}</p><p className="mt-1 truncate text-xs text-muted-foreground">{row.subject || '(no subject)'}</p></td><td className="px-3 py-3 text-sm text-muted-foreground">{row.sender}</td><td className="px-3 py-3"><StatusBadge status={row.status as never} /></td><td className="px-3 py-3 text-xs text-muted-foreground">{row.smtp_code ?? '—'}</td><td className="px-3 py-3 text-xs text-muted-foreground" title={formatDateTime(row.submitted_at)}>{formatRelativeTime(row.submitted_at)}</td><td className="px-3 py-3"><Button size="sm" variant="outline" onClick={() => void showDetails(row.id)}>Details</Button></td></tr>)}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground"><span>{total === 0 ? '0 messages' : `${offset + 1}–${Math.min(offset + rows.length, total)} of ${total} messages`}</span><div className="flex gap-2"><Button size="sm" variant="outline" disabled={offset === 0 || loading} onClick={() => setOffset(Math.max(0, offset - 25))}>Previous</Button><Button size="sm" variant="outline" disabled={offset + rows.length >= total || loading} onClick={() => setOffset(offset + 25)}>Next</Button></div></div>
      </Card>

      {selected && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setSelected(null); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="email-detail-title" className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-2xl">
          <div className="flex items-start justify-between gap-4"><div><h2 id="email-detail-title" className="text-lg font-semibold text-foreground">Email delivery details</h2><p className="mt-1 break-all font-mono text-xs text-muted-foreground">{selected.id}</p></div><div className="flex gap-2"><Button size="sm" variant="outline" onClick={() => void copyValue(selected.id)}><Copy className="mr-1.5 h-3.5 w-3.5" />Copy ID</Button><Button variant="outline" size="sm" onClick={() => setSelected(null)}>Close</Button></div></div>

          <div className="mt-4 rounded-xl border border-border bg-background p-4">
            <div className="flex items-start gap-3">{successful ? <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" /> : hasFailure ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-destructive" /> : <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />}<div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><StatusBadge status={selected.status as never} /><span className="text-sm font-semibold text-foreground">{successful ? 'SMTP server accepted the message' : hasFailure ? 'Delivery needs attention' : 'Message is being processed'}</span></div><p className="mt-2 text-sm text-muted-foreground">{statusExplanation(selected.status)}</p></div></div>
            <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border pt-4 sm:grid-cols-4"><div><p className="text-xs text-muted-foreground">Attempts</p><p className="mt-1 text-lg font-semibold text-foreground">{attempts.length} <span className="text-xs font-normal text-muted-foreground">{attempts.length === 1 ? 'attempt' : 'attempts'}</span></p></div><div><p className="text-xs text-muted-foreground">SMTP outcome</p><p className="mt-1 text-sm font-semibold text-foreground">{selected.smtp_code !== null && selected.smtp_code >= 200 && selected.smtp_code < 300 ? 'Accepted' : selected.smtp_code ?? 'Not available'}</p>{selected.smtp_code !== null && <p className="mt-0.5 text-xs text-muted-foreground">Code {selected.smtp_code}</p>}</div><div><p className="text-xs text-muted-foreground">Last attempt duration</p><p className="mt-1 text-sm font-semibold text-foreground">{attempts.length ? duration(attempts.reduce((latest, attempt) => attempt.attempt_number > latest.attempt_number ? attempt : latest, attempts[0]).duration_ms) : '—'}</p></div><div><p className="text-xs text-muted-foreground">Last activity</p><p className="mt-1 text-sm font-semibold text-foreground">{formatRelativeTime(selected.last_updated)}</p></div></div>
          </div>

          <h3 className="mt-5 text-sm font-semibold text-foreground">Message information</h3>
          <div className="mt-2 grid grid-cols-1 gap-3 rounded-lg border border-border p-4 sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">From</p><p className="mt-1 break-all text-sm text-foreground">{selected.sender}</p></div><div><p className="text-xs text-muted-foreground">To</p><p className="mt-1 break-all text-sm text-foreground">{selected.recipient}</p></div><div><p className="text-xs text-muted-foreground">Subject</p><p className="mt-1 break-words text-sm text-foreground">{selected.subject || '(no subject)'}</p></div><div><p className="text-xs text-muted-foreground">Sending domain</p><p className="mt-1 break-all text-sm text-foreground">{selected.domain || selected.sender.split('@')[1] || '—'}</p></div><div><p className="text-xs text-muted-foreground">Submitted</p><p className="mt-1 text-sm text-foreground">{formatDateTime(selected.submitted_at)}</p></div><div><p className="text-xs text-muted-foreground">Last updated</p><p className="mt-1 text-sm text-foreground">{formatDateTime(selected.last_updated)}</p></div>{selected.provider_message_id && <div className="sm:col-span-2"><p className="text-xs text-muted-foreground">Provider message ID</p><p className="mt-1 break-all font-mono text-xs text-foreground">{selected.provider_message_id}</p></div>}</div>

          {(selected.text_body || selected.html_body) && <div className="mt-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="text-sm font-semibold text-foreground">Sent email preview</h3><div className="flex gap-1 rounded-lg border border-border p-1">{selected.html_body && <Button size="sm" variant={previewMode === 'rendered' ? 'default' : 'ghost'} onClick={() => setPreviewMode('rendered')}>Rendered email</Button>}{selected.text_body && <Button size="sm" variant={previewMode === 'text' ? 'default' : 'ghost'} onClick={() => setPreviewMode('text')}>Plain text</Button>}</div></div>{previewMode === 'rendered' && selected.html_body ? <div className="mt-2 overflow-hidden rounded-lg border border-border bg-white"><div className="border-b border-border bg-secondary/50 px-3 py-2 text-xs text-muted-foreground">Isolated preview · scripts, links, styles, and remote images are disabled for safety</div><iframe title="Rendered sent email preview" sandbox="" referrerPolicy="no-referrer" srcDoc={"<!doctype html><html><head><meta charset=\"utf-8\"><meta name=\"viewport\" content=\"width=device-width, initial-scale=1\"><style>body{font-family:Arial,Helvetica,sans-serif;color:#222;margin:16px;overflow-wrap:anywhere}img{max-width:100%;height:auto}table{max-width:100%;border-collapse:collapse}td,th{overflow-wrap:anywhere}</style></head><body>" + createSafeEmailPreview(selected.html_body) + "</body></html>"} className="h-[420px] w-full bg-white" /></div> : selected.text_body ? <div className="mt-2 max-h-80 overflow-y-auto rounded-lg border border-border bg-background p-3"><pre className="whitespace-pre-wrap break-words text-xs leading-relaxed text-muted-foreground">{selected.text_body.slice(0, 12000)}{selected.text_body.length > 12000 ? '\n… preview truncated' : ''}</pre></div> : <p className="mt-2 rounded-lg border border-border p-3 text-xs text-muted-foreground">This message has no plain-text alternative.</p>}<p className="mt-2 text-xs text-muted-foreground">This preview is based on the content stored by MailForge. Email clients may display it differently.</p></div>}

          {(selected.error_details || selected.smtp_response || selected.smtp_code) && <div className="mt-4 rounded-lg border border-border p-3"><div className="flex items-start gap-2">{hasFailure ? <AlertTriangle className="mt-0.5 h-4 w-4 text-destructive" /> : <Server className="mt-0.5 h-4 w-4 text-muted-foreground" />}<div className="min-w-0 flex-1"><p className="text-sm font-medium text-foreground">{hasFailure ? 'What went wrong' : 'SMTP result'}</p><p className="mt-1 text-sm text-foreground">{hasFailure ? (selected.error_details || 'The delivery attempt failed. Review the technical response below.') : 'The configured SMTP server accepted the message. This does not confirm inbox placement.'}</p>{selected.smtp_code && <p className="mt-1 text-xs text-muted-foreground">Response code: {selected.smtp_code}</p>}</div></div><button type="button" className="mt-3 flex items-center gap-2 text-xs font-medium text-primary hover:underline" onClick={() => setShowDiagnostics((value) => !value)}>{showDiagnostics ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}{showDiagnostics ? 'Hide technical diagnostics' : 'Show technical diagnostics'}</button>{showDiagnostics && <div className="mt-3 space-y-3 border-t border-border pt-3"><div><p className="text-xs text-muted-foreground">Raw SMTP response</p><pre className="mt-1 whitespace-pre-wrap break-words rounded-md bg-background p-2 text-xs text-muted-foreground">{selected.smtp_response || 'No SMTP response recorded.'}</pre></div>{selected.error_details && <div><p className="text-xs text-muted-foreground">Error details</p><pre className="mt-1 whitespace-pre-wrap break-words rounded-md bg-background p-2 text-xs text-muted-foreground">{selected.error_details}</pre></div>}</div>}</div>}

          <h3 className="mt-5 text-sm font-semibold text-foreground">Delivery attempts <span className="font-normal text-muted-foreground">({attempts.length})</span></h3>
          <div className="mt-2 space-y-2">{attempts.length === 0 ? <p className="rounded-lg border border-dashed border-border p-4 text-sm text-muted-foreground">No SMTP attempts recorded yet. The message may still be queued.</p> : [...attempts].sort((a, b) => a.attempt_number - b.attempt_number).map((attempt) => <div key={attempt.id} className="rounded-lg border border-border p-3"><div className="flex flex-wrap items-start justify-between gap-2"><div className="flex items-center gap-2"><span className="flex h-6 w-6 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">{attempt.attempt_number}</span><div><p className="text-sm font-medium text-foreground">{attempt.status === 'accepted' ? 'SMTP server accepted message' : attempt.status === 'failed' ? 'Attempt failed' : attempt.status}</p><p className="mt-0.5 text-xs text-muted-foreground">{formatDateTime(attempt.created_at)}</p></div></div><div className="text-right"><p className="text-sm font-medium text-foreground">{attempt.response_code && attempt.response_code >= 200 && attempt.response_code < 300 ? 'Accepted' : attempt.status === 'failed' ? 'Failed' : 'Response recorded'}</p><p className="mt-0.5 text-xs text-muted-foreground">{duration(attempt.duration_ms)}</p></div></div>{attempt.response_text && attempt.status !== 'accepted' && <p className="mt-3 break-words border-t border-border pt-3 text-xs text-muted-foreground">Provider response: {attempt.response_text}</p>}</div>)}</div>

          <h3 className="mt-5 text-sm font-semibold text-foreground">Delivery timeline</h3>
          <div className="mt-2 space-y-0">{events.length === 0 ? <p className="text-sm text-muted-foreground">No lifecycle events recorded.</p> : events.map((event, index) => <div key={event.id} className="flex gap-3"><div className="flex flex-col items-center"><span className="mt-1.5 h-2.5 w-2.5 rounded-full bg-primary" />{index < events.length - 1 && <span className="my-1 min-h-5 w-px flex-1 bg-border" />}</div><div className="flex-1 pb-4"><p className="text-sm font-medium text-foreground">{eventLabel(event.event_type)}</p><p className="mt-1 text-xs text-muted-foreground">{event.description}</p><time className="mt-1 block text-xs text-muted-foreground">{formatDateTime(event.created_at)}</time></div></div>)}</div>

          <div className="mt-2 rounded-lg bg-secondary/50 p-3"><div className="flex gap-2"><Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><p className="text-xs leading-relaxed text-muted-foreground">An SMTP success response means the configured sending server accepted the message. MailForge only labels a message as delivered when a delivery-confirmation event is recorded.</p></div></div>
        </section>
      </div>}
    </div>
  );
}
