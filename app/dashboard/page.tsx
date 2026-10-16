'use client';

import { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, Mail, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { StatCard } from '@/components/dashboard/stat-card';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { apiRequest } from '@/lib/api';
import { formatRelativeTime } from '@/lib/format';

type Overview = {
  stats: { totalSubmitted: number; totalDelivered: number; totalBounced: number; deliveryRate: number; totalDeferred: number; totalFailed: number; apiQuotaUsed: number; apiQuotaTotal: number };
  domains: { total: number; verified: number };
  recentEmails: Array<{ id: string; recipient: string; sender: string; subject: string | null; status: string; submitted_at: string; last_updated: string; domain: string; smtp_code: number | null; error_details: string | null }>;
};

export default function OverviewPage() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    apiRequest<Overview>('/v1/overview')
      .then((data) => { if (active) setOverview(data); })
      .catch((err) => { if (active) setError(err instanceof Error ? err.message : 'Could not load overview.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const stats = overview?.stats;
  const percent = stats?.apiQuotaTotal ? Math.min(100, stats.apiQuotaUsed / stats.apiQuotaTotal * 100) : 0;

  return (
    <div>
      <PageHeader title="Overview" description="Live email activity and delivery performance from your MailForge workspace." />
      {error && <div role="alert" className="mb-5 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Emails Submitted" value={loading ? '—' : (stats?.totalSubmitted ?? 0).toLocaleString()} subValue="All time" icon={Mail} />
        <StatCard label="Accepted / Delivered" value={loading ? '—' : (stats?.totalDelivered ?? 0).toLocaleString()} subValue="Confirmed delivery events only" icon={CheckCircle2} />
        <StatCard label="Bounced" value={loading ? '—' : (stats?.totalBounced ?? 0).toLocaleString()} subValue="Provider-reported bounces" icon={AlertTriangle} />
        <StatCard label="Delivery Rate" value={loading ? '—' : `${stats?.deliveryRate ?? 0}%`} subValue="Based on recorded delivered events" icon={TrendingUp} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div><h2 className="text-sm font-semibold text-foreground">Recent Email Activity</h2><p className="mt-1 text-xs text-muted-foreground">Latest messages recorded by the backend</p></div>
            <a href="/dashboard/email-activity" className="text-xs font-medium text-primary hover:underline">View all</a>
          </div>
          {loading ? <p className="py-8 text-center text-sm text-muted-foreground">Loading activity…</p> :
            !overview?.recentEmails.length ? <div className="py-10 text-center"><Activity className="mx-auto h-7 w-7 text-muted-foreground" /><p className="mt-3 text-sm font-medium text-foreground">No emails yet</p><p className="mt-1 text-xs text-muted-foreground">Create an API key and send your first message to see it here.</p></div> :
            <div className="divide-y divide-border">{overview.recentEmails.map((email) => <div key={email.id} className="flex items-center justify-between gap-3 py-3"><div className="flex min-w-0 items-start gap-3"><Activity className="mt-1 h-4 w-4 shrink-0 text-muted-foreground" /><div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{email.subject || '(no subject)'}</p><p className="truncate text-xs text-muted-foreground">to {email.recipient} · {formatRelativeTime(email.submitted_at)}</p></div></div><StatusBadge status={email.status as never} /></div>)}</div>}
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-foreground">Usage</h2>
            <p className="mt-1 text-xs text-muted-foreground">Messages recorded by MailForge</p>
            <div className="mt-5 flex items-end justify-between"><span className="text-xs text-muted-foreground">Submitted</span><span className="text-sm font-semibold tabular-nums text-foreground">{(stats?.apiQuotaUsed ?? 0).toLocaleString()} / {(stats?.apiQuotaTotal ?? 3000).toLocaleString()}</span></div>
            <Progress value={percent} className="mt-2 h-2" />
            <div className="mt-4 space-y-3"><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Deferred / retrying</span><span className="font-medium text-foreground">{stats?.totalDeferred ?? 0}</span></div><div className="flex items-center justify-between text-xs"><span className="text-muted-foreground">Failed</span><span className="font-medium text-foreground">{stats?.totalFailed ?? 0}</span></div></div>
          </Card>
          <Card className="p-5">
            <h2 className="text-sm font-semibold text-foreground">Sending Domains</h2>
            <p className="mt-1 text-xs text-muted-foreground">Verified sender domains in this workspace</p>
            <p className="mt-4 text-2xl font-semibold text-foreground">{overview?.domains.verified ?? 0}<span className="text-sm font-normal text-muted-foreground"> / {overview?.domains.total ?? 0} verified</span></p>
            <a href="/dashboard/domains" className="mt-3 inline-block text-xs font-medium text-primary hover:underline">Manage domains</a>
          </Card>
        </div>
      </div>
    </div>
  );
}
