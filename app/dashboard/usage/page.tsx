'use client';

import { useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import { CreditCard, TrendingUp, Mail, CheckCircle2, AlertTriangle, XCircle } from 'lucide-react';

import { PageHeader } from '@/components/dashboard/page-header';
import { MockDataBanner } from '@/components/dashboard/feedback';
import { StatCard } from '@/components/dashboard/stat-card';
import { DateRangeFilter } from '@/components/dashboard/date-range-filter';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { generateUsageData, mockOverviewStats } from '@/lib/mock-data';

function formatDateTick(date: string) {
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

const statusColors = {
  delivered: 'hsl(var(--success))',
  bounced: 'hsl(var(--destructive))',
  failed: 'hsl(var(--warning))',
  deferred: 'hsl(var(--accent))',
};

export default function UsagePage() {
  const [range, setRange] = useState('30d');
  const days = range === '24h' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const data = generateUsageData(days);

  const totals = data.reduce(
    (acc, d) => ({
      submitted: acc.submitted + d.submitted,
      delivered: acc.delivered + d.delivered,
      bounced: acc.bounced + d.bounced,
      failed: acc.failed + d.failed,
      deferred: acc.deferred + d.deferred,
    }),
    { submitted: 0, delivered: 0, bounced: 0, failed: 0, deferred: 0 }
  );

  const pieData = [
    { name: 'Delivered', value: totals.delivered, color: statusColors.delivered },
    { name: 'Bounced', value: totals.bounced, color: statusColors.bounced },
    { name: 'Failed', value: totals.failed, color: statusColors.failed },
    { name: 'Deferred', value: totals.deferred, color: statusColors.deferred },
  ];

  const quotaPercent = Math.round((mockOverviewStats.apiQuotaUsed / mockOverviewStats.apiQuotaTotal) * 100);

  return (
    <div>
      <PageHeader
        title="Usage"
        description="Track your email volume and delivery performance across the current billing period."
        action={<DateRangeFilter value={range} onChange={setRange} />}
      />
      <MockDataBanner />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Submitted" value={totals.submitted.toLocaleString()} icon={Mail} subValue={`${days} day period`} />
        <StatCard label="Delivered" value={totals.delivered.toLocaleString()} icon={CheckCircle2} subValue={`${((totals.delivered / totals.submitted) * 100).toFixed(1)}% rate`} />
        <StatCard label="Bounced" value={totals.bounced.toLocaleString()} icon={AlertTriangle} subValue={`${((totals.bounced / totals.submitted) * 100).toFixed(1)}% rate`} />
        <StatCard label="Failed" value={totals.failed.toLocaleString()} icon={XCircle} subValue={`${((totals.failed / totals.submitted) * 100).toFixed(1)}% rate`} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">Daily Email Volume</h3>
            <p className="text-xs text-muted-foreground">Breakdown by delivery outcome per day</p>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} vertical={false} />
              <XAxis dataKey="date" tickFormatter={formatDateTick} tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: '12px' }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Bar dataKey="delivered" stackId="a" fill={statusColors.delivered} radius={[0, 0, 0, 0]} />
              <Bar dataKey="bounced" stackId="a" fill={statusColors.bounced} radius={[0, 0, 0, 0]} />
              <Bar dataKey="failed" stackId="a" fill={statusColors.failed} radius={[0, 0, 0, 0]} />
              <Bar dataKey="deferred" stackId="a" fill={statusColors.deferred} radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">Delivery Breakdown</h3>
            <p className="text-xs text-muted-foreground">Overall distribution</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {pieData.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ backgroundColor: 'hsl(var(--popover))', border: '1px solid hsl(var(--border))', borderRadius: '0.5rem', fontSize: '12px' }}
              />
              <Legend
                formatter={(value: string) => <span className="text-xs text-muted-foreground">{value}</span>}
                iconType="circle"
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Sending Limits</h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-end justify-between mb-2">
                <span className="text-xs text-muted-foreground">Monthly email quota</span>
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {mockOverviewStats.apiQuotaUsed.toLocaleString()} / {mockOverviewStats.apiQuotaTotal.toLocaleString()}
                </span>
              </div>
              <Progress value={quotaPercent} className="h-2" />
              <p className="mt-1.5 text-[11px] text-muted-foreground">{quotaPercent}% used · resets on Nov 1</p>
            </div>
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div>
                <p className="text-xs text-muted-foreground">Per-second rate</p>
                <p className="text-sm font-medium text-foreground">50 emails/s</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Concurrent requests</p>
                <p className="text-sm font-medium text-foreground">20</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Max recipients/email</p>
                <p className="text-sm font-medium text-foreground">1,000</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Max attachment size</p>
                <p className="text-sm font-medium text-foreground">10 MB</p>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Billing Period</h3>
          </div>
          <div className="rounded-lg border border-dashed border-border p-6 text-center">
            <CreditCard className="mx-auto h-8 w-8 text-muted-foreground/50" />
            <p className="mt-3 text-sm font-medium text-foreground">Growth Plan</p>
            <p className="mt-1 text-xs text-muted-foreground">
              100,000 emails/month · $49/month
            </p>
            <p className="mt-4 text-xs text-muted-foreground">
              Billing is not yet configured. This is a placeholder — billing integration will be added separately.
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-muted-foreground">Period start</p>
              <p className="text-sm font-medium text-foreground">Oct 1, 2026</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Period end</p>
              <p className="text-sm font-medium text-foreground">Oct 31, 2026</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
