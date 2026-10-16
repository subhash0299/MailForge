import { cn } from '@/lib/utils';
import type { EmailStatus, DomainStatus, KeyType, WebhookStatus, SuppressionReason } from '@/lib/types';

const emailStatusConfig: Record<EmailStatus, { label: string; className: string; dot: string }> = {
  queued: { label: 'Queued', className: 'bg-muted text-muted-foreground border-border', dot: 'bg-muted-foreground' },
  processing: { label: 'Processing', className: 'bg-accent/10 text-accent border-accent/20', dot: 'bg-accent' },
  accepted: { label: 'Accepted', className: 'bg-accent/10 text-accent border-accent/20', dot: 'bg-accent' },
  delivered: { label: 'Delivered', className: 'bg-success/10 text-success border-success/20', dot: 'bg-success' },
  deferred: { label: 'Deferred', className: 'bg-warning/10 text-warning border-warning/20', dot: 'bg-warning' },
  bounced: { label: 'Bounced', className: 'bg-destructive/10 text-destructive border-destructive/20', dot: 'bg-destructive' },
  failed: { label: 'Failed', className: 'bg-destructive/10 text-destructive border-destructive/20', dot: 'bg-destructive' },
};

const domainStatusConfig: Record<DomainStatus, { label: string; className: string; dot: string }> = {
  pending: { label: 'Pending', className: 'bg-warning/10 text-warning border-warning/20', dot: 'bg-warning' },
  verified: { label: 'Verified', className: 'bg-success/10 text-success border-success/20', dot: 'bg-success' },
  action_required: { label: 'Action Required', className: 'bg-destructive/10 text-destructive border-destructive/20', dot: 'bg-destructive' },
};

const webhookStatusConfig: Record<WebhookStatus, { label: string; className: string; dot: string }> = {
  active: { label: 'Active', className: 'bg-success/10 text-success border-success/20', dot: 'bg-success' },
  paused: { label: 'Paused', className: 'bg-muted text-muted-foreground border-border', dot: 'bg-muted-foreground' },
  failing: { label: 'Failing', className: 'bg-destructive/10 text-destructive border-destructive/20', dot: 'bg-destructive' },
};

const keyTypeConfig: Record<KeyType, { label: string; className: string }> = {
  test: { label: 'Test', className: 'bg-warning/10 text-warning border-warning/20' },
  live: { label: 'Live', className: 'bg-success/10 text-success border-success/20' },
};

const suppressionReasonConfig: Record<SuppressionReason, { label: string; className: string }> = {
  hard_bounce: { label: 'Hard Bounce', className: 'bg-destructive/10 text-destructive border-destructive/20' },
  spam_complaint: { label: 'Spam Complaint', className: 'bg-warning/10 text-warning border-warning/20' },
  manual: { label: 'Manual', className: 'bg-muted text-muted-foreground border-border' },
};

interface StatusBadgeProps {
  status: EmailStatus | DomainStatus | WebhookStatus;
  type?: 'email' | 'domain' | 'webhook';
}

export function StatusBadge({ status, type = 'email' }: StatusBadgeProps) {
  const config =
    type === 'domain'
      ? domainStatusConfig[status as DomainStatus]
      : type === 'webhook'
      ? webhookStatusConfig[status as WebhookStatus]
      : emailStatusConfig[status as EmailStatus];

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.className
      )}
    >
      <span className={cn('h-1.5 w-1.5 rounded-full', config.dot)} />
      {config.label}
    </span>
  );
}

export function KeyTypeBadge({ type }: { type: KeyType }) {
  const config = keyTypeConfig[type];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium',
        config.className
      )}
    >
      {config.label}
    </span>
  );
}

export function SuppressionReasonBadge({ reason }: { reason: SuppressionReason }) {
  const config = suppressionReasonConfig[reason];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
        config.className
      )}
    >
      {config.label}
    </span>
  );
}
