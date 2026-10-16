'use client';

import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card } from '@/components/ui/card';
import type { UsageData } from '@/lib/types';

interface EmailVolumeChartProps {
  data: UsageData[];
}

const chartConfig = {
  submitted: { label: 'Submitted', color: 'hsl(var(--chart-1))' },
  delivered: { label: 'Delivered', color: 'hsl(var(--chart-3))' },
  bounced: { label: 'Bounced', color: 'hsl(var(--chart-5))' },
};

function formatDateTick(date: string) {
  const d = new Date(date);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export default function EmailVolumeChart({ data }: EmailVolumeChartProps) {
  return (
    <Card className="p-5 lg:col-span-2">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Email Volume</h3>
          <p className="text-xs text-muted-foreground">Submitted vs delivered vs bounced over time</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ background: chartConfig.submitted.color }} />
            Submitted
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ background: chartConfig.delivered.color }} />
            Delivered
          </span>
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="h-2 w-2 rounded-full" style={{ background: chartConfig.bounced.color }} />
            Bounced
          </span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorSubmitted" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartConfig.submitted.color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={chartConfig.submitted.color} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorDelivered" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartConfig.delivered.color} stopOpacity={0.3} />
              <stop offset="95%" stopColor={chartConfig.delivered.color} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="colorBounced" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={chartConfig.bounced.color} stopOpacity={0.2} />
              <stop offset="95%" stopColor={chartConfig.bounced.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.3} vertical={false} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateTick}
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'hsl(var(--popover))',
              border: '1px solid hsl(var(--border))',
              borderRadius: '0.5rem',
              fontSize: '12px',
            }}
            labelStyle={{ color: 'hsl(var(--foreground))' }}
          />
          <Area type="monotone" dataKey="submitted" stroke={chartConfig.submitted.color} strokeWidth={2} fill="url(#colorSubmitted)" />
          <Area type="monotone" dataKey="delivered" stroke={chartConfig.delivered.color} strokeWidth={2} fill="url(#colorDelivered)" />
          <Area type="monotone" dataKey="bounced" stroke={chartConfig.bounced.color} strokeWidth={1.5} fill="url(#colorBounced)" />
        </AreaChart>
      </ResponsiveContainer>
    </Card>
  );
}
