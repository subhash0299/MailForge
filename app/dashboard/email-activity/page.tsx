'use client';

import { useState, useMemo } from 'react';
import { Search, Filter, Mail } from 'lucide-react';

import { PageHeader } from '@/components/dashboard/page-header';
import { MockDataBanner, EmptyState } from '@/components/dashboard/feedback';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { DataTable } from '@/components/dashboard/data-table';
import { DateRangeFilter } from '@/components/dashboard/date-range-filter';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Card } from '@/components/ui/card';
import { mockEmailLogs } from '@/lib/mock-data';
import { formatRelativeTime, formatDateTime, formatTime } from '@/lib/format';
import type { EmailLog, EmailStatus } from '@/lib/types';

const statusFilters: { value: string; label: string }[] = [
  { value: 'all', label: 'All statuses' },
  { value: 'queued', label: 'Queued' },
  { value: 'processing', label: 'Processing' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'deferred', label: 'Deferred' },
  { value: 'bounced', label: 'Bounced' },
  { value: 'failed', label: 'Failed' },
];

const PAGE_SIZE = 12;

export default function EmailActivityPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selectedEmail, setSelectedEmail] = useState<EmailLog | null>(null);

  const filtered = useMemo(() => {
    return mockEmailLogs.filter((email) => {
      const matchesSearch =
        !search ||
        email.recipient.toLowerCase().includes(search.toLowerCase()) ||
        email.sender.toLowerCase().includes(search.toLowerCase()) ||
        email.subject.toLowerCase().includes(search.toLowerCase()) ||
        email.messageId.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = statusFilter === 'all' || email.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [search, statusFilter]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const columns = [
    {
      key: 'messageId',
      header: 'Message ID',
      render: (row: EmailLog) => (
        <span className="font-mono text-xs text-muted-foreground">{row.messageId.slice(0, 20)}...</span>
      ),
    },
    {
      key: 'recipient',
      header: 'Recipient',
      render: (row: EmailLog) => (
        <span className="text-sm text-foreground truncate">{row.recipient}</span>
      ),
    },
    {
      key: 'sender',
      header: 'Sender',
      render: (row: EmailLog) => (
        <span className="text-sm text-muted-foreground truncate">{row.sender}</span>
      ),
    },
    {
      key: 'subject',
      header: 'Subject',
      render: (row: EmailLog) => (
        <span className="text-sm text-foreground truncate max-w-[200px] block">{row.subject}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (row: EmailLog) => <StatusBadge status={row.status} />,
    },
    {
      key: 'submittedAt',
      header: 'Submitted',
      render: (row: EmailLog) => (
        <span className="text-xs text-muted-foreground">{formatRelativeTime(row.submittedAt)}</span>
      ),
    },
    {
      key: 'lastUpdated',
      header: 'Updated',
      render: (row: EmailLog) => (
        <span className="text-xs text-muted-foreground">{formatRelativeTime(row.lastUpdated)}</span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Email Activity"
        description="Search and filter your email delivery log. Click any message for full delivery details."
        action={<DateRangeFilter />}
      />
      <MockDataBanner />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by recipient, sender, subject, or message ID..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {statusFilters.map((s) => (
              <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={paginated}
        onRowClick={setSelectedEmail}
        emptyState={
          <EmptyState
            icon={Mail}
            title="No emails found"
            description="Try adjusting your search or filters to see email activity."
          />
        }
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          total: filtered.length,
          onPageChange: setPage,
        }}
      />

      <Sheet open={!!selectedEmail} onOpenChange={(open) => !open && setSelectedEmail(null)}>
        <SheetContent side="right" className="w-full overflow-y-auto scrollbar-thin sm:max-w-2xl">
          {selectedEmail && (
            <>
              <SheetHeader>
                <SheetTitle className="text-lg">Email Details</SheetTitle>
                <SheetDescription>
                  Message ID: <span className="font-mono text-xs">{selectedEmail.messageId}</span>
                </SheetDescription>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                <div className="flex items-center justify-between">
                  <StatusBadge status={selectedEmail.status} />
                  <span className="text-xs text-muted-foreground">
                    Submitted {formatRelativeTime(selectedEmail.submittedAt)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">From</p>
                    <p className="mt-1 text-sm text-foreground">{selectedEmail.sender}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">To</p>
                    <p className="mt-1 text-sm text-foreground">{selectedEmail.recipient}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Subject</p>
                    <p className="mt-1 text-sm text-foreground">{selectedEmail.subject}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Domain</p>
                    <p className="mt-1 text-sm text-foreground">{selectedEmail.domain}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Tags</p>
                    <div className="mt-1 flex gap-1.5">
                      {selectedEmail.tags?.map((tag) => (
                        <span key={tag} className="rounded bg-secondary px-1.5 py-0.5 text-[11px] text-muted-foreground">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {selectedEmail.smtpCode && (
                  <Card className="p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">SMTP Response</p>
                    <div className="mt-2 flex items-start gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-xs font-mono font-medium ${
                        selectedEmail.smtpCode >= 200 && selectedEmail.smtpCode < 300
                          ? 'bg-success/10 text-success'
                          : selectedEmail.smtpCode >= 400 && selectedEmail.smtpCode < 500
                          ? 'bg-warning/10 text-warning'
                          : selectedEmail.smtpCode >= 500
                          ? 'bg-destructive/10 text-destructive'
                          : 'bg-secondary text-muted-foreground'
                      }`}>
                        {selectedEmail.smtpCode}
                      </span>
                      <span className="font-mono text-xs text-foreground/90">{selectedEmail.smtpResponse}</span>
                    </div>
                  </Card>
                )}

                {selectedEmail.errorDetails && (
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
                    <p className="text-xs font-medium uppercase tracking-wider text-destructive">Error Details</p>
                    <p className="mt-1.5 text-sm text-foreground/90">{selectedEmail.errorDetails}</p>
                  </div>
                )}

                <div>
                  <h4 className="mb-3 text-sm font-semibold text-foreground">Delivery Attempts</h4>
                  <div className="space-y-2">
                    {selectedEmail.attempts.map((attempt) => (
                      <div key={attempt.id} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/20 p-3">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-secondary text-xs font-medium text-muted-foreground">
                          {attempt.attemptNumber}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <StatusBadge status={attempt.status} />
                            <span className="text-xs text-muted-foreground">{formatDateTime(attempt.timestamp)}</span>
                          </div>
                          <p className="mt-1 font-mono text-[11px] text-muted-foreground">
                            {attempt.smtpCode} · {attempt.smtpResponse}
                          </p>
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums">{attempt.durationMs}ms</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="mb-3 text-sm font-semibold text-foreground">Event History</h4>
                  <div className="space-y-2">
                    {selectedEmail.events.map((event) => (
                      <div key={event.id} className="flex items-start gap-3">
                        <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-primary" />
                        <div className="flex-1">
                          <p className="text-sm text-foreground">{event.description}</p>
                          <p className="text-xs text-muted-foreground">
                            <span className="font-mono">{event.type}</span> · {formatTime(event.timestamp)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
