export type EmailStatus =
  | 'queued'
  | 'processing'
  | 'accepted'
  | 'delivered'
  | 'deferred'
  | 'bounced'
  | 'failed';

export type Environment = 'development' | 'production';

export type DomainStatus = 'pending' | 'verified' | 'action_required';

export type KeyType = 'test' | 'live';

export type SuppressionReason = 'hard_bounce' | 'spam_complaint' | 'manual';

export type WebhookEvent =
  | 'email.queued'
  | 'email.accepted'
  | 'email.delivered'
  | 'email.deferred'
  | 'email.bounced'
  | 'email.failed';

export type WebhookStatus = 'active' | 'paused' | 'failing';

export interface EmailLog {
  id: string;
  messageId: string;
  recipient: string;
  sender: string;
  subject: string;
  status: EmailStatus;
  submittedAt: string;
  lastUpdated: string;
  domain: string;
  attempts: DeliveryAttempt[];
  events: EmailEvent[];
  smtpResponse?: string;
  smtpCode?: number;
  errorDetails?: string;
  tags?: string[];
}

export interface DeliveryAttempt {
  id: string;
  attemptNumber: number;
  timestamp: string;
  status: EmailStatus;
  smtpCode?: number;
  smtpResponse: string;
  durationMs: number;
}

export interface EmailEvent {
  id: string;
  timestamp: string;
  type: WebhookEvent;
  description: string;
}

export interface SendingDomain {
  id: string;
  domain: string;
  status: DomainStatus;
  createdAt: string;
  verifiedAt: string | null;
  dkimSelector: string;
  spfRecord: DnsRecord;
  dkimRecord: DnsRecord;
  dmarcRecord: DnsRecord;
  returnPathRecord: DnsRecord;
  verificationToken: string;
}

export interface DnsRecord {
  type: 'TXT' | 'CNAME' | 'MX';
  name: string;
  value: string;
  verified: boolean;
}

export interface ApiKey {
  id: string;
  name: string;
  type: KeyType;
  prefix: string;
  createdAt: string;
  lastUsedAt: string | null;
  revoked: boolean;
  restrictions?: string;
}

export interface Suppression {
  id: string;
  email: string;
  reason: SuppressionReason;
  createdAt: string;
  domain: string;
  detail: string;
}

export interface WebhookEndpoint {
  id: string;
  url: string;
  events: WebhookEvent[];
  status: WebhookStatus;
  createdAt: string;
  lastAttemptAt: string | null;
  lastResponseCode: number | null;
  successRate: number;
  recentAttempts: WebhookAttempt[];
  secret: string;
}

export interface WebhookAttempt {
  id: string;
  timestamp: string;
  event: WebhookEvent;
  statusCode: number;
  responseTimeMs: number;
  success: boolean;
  retryCount: number;
}

export interface UsageData {
  date: string;
  submitted: number;
  delivered: number;
  bounced: number;
  failed: number;
  deferred: number;
}

export interface OverviewStats {
  totalSubmitted: number;
  totalDelivered: number;
  totalBounced: number;
  deliveryRate: number;
  totalDeferred: number;
  totalFailed: number;
  apiQuotaUsed: number;
  apiQuotaTotal: number;
}

export interface RecentError {
  id: string;
  timestamp: string;
  level: 'error' | 'warning';
  message: string;
  source: string;
}

export interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  badge?: string;
}
