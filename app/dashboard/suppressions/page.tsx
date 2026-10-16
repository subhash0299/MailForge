'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Ban, Plus, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';
import { formatDate } from '@/lib/format';

type SuppressionRow = { id: string; email: string; reason: 'hard_bounce' | 'spam_complaint' | 'manual'; domain: string | null; detail: string | null; created_at: string };
type SuppressionsResponse = { data: SuppressionRow[] };

export default function SuppressionsPage() {
  const [items, setItems] = useState<SuppressionRow[]>([]);
  const [email, setEmail] = useState('');
  const [reason, setReason] = useState<SuppressionRow['reason']>('manual');
  const [detail, setDetail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function load() {
    try { const result = await apiRequest<SuppressionsResponse>('/v1/suppressions'); setItems(result.data); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not load suppressions.'); }
  }
  useEffect(() => { void load(); }, []);

  async function add(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try {
      await apiRequest('/v1/suppressions', { method: 'POST', body: JSON.stringify({ email, reason, detail }) });
      setEmail(''); setDetail(''); await load();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not add suppression.'); }
    finally { setBusy(false); }
  }

  async function remove(item: SuppressionRow) {
    if (!window.confirm(`Remove ${item.email} from the suppression list?`)) return;
    setError('');
    try { await apiRequest(`/v1/suppressions/${item.id}`, { method: 'DELETE' }); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not remove suppression.'); }
  }

  return (
    <div>
      <PageHeader title="Suppressions" description="Prevent messages from being queued to addresses that should not receive email." />
      {error && <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <Card className="p-5">
        <h2 className="text-sm font-semibold text-foreground">Add recipient to suppression list</h2>
        <form onSubmit={add} className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input aria-label="Email address" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="recipient@example.com" className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          <select aria-label="Reason" value={reason} onChange={(event) => setReason(event.target.value as SuppressionRow['reason'])} className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"><option value="manual">Manual</option><option value="hard_bounce">Hard bounce</option><option value="spam_complaint">Spam complaint</option></select>
          <input aria-label="Details" value={detail} onChange={(event) => setDetail(event.target.value)} maxLength={500} placeholder="Optional note" className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary sm:col-span-2" />
          <div><Button type="submit" disabled={busy}><Plus className="mr-2 h-4 w-4" />{busy ? 'Adding…' : 'Add suppression'}</Button></div>
        </form>
      </Card>
      <div className="mt-6"><h2 className="mb-3 text-sm font-semibold text-foreground">Suppressed recipients ({items.length})</h2>
        {items.length === 0 ? <Card className="flex flex-col items-center p-10 text-center"><Ban className="h-8 w-8 text-muted-foreground" /><p className="mt-3 text-sm font-medium text-foreground">No suppressed recipients</p><p className="mt-1 text-xs text-muted-foreground">Addresses you add here will be blocked from new MailForge sends.</p></Card> :
          <Card className="overflow-hidden"><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left"><thead><tr className="border-b border-border bg-secondary/40 text-xs text-muted-foreground"><th className="px-4 py-3 font-medium">Email</th><th className="px-4 py-3 font-medium">Reason</th><th className="px-4 py-3 font-medium">Details</th><th className="px-4 py-3 font-medium">Added</th><th className="px-4 py-3"></th></tr></thead><tbody>{items.map((item) => <tr key={item.id} className="border-b border-border/70 last:border-0"><td className="px-4 py-3 text-sm text-foreground">{item.email}</td><td className="px-4 py-3 text-xs text-muted-foreground">{item.reason.replace('_', ' ')}</td><td className="max-w-[220px] truncate px-4 py-3 text-xs text-muted-foreground">{item.detail || '—'}</td><td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(item.created_at)}</td><td className="px-4 py-3"><Button size="sm" variant="outline" onClick={() => void remove(item)}><Trash2 className="mr-2 h-3.5 w-3.5" />Remove</Button></td></tr>)}</tbody></table></div></Card>}
      </div>
    </div>
  );
}
