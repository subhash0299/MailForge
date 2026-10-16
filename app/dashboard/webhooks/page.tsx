'use client';

import { useState } from 'react';
import {
  Webhook,
  Plus,
  Trash2,
  Send,
  CheckCircle2,
  XCircle,
  Clock,
  Copy,
  Check,
} from 'lucide-react';

import { PageHeader } from '@/components/dashboard/page-header';
import { MockDataBanner, EmptyState } from '@/components/dashboard/feedback';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { mockWebhooks } from '@/lib/mock-data';
import { formatRelativeTime, formatDateTime } from '@/lib/format';
import type { WebhookEndpoint, WebhookEvent } from '@/lib/types';

const allEvents: WebhookEvent[] = [
  'email.queued',
  'email.accepted',
  'email.delivered',
  'email.deferred',
  'email.bounced',
  'email.failed',
];

const eventLabels: Record<WebhookEvent, string> = {
  'email.queued': 'Email Queued',
  'email.accepted': 'Email Accepted',
  'email.delivered': 'Email Delivered',
  'email.deferred': 'Email Deferred',
  'email.bounced': 'Email Bounced',
  'email.failed': 'Email Failed',
};

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookEndpoint[]>(mockWebhooks);
  const [addOpen, setAddOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<WebhookEvent[]>(['email.delivered', 'email.bounced', 'email.failed']);
  const [urlError, setUrlError] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<WebhookEndpoint | null>(null);
  const [testTarget, setTestTarget] = useState<WebhookEndpoint | null>(null);
  const [testResult, setTestResult] = useState<{ success: boolean; code: number; time: number } | null>(null);
  const [copiedSecret, setCopiedSecret] = useState(false);

  const handleAdd = () => {
    setUrlError('');
    if (!url.trim()) { setUrlError('Please enter a webhook URL.'); return; }
    try { new URL(url.trim()); } catch { setUrlError('Please enter a valid URL.'); return; }
    if (!url.startsWith('https://')) { setUrlError('Webhook URL must use HTTPS.'); return; }
    if (selectedEvents.length === 0) { setUrlError('Select at least one event.'); return; }
    const wh: WebhookEndpoint = {
      id: `wh_${Date.now()}`,
      url: url.trim(),
      events: selectedEvents,
      status: 'active',
      createdAt: new Date().toISOString(),
      lastAttemptAt: null,
      lastResponseCode: null,
      successRate: 100,
      secret: `whsec_${Math.random().toString(36).slice(2, 18)}`,
      recentAttempts: [],
    };
    setWebhooks([wh, ...webhooks]);
    setUrl(''); setSelectedEvents(['email.delivered', 'email.bounced', 'email.failed']);
    setAddOpen(false);
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    setWebhooks((prev) => prev.filter((w) => w.id !== deleteTarget.id));
    setDeleteTarget(null);
  };

  const handleTest = () => {
    if (!testTarget) return;
    setTimeout(() => {
      setTestResult({ success: true, code: 200, time: 142 });
    }, 1200);
  };

  const toggleEvent = (event: WebhookEvent) => {
    setSelectedEvents((prev) => prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event]);
  };

  const copySecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    setCopiedSecret(true);
    setTimeout(() => setCopiedSecret(false), 2000);
  };

  return (
    <div>
      <PageHeader
        title="Webhooks"
        description="Receive real-time HTTP notifications for email events. Payloads are signed with HMAC for verification."
        action={
          <Button onClick={() => setAddOpen(true)} size="sm">
            <Plus className="h-4 w-4" />
            Add Endpoint
          </Button>
        }
      />
      <MockDataBanner />

      {webhooks.length === 0 ? (
        <EmptyState
          icon={Webhook}
          title="No webhook endpoints"
          description="Add a webhook endpoint to receive real-time email event notifications."
          action={<Button onClick={() => setAddOpen(true)} size="sm"><Plus className="h-4 w-4" />Add Endpoint</Button>}
        />
      ) : (
        <div className="space-y-4">
          {webhooks.map((wh) => (
            <Card key={wh.id} className="overflow-hidden">
              <div className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/60">
                      <Webhook className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-foreground">{wh.url}</span>
                        <StatusBadge status={wh.status} type="webhook" />
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        {wh.events.map((ev) => (
                          <span key={ev} className="rounded bg-secondary px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">
                            {ev}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => { setTestTarget(wh); setTestResult(null); }}>
                      <Send className="h-3.5 w-3.5" />
                      Test
                    </Button>
                    <Button variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => setDeleteTarget(wh)}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Success Rate</p>
                    <p className="mt-0.5 text-sm font-medium tabular-nums text-foreground">{wh.successRate}%</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Last Response</p>
                    <p className="mt-0.5 text-sm font-medium tabular-nums text-foreground">
                      {wh.lastResponseCode ?? '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Last Attempt</p>
                    <p className="mt-0.5 text-sm text-foreground">
                      {wh.lastAttemptAt ? formatRelativeTime(wh.lastAttemptAt) : 'Never'}
                    </p>
                  </div>
                  <div>
                    <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Created</p>
                    <p className="mt-0.5 text-sm text-foreground">{formatRelativeTime(wh.createdAt)}</p>
                  </div>
                </div>

                <div className="mt-3 rounded-md bg-secondary/30 p-2.5">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-muted-foreground">Signing Secret:</span>
                    <code className="font-mono text-xs text-foreground/80">{wh.secret.slice(0, 8)}••••••••••</code>
                    <button onClick={() => copySecret(wh.secret)} className="text-muted-foreground hover:text-foreground">
                      {copiedSecret ? <Check className="h-3 w-3 text-success" /> : <Copy className="h-3 w-3" />}
                    </button>
                  </div>
                </div>
              </div>

              {wh.recentAttempts.length > 0 && (
                <div className="border-t border-border p-4">
                  <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Recent Attempts</h4>
                  <div className="space-y-2">
                    {wh.recentAttempts.map((attempt) => (
                      <div key={attempt.id} className="flex items-center gap-3 rounded-md bg-secondary/20 px-3 py-2">
                        {attempt.success ? (
                          <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                        ) : (
                          <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs text-foreground">{attempt.event}</span>
                            <span className="text-xs text-muted-foreground">{formatDateTime(attempt.timestamp)}</span>
                          </div>
                          <div className="flex items-center gap-3 mt-0.5 text-[11px] text-muted-foreground">
                            <span>HTTP {attempt.statusCode}</span>
                            <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{attempt.responseTimeMs}ms</span>
                            {attempt.retryCount > 0 && <span>{attempt.retryCount} retries</span>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Webhook Endpoint</DialogTitle>
            <DialogDescription>
              Configure an HTTPS endpoint to receive signed webhook payloads for selected events.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="whurl">Endpoint URL</Label>
              <Input id="whurl" placeholder="https://your-app.com/webhooks/mailforge" value={url} onChange={(e) => setUrl(e.target.value)} />
              {urlError && <p className="text-xs text-destructive">{urlError}</p>}
            </div>
            <div className="space-y-2">
              <Label>Events to subscribe</Label>
              <div className="grid grid-cols-2 gap-2">
                {allEvents.map((ev) => (
                  <label key={ev} className="flex items-center gap-2 rounded-md border border-border p-2.5 cursor-pointer hover:bg-secondary/30 transition-colors">
                    <Checkbox checked={selectedEvents.includes(ev)} onCheckedChange={() => toggleEvent(ev)} />
                    <span className="text-xs font-mono text-foreground">{ev}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add Endpoint</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!testTarget} onOpenChange={(open) => { if (!open) { setTestTarget(null); setTestResult(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Test Webhook</DialogTitle>
            <DialogDescription>
              A test payload will be sent to <span className="font-mono text-xs">{testTarget?.url}</span> with a sample email.delivered event.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            {!testResult ? (
              <div className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-foreground" />
                Sending test payload...
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2.5 rounded-lg border border-success/20 bg-success/5 p-3">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Test delivered</p>
                    <p className="text-xs text-muted-foreground">
                      HTTP {testResult.code} · {testResult.time}ms response time
                    </p>
                  </div>
                </div>
                <pre className="rounded-lg border border-border bg-secondary/30 p-3 text-xs overflow-x-auto scrollbar-thin">
{JSON.stringify({
  event: "email.delivered",
  timestamp: new Date().toISOString(),
  data: {
    message_id: "msg_test_001",
    recipient: "test@example.com",
    sender: "no-reply@mailforge.dev",
    subject: "Test webhook delivery",
  },
}, null, 2)}
                </pre>
              </div>
            )}
          </div>
          <DialogFooter>
            {!testResult ? (
              <Button variant="outline" onClick={() => { setTestTarget(null); setTestResult(null); }}>Cancel</Button>
            ) : (
              <Button onClick={() => { setTestTarget(null); setTestResult(null); }}>Close</Button>
            )}
            {!testResult && <Button onClick={handleTest}>Send Test</Button>}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Webhook?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the webhook endpoint for <span className="font-mono text-xs">{deleteTarget?.url}</span>. You will stop receiving event notifications at this URL.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
