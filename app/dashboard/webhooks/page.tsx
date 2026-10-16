'use client';

import { Clock, Webhook, ShieldCheck } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card } from '@/components/ui/card';

export default function WebhooksPage() {
  return (
    <div>
      <PageHeader
        title="Webhooks"
        description="Receive notifications when email events occur."
      />
      <Card className="mx-auto mt-8 flex max-w-2xl flex-col items-center px-6 py-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10">
          <Webhook className="h-8 w-8 text-primary" />
        </div>
        <span className="mt-5 inline-flex items-center gap-2 rounded-full border border-border bg-secondary/50 px-3 py-1 text-xs font-medium text-muted-foreground">
          <Clock className="h-3.5 w-3.5" /> Coming soon
        </span>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Webhooks are on the way</h2>
        <p className="mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
          We’re building secure, reliable webhook delivery with signed event payloads, automatic retries, and delivery history. This section will be available once those features are ready.
        </p>
        <div className="mt-6 flex items-center gap-2 rounded-lg bg-secondary/40 px-4 py-3 text-left text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0" />
          <span>Webhook configuration is disabled for now. No test endpoints or simulated delivery attempts are shown.</span>
        </div>
      </Card>
    </div>
  );
}
