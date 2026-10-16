'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import {
  Mail,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  Activity,
  Globe,
  Zap,
  AlertCircle,
} from 'lucide-react';

import { StatCard } from '@/components/dashboard/stat-card';
import { PageHeader } from '@/components/dashboard/page-header';
import { MockDataBanner } from '@/components/dashboard/feedback';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { DateRangeFilter } from '@/components/dashboard/date-range-filter';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import {
  mockOverviewStats,
  mockEmailLogs,
  mockDomains,
  mockRecentErrors,
  generateUsageData,
} from '@/lib/mock-data';
import { formatRelativeTime } from '@/lib/format';
import type { UsageData } from '@/lib/types';

const EmailVolumeChart = dynamic(
  () => import('@/components/dashboard/email-volume-chart'),
  { ssr: false, loading: () => <div className="h-[340px] animate-pulse rounded-lg bg-secondary/30" /> }
);


export default function OverviewPage() {
  const [range, setRange] = useState('7d');
  const days = range === '24h' ? 1 : range === '7d' ? 7 : range === '30d' ? 30 : 90;
  const usageData = generateUsageData(days);
  const recentEmails = mockEmailLogs.slice(0, 6);
  const verifiedDomains = mockDomains.filter((d) => d.status === 'verified').length;
  const totalDomains = mockDomains.length;

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Monitor your email delivery performance and infrastructure health."
        action={<DateRangeFilter value={range} onChange={setRange} />}
      />
      <MockDataBanner />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Emails Submitted"
          value={mockOverviewStats.totalSubmitted.toLocaleString()}
          trend={{ value: '+12.3%', positive: true }}
          subValue="vs previous period"
          icon={Mail}
        />
        <StatCard
          label="Delivered"
          value={mockOverviewStats.totalDelivered.toLocaleString()}
          trend={{ value: '+8.7%', positive: true }}
          subValue="91.7% delivery rate"
          icon={CheckCircle2}
        />
        <StatCard
          label="Bounced"
          value={mockOverviewStats.totalBounced.toLocaleString()}
          trend={{ value: '-2.1%', positive: true }}
          subValue="4.0% bounce rate"
          icon={AlertTriangle}
        />
        <StatCard
          label="Delivery Rate"
          value={`${mockOverviewStats.deliveryRate}%`}
          trend={{ value: '+1.2%', positive: true }}
          subValue="rolling average"
          icon={TrendingUp}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <EmailVolumeChart data={usageData} />

        <Card className="p-5">
          <div className="mb-4">
            <h3 className="text-sm font-semibold text-foreground">API Usage</h3>
            <p className="text-xs text-muted-foreground">Current billing period</p>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex items-end justify-between mb-2">
                <span className="text-xs text-muted-foreground">Emails sent</span>
                <span className="text-sm font-semibold tabular-nums text-foreground">
                  {mockOverviewStats.apiQuotaUsed.toLocaleString()}
                </span>
              </div>
              <Progress value={48} className="h-2" />
              <div className="mt-1.5 flex justify-between text-[11px] text-muted-foreground">
                <span>{Math.round(mockOverviewStats.apiQuotaUsed / mockOverviewStats.apiQuotaTotal * 100)}% used</span>
                <span>{mockOverviewStats.apiQuotaTotal.toLocaleString()} limit</span>
              </div>
            </div>
            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Deferred</span>
                <span className="font-medium tabular-nums text-foreground">{mockOverviewStats.totalDeferred.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Failed</span>
                <span className="font-medium tabular-nums text-foreground">{mockOverviewStats.totalFailed.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">Verified domains</span>
                <span className="font-medium tabular-nums text-foreground">{verifiedDomains} / {totalDomains}</span>
              </div>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">Recent Email Activity</h3>
            <a href="/dashboard/email-activity" className="text-xs font-medium text-primary hover:underline">
              View all
            </a>
          </div>
          <div className="space-y-1">
            {recentEmails.map((email) => (
              <div
                key={email.id}
                className="flex items-center justify-between rounded-md px-3 py-2.5 transition-colors hover:bg-secondary/30"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <Activity className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{email.subject}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      to {email.recipient} · {formatRelativeTime(email.submittedAt)}
                    </p>
                  </div>
                </div>
                <StatusBadge status={email.status} />
              </div>
            ))}
          </div>
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <Globe className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Domain Status</h3>
            </div>
            <div className="space-y-2">
              {mockDomains.slice(0, 4).map((domain) => (
                <div key={domain.id} className="flex items-center justify-between">
                  <span className="truncate text-xs text-foreground/90">{domain.domain}</span>
                  <StatusBadge status={domain.status} type="domain" />
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5">
            <div className="mb-3 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Recent Errors</h3>
            </div>
            <div className="space-y-2.5">
              {mockRecentErrors.slice(0, 4).map((err) => (
                <div key={err.id} className="flex items-start gap-2">
                  <span
                    className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${
                      err.level === 'error' ? 'bg-destructive' : 'bg-warning'
                    }`}
                  />
                  <div className="min-w-0">
                    <p className="text-xs leading-tight text-foreground/90">{err.message}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {err.source} · {formatRelativeTime(err.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
