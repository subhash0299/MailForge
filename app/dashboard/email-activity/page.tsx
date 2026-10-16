'use client';

import { useEffect, useState } from 'react';
import { Activity, Search, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';
import { formatDateTime, formatRelativeTime } from '@/lib/format';

type EmailRow = { id: string; recipient: string; sender: string; subject: string | null; status: string; domain: string; smtp_code: number | null; smtp_response: string | null; error_details: string | null; tags_json: string | null; submitted_at: string; last_updated: string };
type EmailResponse = { data: EmailRow[]; total: number; limit: number; offset: number };
type DetailResponse = { data: EmailRow & { attempts: Array<{ id: string; attempt_number: number; status: string; response_code: number | null; response_text: string | null; duration_ms: number; created_at: string }>; events: Array<{ id: string; event_type: string; description: string; created_at: string }> } };

const statuses = ['all', 'queued', 'processing', 'accepted', 'delivered', 'deferred', 'bounced', 'failed'];

export default function EmailActivityPage() {
  const [rows, setRows] = useState<EmailRow[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [offset, setOffset] = useState(0);
  const [selected, setSelected] = useState<DetailResponse['data'] | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

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

  useEffect(() => { void load(); }, [offset, status]);
  useEffect(() => { const timer = window.setTimeout(() => { setOffset(0); void load(); }, 250); return () => window.clearTimeout(timer); }, [search]);

  async function showDetails(id: string) {
    setError('');
    try {
      const result = await apiRequest<DetailResponse>(`/v1/emails/${id}`);
      setSelected(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load message details.');
    }
  }

  return (
    <div>
      <PageHeader title="Email Activity" description="Live message logs, SMTP responses, and delivery attempts from your workspace." action={<Button variant="outline" size="sm" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>} />
      {error && <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><input aria-label="Search email activity" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search recipient, sender, or subject…" className="w-full rounded-md border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus:border-primary" /></div>
          <select aria-label="Filter by status" value={status} onChange={(event) => { setStatus(event.target.value); setOffset(0); }} className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary">{statuses.map((item) => <option key={item} value={item}>{item === 'all' ? 'All statuses' : item.charAt(0).toUpperCase() + item.slice(1)}</option>)}</select>
        </div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left">
            <thead><tr className="border-b border-border text-xs text-muted-foreground"><th className="px-3 py-3 font-medium">Recipient / Subject</th><th className="px-3 py-3 font-medium">Sender</th><th className="px-3 py-3 font-medium">Status</th><th className="px-3 py-3 font-medium">SMTP</th><th className="px-3 py-3 font-medium">Submitted</th><th className="px-3 py-3 font-medium"></th></tr></thead>
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
        <section role="dialog" aria-modal="true" aria-labelledby="email-detail-title" className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-xl border border-border bg-card p-5 shadow-2xl">
          <div className="flex items-start justify-between gap-4"><div><h2 id="email-detail-title" className="text-lg font-semibold text-foreground">Message details</h2><p className="mt-1 break-all text-xs text-muted-foreground">{selected.id}</p></div><Button variant="outline" size="sm" onClick={() => setSelected(null)}>Close</Button></div>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2"><div><p className="text-xs text-muted-foreground">Recipient</p><p className="mt-1 break-all text-sm text-foreground">{selected.recipient}</p></div><div><p className="text-xs text-muted-foreground">Sender</p><p className="mt-1 break-all text-sm text-foreground">{selected.sender}</p></div><div><p className="text-xs text-muted-foreground">Subject</p><p className="mt-1 text-sm text-foreground">{selected.subject || '(no subject)'}</p></div><div><p className="text-xs text-muted-foreground">Status</p><div className="mt-1"><StatusBadge status={selected.status as never} /></div></div></div>
          {(selected.error_details || selected.smtp_response) && <div className="mt-4 rounded-lg border border-border bg-background p-3"><p className="text-xs font-medium text-foreground">Last SMTP response / error</p><p className="mt-1 whitespace-pre-wrap break-words text-xs text-muted-foreground">{selected.error_details || selected.smtp_response}</p></div>}
          <h3 className="mt-5 text-sm font-semibold text-foreground">Delivery attempts ({selected.attempts.length})</h3>
          <div className="mt-2 space-y-2">{selected.attempts.length === 0 ? <p className="text-xs text-muted-foreground">No delivery attempts recorded yet.</p> : selected.attempts.map((attempt) => <div key={attempt.id} className="rounded-lg border border-border p-3"><div className="flex flex-wrap items-center justify-between gap-2"><span className="text-sm font-medium text-foreground">Attempt {attempt.attempt_number}</span><span className="text-xs text-muted-foreground">{attempt.response_code ?? 'No SMTP code'} · {attempt.duration_ms} ms · {formatRelativeTime(attempt.created_at)}</span></div><p className="mt-1 break-words text-xs text-muted-foreground">{attempt.response_text || attempt.status}</p></div>)}</div>
          <h3 className="mt-5 text-sm font-semibold text-foreground">Events</h3>
          <div className="mt-2 space-y-2">{selected.events.map((event) => <div key={event.id} className="flex justify-between gap-4 rounded-lg border border-border p-3"><div><p className="text-xs font-medium text-foreground">{event.event_type}</p><p className="mt-1 text-xs text-muted-foreground">{event.description}</p></div><time className="shrink-0 text-xs text-muted-foreground">{formatRelativeTime(event.created_at)}</time></div>)}</div>
        </section>
      </div>}
    </div>
  );
}
