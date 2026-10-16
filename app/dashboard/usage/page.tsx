'use client';

import { useEffect, useState } from 'react';
import { Activity, CheckCircle2, Clock3, Mail, XCircle } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { apiRequest } from '@/lib/api';

type Usage = { stats: { totalSubmitted: number; totalDelivered: number; totalBounced: number; deliveryRate: number; totalDeferred: number; totalFailed: number; apiQuotaUsed: number; apiQuotaTotal: number } };
export default function UsagePage() {
  const [data, setData] = useState<Usage | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { apiRequest<Usage>('/v1/overview').then(setData).catch((err) => setError(err instanceof Error ? err.message : 'Could not load usage.')); }, []);
  const stats = data?.stats;
  const percent = stats?.apiQuotaTotal ? Math.min(100, stats.apiQuotaUsed / stats.apiQuotaTotal * 100) : 0;
  const metrics = [
    { label: 'Submitted', value: stats?.totalSubmitted ?? 0, icon: Mail },
    { label: 'Delivered', value: stats?.totalDelivered ?? 0, icon: CheckCircle2 },
    { label: 'Deferred / retrying', value: stats?.totalDeferred ?? 0, icon: Clock3 },
    { label: 'Failed', value: stats?.totalFailed ?? 0, icon: XCircle },
  ];
  return <div>
    <PageHeader title="Usage" description="Live message counts and the current starter quota estimate." />
    {error && <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    <Card className="p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="text-sm font-semibold text-foreground">Message volume</h2><p className="mt-1 text-xs text-muted-foreground">Counts reflect the email logs stored in your workspace.</p></div><Activity className="h-5 w-5 text-muted-foreground" /></div>
      <div className="mt-6 flex items-end justify-between"><span className="text-sm text-muted-foreground">Recorded submissions</span><span className="text-xl font-semibold text-foreground">{(stats?.apiQuotaUsed ?? 0).toLocaleString()} <span className="text-sm font-normal text-muted-foreground">/ {(stats?.apiQuotaTotal ?? 3000).toLocaleString()}</span></span></div>
      <Progress value={percent} className="mt-3 h-2" /><p className="mt-2 text-xs text-muted-foreground">{percent.toFixed(1)}% of the current starter quota estimate used.</p>
    </Card>
    <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">{metrics.map((metric) => <Card key={metric.label} className="p-5"><metric.icon className="h-5 w-5 text-muted-foreground" /><p className="mt-4 text-sm text-muted-foreground">{metric.label}</p><p className="mt-1 text-2xl font-semibold tabular-nums text-foreground">{metric.value.toLocaleString()}</p></Card>)}</div>
    <p className="mt-4 text-xs text-muted-foreground">This is usage reporting, not billing enforcement. Provider delivery/bounce webhooks and plan-based quotas are not implemented yet.</p>
  </div>;
}
