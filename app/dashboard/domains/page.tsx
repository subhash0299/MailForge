'use client';

import { FormEvent, useEffect, useState } from 'react';
import { CheckCircle2, Copy, Globe, Plus, RefreshCw, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { apiRequest } from '@/lib/api';
import { formatDate } from '@/lib/format';

type DomainRow = { id: string; domain: string; status: 'pending' | 'verified' | 'action_required' | 'disabled'; verification_token: string; spf_verified: number; dkim_verified: number; dmarc_verified: number; verified_at: string | null; created_at: string };
type DomainsResponse = { data: DomainRow[] };
type CreateResponse = { data: DomainRow & { verificationRecord: { type: string; name: string; value: string } } };

export default function DomainsPage() {
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [domain, setDomain] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [newRecord, setNewRecord] = useState<CreateResponse['data']['verificationRecord'] | null>(null);

  async function loadDomains() {
    try {
      const result = await apiRequest<DomainsResponse>('/v1/domains');
      setDomains(result.data);
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not load domains.'); }
  }

  useEffect(() => { void loadDomains(); }, []);

  async function addDomain(event: FormEvent) {
    event.preventDefault();
    setBusy(true); setError(''); setNotice(''); setNewRecord(null);
    try {
      const result = await apiRequest<CreateResponse>('/v1/domains', { method: 'POST', body: JSON.stringify({ domain }) });
      setNewRecord(result.data.verificationRecord);
      setDomain('');
      setNotice('Domain added. Publish this TXT record, then verify ownership.');
      await loadDomains();
    } catch (err) { setError(err instanceof Error ? err.message : 'Could not add domain.'); }
    finally { setBusy(false); }
  }

  async function verifyDomain(item: DomainRow) {
    setBusy(true); setError(''); setNotice('');
    try {
      await apiRequest(`/v1/domains/${item.id}/verify`, { method: 'POST', body: '{}' });
      setNotice(`${item.domain} ownership verified. Confirm SPF/DKIM authorization with your SMTP provider as well.`);
      await loadDomains();
    } catch (err) { setError(err instanceof Error ? err.message : 'Domain verification failed.'); }
    finally { setBusy(false); }
  }

  async function copy(value: string) {
    await navigator.clipboard.writeText(value);
    setNotice('Copied to clipboard.');
  }

  return (
    <div>
      <PageHeader title="Sending Domains" description="Connect a domain and prove ownership before using it as a sender." />
      {error && <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      {notice && <p role="status" className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">{notice}</p>}

      <Card className="p-5">
        <h2 className="text-sm font-semibold text-foreground">Add a sending domain</h2>
        <p className="mt-1 text-xs text-muted-foreground">Enter a domain you control, such as example.com. Do not enter a full email address or URL.</p>
        <form onSubmit={addDomain} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input aria-label="Domain name" required value={domain} onChange={(event) => setDomain(event.target.value)} placeholder="example.com" className="min-w-0 flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          <Button disabled={busy} type="submit"><Plus className="mr-2 h-4 w-4" />Add domain</Button>
        </form>
      </Card>

      {newRecord && <Card className="mt-4 p-5">
        <div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 text-primary" /><div className="min-w-0 flex-1"><h2 className="text-sm font-semibold text-foreground">Publish the ownership TXT record</h2><p className="mt-1 text-xs text-muted-foreground">Add this record at your DNS provider. DNS propagation can take a while.</p></div></div>
        <div className="mt-4 space-y-3 text-sm">
          <div><p className="text-xs text-muted-foreground">Type</p><p className="mt-1 font-mono text-foreground">{newRecord.type}</p></div>
          <div><p className="text-xs text-muted-foreground">Name / Host</p><div className="mt-1 flex items-center gap-2"><code className="min-w-0 break-all text-foreground">{newRecord.name}</code><Button size="sm" variant="outline" onClick={() => void copy(newRecord.name)}><Copy className="h-3.5 w-3.5" /></Button></div></div>
          <div><p className="text-xs text-muted-foreground">Value</p><div className="mt-1 flex items-start gap-2"><code className="min-w-0 flex-1 break-all rounded-md bg-background p-2 text-foreground">{newRecord.value}</code><Button size="sm" variant="outline" onClick={() => void copy(newRecord.value)}><Copy className="h-3.5 w-3.5" /></Button></div></div>
        </div>
      </Card>}

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between"><h2 className="text-sm font-semibold text-foreground">Connected domains ({domains.length})</h2><Button size="sm" variant="outline" onClick={() => void loadDomains()}><RefreshCw className="mr-2 h-3.5 w-3.5" />Refresh</Button></div>
        {domains.length === 0 ? <Card className="flex flex-col items-center p-10 text-center"><Globe className="h-8 w-8 text-muted-foreground" /><p className="mt-3 text-sm font-medium text-foreground">No domains connected</p><p className="mt-1 text-xs text-muted-foreground">Add a domain above to start ownership verification.</p></Card> :
          <div className="space-y-3">{domains.map((item) => <Card key={item.id} className="p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><Globe className="h-4 w-4 text-muted-foreground" /><span className="break-all text-sm font-medium text-foreground">{item.domain}</span><StatusBadge status={item.status as never} type="domain" /></div><p className="mt-1 text-xs text-muted-foreground">Added {formatDate(item.created_at)}{item.verified_at ? ` · Verified ${formatDate(item.verified_at)}` : ' · Ownership not verified'}</p></div>{item.status !== 'verified' && <Button size="sm" disabled={busy} onClick={() => void verifyDomain(item)}><CheckCircle2 className="mr-2 h-4 w-4" />Verify ownership</Button>}</div><p className="mt-3 text-xs text-muted-foreground">Ownership TXT verification proves domain control. Your SMTP provider must separately authorize this sender domain and configure its required SPF/DKIM records before delivery will succeed.</p></Card>)}</div>}
      </div>
    </div>
  );
}
