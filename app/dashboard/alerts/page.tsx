'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, BellRing, CheckCircle2, Clock3, Globe, Mail, RefreshCw, ShieldAlert } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';
import { formatDateTime, formatRelativeTime } from '@/lib/format';

type EmailRow = { id: string; recipient: string; sender: string; subject: string | null; status: string; domain: string; smtp_code: number | null; error_details: string | null; submitted_at: string; last_updated: string };
type EmailResponse = { data: EmailRow[]; total: number };
type DomainRow = { id: string; domain: string; status: string; verified_at: string | null; created_at: string };
type DomainsResponse = { data: DomainRow[] };
type AlertItem = { id: string; severity: 'critical' | 'warning'; title: string; description: string; occurredAt: string; count: number; href: string; icon: typeof AlertTriangle; action: string };

export default function AlertsPage() {
  const [emails, setEmails] = useState<EmailRow[]>([]);
  const [domains, setDomains] = useState<DomainRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true); setError('');
    try {
      const [emailResult, domainResult] = await Promise.all([
        apiRequest<EmailResponse>('/v1/emails?limit=100&offset=0'),
        apiRequest<DomainsResponse>('/v1/domains'),
      ]);
      setEmails(emailResult.data);
      setDomains(domainResult.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load alerts.');
    } finally { setLoading(false); }
  }

  useEffect(() => { void load(); }, []);

  const alerts = useMemo<AlertItem[]>(() => {
    const result: AlertItem[] = [];
    const failed = emails.filter((email) => email.status === 'failed' || email.status === 'bounced');
    const deferred = emails.filter((email) => email.status === 'deferred');
    const pendingDomains = domains.filter((domain) => domain.status !== 'verified' && domain.status !== 'disabled');
    const now = new Date().toISOString();

    if (failed.length) {
      const newest = failed.reduce((latest, email) => email.last_updated > latest.last_updated ? email : latest, failed[0]);
      result.push({ id: 'delivery-failures', severity: 'critical', title: 'Email delivery failures', description: `${failed.length} failed or bounced message${failed.length === 1 ? '' : 's'} found in the latest 100 email records. Review recipient details and SMTP diagnostics.`, occurredAt: newest.last_updated || now, count: failed.length, href: '/dashboard/email-activity?status=failed', icon: AlertTriangle, action: 'Review failed emails' });
    }
    if (deferred.length) {
      const newest = deferred.reduce((latest, email) => email.last_updated > latest.last_updated ? email : latest, deferred[0]);
      result.push({ id: 'temporary-delays', severity: 'warning', title: 'Messages delayed or retrying', description: `${deferred.length} message${deferred.length === 1 ? ' is' : 's are'} currently deferred. Check whether the SMTP provider is temporarily unavailable or rate-limiting sends.`, occurredAt: newest.last_updated || now, count: deferred.length, href: '/dashboard/email-activity?status=deferred', icon: Clock3, action: 'Review delayed emails' });
    }
    if (pendingDomains.length) {
      const newest = pendingDomains.reduce((latest, domain) => domain.created_at > latest.created_at ? domain : latest, pendingDomains[0]);
      result.push({ id: 'domain-verification', severity: 'warning', title: 'Sending domains need attention', description: `${pendingDomains.length} domain${pendingDomains.length === 1 ? '' : 's'} are not verified. Domain ownership verification is separate from SPF/DKIM authorization by your SMTP provider.`, occurredAt: newest.created_at || now, count: pendingDomains.length, href: '/dashboard/domains', icon: Globe, action: 'Review sending domains' });
    }
    return result.sort((a, b) => (a.severity === b.severity ? b.occurredAt.localeCompare(a.occurredAt) : a.severity === 'critical' ? -1 : 1));
  }, [emails, domains]);

  const criticalCount = alerts.filter((alert) => alert.severity === 'critical').length;
  const warningCount = alerts.filter((alert) => alert.severity === 'warning').length;

  return (
    <div>
      <PageHeader title="Alerts" description="Actionable issues detected from your recorded email activity and sending-domain configuration." action={<Button size="sm" variant="outline" onClick={() => void load()} disabled={loading}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>} />
      {error && <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-xs text-muted-foreground">Open alert types</p><p className="mt-1 text-2xl font-semibold text-foreground">{loading ? '—' : alerts.length}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Critical</p><p className="mt-1 text-2xl font-semibold text-destructive">{loading ? '—' : criticalCount}</p></Card>
        <Card className="p-4"><p className="text-xs text-muted-foreground">Warnings</p><p className="mt-1 text-2xl font-semibold text-foreground">{loading ? '—' : warningCount}</p></Card>
      </div>
      <div className="mt-5 flex items-start gap-3 rounded-lg border border-border bg-secondary/40 p-3"><BellRing className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><p className="text-xs leading-relaxed text-muted-foreground">These alerts are generated from current backend records, not from inbox-placement guesses. This page currently checks the latest 100 email records plus connected domains; it does not yet send push or email notifications.</p></div>
      <div className="mt-5 space-y-3">
        {loading ? <Card className="p-10 text-center text-sm text-muted-foreground">Checking email and domain health…</Card> : alerts.length === 0 ? <Card className="flex flex-col items-center p-10 text-center"><CheckCircle2 className="h-8 w-8 text-success" /><p className="mt-3 text-sm font-semibold text-foreground">No active issues detected</p><p className="mt-1 max-w-md text-xs text-muted-foreground">No failures, deferred messages, or unverified domains were found in the records currently checked.</p></Card> : alerts.map((alert) => <Card key={alert.id} className="p-4"><div className="flex items-start gap-3"><div className={`rounded-lg p-2 ${alert.severity === 'critical' ? 'bg-destructive/10 text-destructive' : 'bg-warning/10 text-warning'}`}><alert.icon className="h-5 w-5" /></div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold text-foreground">{alert.title}</h2><span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${alert.severity === 'critical' ? 'border-destructive/20 bg-destructive/10 text-destructive' : 'border-warning/20 bg-warning/10 text-warning'}`}>{alert.severity === 'critical' ? 'Critical' : 'Warning'}</span><span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">{alert.count} affected</span></div><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{alert.description}</p><p className="mt-2 text-xs text-muted-foreground">Latest occurrence: {formatDateTime(alert.occurredAt)} · {formatRelativeTime(alert.occurredAt)}</p><Link href={alert.href} className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline">{alert.action}<span aria-hidden="true">→</span></Link></div></div></Card>)}
      </div>
      <div className="mt-5 rounded-lg border border-border p-4"><div className="flex gap-2"><ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" /><p className="text-xs leading-relaxed text-muted-foreground">Alerts are grouped by issue to avoid showing one card per failed message. More advanced alert rules, acknowledgment/resolution history, bounce-rate thresholds, and DNS-based SPF/DKIM/DMARC checks are a follow-up phase.</p></div></div>
    </div>
  );
}
