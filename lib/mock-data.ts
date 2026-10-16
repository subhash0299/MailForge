import type {
  EmailLog,
  EmailStatus,
  SendingDomain,
  ApiKey,
  Suppression,
  WebhookEndpoint,
  UsageData,
  RecentError,
  OverviewStats,
  DeliveryAttempt,
  EmailEvent,
} from './types';

function hoursAgo(h: number): string {
  return new Date(Date.now() - h * 60 * 60 * 1000).toISOString();
}

function minutesAgo(m: number): string {
  return new Date(Date.now() - m * 60 * 1000).toISOString();
}

function daysAgo(d: number): string {
  return new Date(Date.now() - d * 24 * 60 * 60 * 1000).toISOString();
}

function daysFromNow(d: number): string {
  return new Date(Date.now() + d * 24 * 60 * 60 * 1000).toISOString();
}

export const IS_MOCK_DATA = true;

export const mockDomains: SendingDomain[] = [
  {
    id: 'dom_1',
    domain: 'mailforge.dev',
    status: 'verified',
    createdAt: daysAgo(45),
    verifiedAt: daysAgo(43),
    dkimSelector: 'mailforge',
    spfRecord: {
      type: 'TXT',
      name: 'mailforge.dev',
      value: 'v=spf1 include:_spf.mailforge.dev ~all',
      verified: true,
    },
    dkimRecord: {
      type: 'TXT',
      name: 'mailforge._domainkey.mailforge.dev',
      value: 'v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC7Vc...',
      verified: true,
    },
    dmarcRecord: {
      type: 'TXT',
      name: '_dmarc.mailforge.dev',
      value: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@mailforge.dev; pct=100; adkim=s; aspf=s',
      verified: true,
    },
    returnPathRecord: {
      type: 'CNAME',
      name: 'rp.mailforge.dev',
      value: 'rp.mailforge.net',
      verified: true,
    },
    verificationToken: 'mf-verify-a1b2c3d4e5f6',
  },
  {
    id: 'dom_2',
    domain: 'notifications.acme-corp.com',
    status: 'verified',
    createdAt: daysAgo(20),
    verifiedAt: daysAgo(18),
    dkimSelector: 'mailforge',
    spfRecord: {
      type: 'TXT',
      name: 'notifications.acme-corp.com',
      value: 'v=spf1 include:_spf.mailforge.dev ~all',
      verified: true,
    },
    dkimRecord: {
      type: 'TXT',
      name: 'mailforge._domainkey.notifications.acme-corp.com',
      value: 'v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDx9a...',
      verified: true,
    },
    dmarcRecord: {
      type: 'TXT',
      name: '_dmarc.notifications.acme-corp.com',
      value: 'v=DMARC1; p=reject; rua=mailto:dmarc@acme-corp.com; pct=100; adkim=s; aspf=s',
      verified: true,
    },
    returnPathRecord: {
      type: 'CNAME',
      name: 'rp.notifications.acme-corp.com',
      value: 'rp.mailforge.net',
      verified: true,
    },
    verificationToken: 'mf-verify-x7y8z9w0v1u2',
  },
  {
    id: 'dom_3',
    domain: 'marketing.startup.io',
    status: 'action_required',
    createdAt: daysAgo(3),
    verifiedAt: null,
    dkimSelector: 'mailforge',
    spfRecord: {
      type: 'TXT',
      name: 'marketing.startup.io',
      value: 'v=spf1 include:_spf.mailforge.dev ~all',
      verified: true,
    },
    dkimRecord: {
      type: 'TXT',
      name: 'mailforge._domainkey.marketing.startup.io',
      value: 'v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQKk2b...',
      verified: false,
    },
    dmarcRecord: {
      type: 'TXT',
      name: '_dmarc.marketing.startup.io',
      value: 'v=DMARC1; p=none; rua=mailto:dmarc@startup.io; pct=100',
      verified: false,
    },
    returnPathRecord: {
      type: 'CNAME',
      name: 'rp.marketing.startup.io',
      value: 'rp.mailforge.net',
      verified: false,
    },
    verificationToken: 'mf-verify-p3q4r5s6t7u8',
  },
  {
    id: 'dom_4',
    domain: 'alerts.fintech.app',
    status: 'pending',
    createdAt: hoursAgo(2),
    verifiedAt: null,
    dkimSelector: 'mailforge',
    spfRecord: {
      type: 'TXT',
      name: 'alerts.fintech.app',
      value: 'v=spf1 include:_spf.mailforge.dev ~all',
      verified: false,
    },
    dkimRecord: {
      type: 'TXT',
      name: 'mailforge._domainkey.alerts.fintech.app',
      value: 'v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQJm3c...',
      verified: false,
    },
    dmarcRecord: {
      type: 'TXT',
      name: '_dmarc.alerts.fintech.app',
      value: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@fintech.app; pct=100',
      verified: false,
    },
    returnPathRecord: {
      type: 'CNAME',
      name: 'rp.alerts.fintech.app',
      value: 'rp.mailforge.net',
      verified: false,
    },
    verificationToken: 'mf-verify-h9i0j1k2l3m4',
  },
];

const recipients = [
  'user@example.com', 'jane.doe@gmail.com', 'bob.smith@outlook.com',
  'support@acme-corp.com', 'dev@startup.io', 'test@yahoo.com',
  'noreply@fintech.app', 'alice@protonmail.com', 'team@company.org',
  'hello@designstudio.co', 'info@retail-shop.com', 'ceo@enterprise.net',
];

const subjects = [
  'Welcome to MailForge — Getting Started',
  'Your verification code is 482915',
  'Password reset request',
  'Order confirmation #ORD-7842',
  'Weekly digest: 12 new posts',
  'Security alert: New login from Chrome',
  'Invoice INV-2024-0392',
  'Your subscription expires in 7 days',
  'Team invitation from Acme Corp',
  'Comment on your pull request #142',
  'Shipping update: Your package is on the way',
  'Two-factor authentication enabled',
];

const senders = [
  'no-reply@mailforge.dev',
  'alerts@notifications.acme-corp.com',
  'team@notifications.acme-corp.com',
  'welcome@mailforge.dev',
  'billing@mailforge.dev',
];

const statuses: EmailStatus[] = ['queued', 'processing', 'accepted', 'delivered', 'deferred', 'bounced', 'failed'];

const smtpResponses: Record<string, { code: number; text: string }> = {
  queued: { code: 0, text: 'Message queued for delivery' },
  processing: { code: 0, text: 'Connecting to recipient MX server' },
  accepted: { code: 250, text: '250 OK queued as 4F8x2j9-003 messages.example.com' },
  delivered: { code: 250, text: '250 OK Message accepted for delivery' },
  deferred: { code: 451, text: '451 4.7.1 Greylisting in action, try again later' },
  bounced: { code: 550, text: '550 5.1.1 The email account does not exist' },
  failed: { code: 554, text: '554 5.7.1 Connection timed out after 30s' },
};

function generateEmailLog(i: number): EmailLog {
  const status = i < 3 ? 'delivered' : statuses[i % statuses.length];
  const recipient = recipients[i % recipients.length];
  const subject = subjects[i % subjects.length];
  const sender = senders[i % senders.length];
  const submittedAt = hoursAgo(i * 0.7 + 0.1);
  const lastUpdated = minutesAgo(i * 5);
  const domain = sender.split('@')[1];
  const sr = smtpResponses[status];

  const attempts: DeliveryAttempt[] = [];
  const events: EmailEvent[] = [];
  const attemptCount = status === 'delivered' ? 1 : status === 'deferred' ? 3 : status === 'bounced' ? 2 : 1;

  for (let a = 0; a < attemptCount; a++) {
    const attemptStatus = a === attemptCount - 1 ? status : (status === 'delivered' ? 'accepted' : 'deferred');
    const asr = smtpResponses[attemptStatus];
    attempts.push({
      id: `att_${i}_${a}`,
      attemptNumber: a + 1,
      timestamp: new Date(Date.now() - (attemptCount - a) * 15 * 60 * 1000).toISOString(),
      status: attemptStatus,
      smtpCode: asr.code,
      smtpResponse: asr.text,
      durationMs: Math.floor(Math.random() * 2000) + 200,
    });
  }

  events.push({
    id: `evt_${i}_0`,
    timestamp: submittedAt,
    type: 'email.queued',
    description: 'Message received and queued',
  });

  if (status !== 'queued') {
    events.push({
      id: `evt_${i}_1`,
      timestamp: new Date(new Date(submittedAt).getTime() + 5000).toISOString(),
      type: 'email.accepted',
      description: 'Accepted by recipient server',
    });
  }

  if (status === 'delivered') {
    events.push({
      id: `evt_${i}_2`,
      timestamp: new Date(new Date(submittedAt).getTime() + 15000).toISOString(),
      type: 'email.delivered',
      description: 'Message delivered successfully',
    });
  }

  if (status === 'bounced') {
    events.push({
      id: `evt_${i}_2`,
      timestamp: lastUpdated,
      type: 'email.bounced',
      description: 'Permanent bounce: address does not exist',
    });
  }

  if (status === 'deferred') {
    events.push({
      id: `evt_${i}_2`,
      timestamp: lastUpdated,
      type: 'email.deferred',
      description: 'Recipient server temporarily deferred delivery',
    });
  }

  if (status === 'failed') {
    events.push({
      id: `evt_${i}_2`,
      timestamp: lastUpdated,
      type: 'email.failed',
      description: 'Delivery failed: connection timeout after retries',
    });
  }

  return {
    id: `email_${i}`,
    messageId: `msg_${(100000 + i).toString(16)}f-${(i * 7).toString(16)}a-${domain}`,
    recipient,
    sender,
    subject,
    status,
    submittedAt,
    lastUpdated,
    domain,
    attempts,
    events,
    smtpResponse: sr.text,
    smtpCode: sr.code,
    errorDetails: status === 'bounced' ? 'The recipient address does not exist on the destination mail server.' : status === 'failed' ? 'Connection to recipient MX server timed out after 3 retry attempts.' : undefined,
    tags: i % 3 === 0 ? ['transactional', 'priority'] : ['transactional'],
  };
}

export const mockEmailLogs: EmailLog[] = Array.from({ length: 64 }, (_, i) => generateEmailLog(i));

export const mockApiKeys: ApiKey[] = [
  {
    id: 'key_1',
    name: 'Production Server',
    type: 'live',
    prefix: 'mf_live_',
    createdAt: daysAgo(30),
    lastUsedAt: minutesAgo(5),
    revoked: false,
    restrictions: 'Domain: mailforge.dev',
  },
  {
    id: 'key_2',
    name: 'Staging Environment',
    type: 'live',
    prefix: 'mf_live_',
    createdAt: daysAgo(14),
    lastUsedAt: hoursAgo(3),
    revoked: false,
    restrictions: 'Domain: notifications.acme-corp.com',
  },
  {
    id: 'key_3',
    name: 'Local Development',
    type: 'test',
    prefix: 'mf_test_',
    createdAt: daysAgo(7),
    lastUsedAt: hoursAgo(1),
    revoked: false,
  },
  {
    id: 'key_4',
    name: 'CI/CD Pipeline',
    type: 'test',
    prefix: 'mf_test_',
    createdAt: daysAgo(2),
    lastUsedAt: null,
    revoked: false,
  },
  {
    id: 'key_5',
    name: 'Legacy App Key',
    type: 'live',
    prefix: 'mf_live_',
    createdAt: daysAgo(60),
    lastUsedAt: daysAgo(25),
    revoked: true,
  },
];

export const mockSuppressions: Suppression[] = [
  { id: 'sup_1', email: 'nonexistent@example.com', reason: 'hard_bounce', createdAt: daysAgo(5), domain: 'mailforge.dev', detail: '550 5.1.1 The email account does not exist' },
  { id: 'sup_2', email: 'spam.reporter@gmail.com', reason: 'spam_complaint', createdAt: daysAgo(12), domain: 'mailforge.dev', detail: 'Recipient marked email as spam' },
  { id: 'sup_3', email: 'bounced@outlook.com', reason: 'hard_bounce', createdAt: daysAgo(8), domain: 'notifications.acme-corp.com', detail: '550 5.2.2 Mailbox full' },
  { id: 'sup_4', email: 'manually.blocked@yahoo.com', reason: 'manual', createdAt: daysAgo(3), domain: 'mailforge.dev', detail: 'Manually suppressed by workspace admin' },
  { id: 'sup_5', email: 'invalid@fintech.app', reason: 'hard_bounce', createdAt: daysAgo(1), domain: 'notifications.acme-corp.com', detail: '550 5.1.1 User unknown' },
  { id: 'sup_6', email: 'complaint@protonmail.com', reason: 'spam_complaint', createdAt: daysAgo(20), domain: 'mailforge.dev', detail: 'Feedback report from ISP' },
  { id: 'sup_7', email: 'blocked@company.org', reason: 'manual', createdAt: daysAgo(15), domain: 'mailforge.dev', detail: 'Requested suppression by support team' },
];

export const mockWebhooks: WebhookEndpoint[] = [
  {
    id: 'wh_1',
    url: 'https://api.acme-corp.com/webhooks/mailforge',
    events: ['email.queued', 'email.delivered', 'email.bounced', 'email.failed'],
    status: 'active',
    createdAt: daysAgo(25),
    lastAttemptAt: minutesAgo(12),
    lastResponseCode: 200,
    successRate: 99.2,
    secret: 'whsec_8f3a2b1c4d5e6f7',
    recentAttempts: [
      { id: 'wa_1', timestamp: minutesAgo(12), event: 'email.delivered', statusCode: 200, responseTimeMs: 145, success: true, retryCount: 0 },
      { id: 'wa_2', timestamp: minutesAgo(35), event: 'email.queued', statusCode: 200, responseTimeMs: 89, success: true, retryCount: 0 },
      { id: 'wa_3', timestamp: hoursAgo(2), event: 'email.bounced', statusCode: 200, responseTimeMs: 210, success: true, retryCount: 0 },
      { id: 'wa_4', timestamp: hoursAgo(5), event: 'email.failed', statusCode: 500, responseTimeMs: 5023, success: false, retryCount: 2 },
      { id: 'wa_5', timestamp: hoursAgo(6), event: 'email.delivered', statusCode: 200, responseTimeMs: 132, success: true, retryCount: 0 },
    ],
  },
  {
    id: 'wh_2',
    url: 'https://hooks.slack.com/services/T0/B0/xYZ',
    events: ['email.bounced', 'email.failed'],
    status: 'failing',
    createdAt: daysAgo(10),
    lastAttemptAt: hoursAgo(1),
    lastResponseCode: 500,
    successRate: 72.5,
    secret: 'whsec_2a9b8c7d6e5f4g3',
    recentAttempts: [
      { id: 'wa_6', timestamp: hoursAgo(1), event: 'email.bounced', statusCode: 500, responseTimeMs: 5000, success: false, retryCount: 3 },
      { id: 'wa_7', timestamp: hoursAgo(4), event: 'email.failed', statusCode: 500, responseTimeMs: 4980, success: false, retryCount: 3 },
      { id: 'wa_8', timestamp: hoursAgo(8), event: 'email.bounced', statusCode: 200, responseTimeMs: 230, success: true, retryCount: 0 },
    ],
  },
];

export function generateUsageData(days: number): UsageData[] {
  const data: UsageData[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const weekday = date.getDay();
    const base = weekday === 0 || weekday === 6 ? 400 : 900;
    const submitted = base + Math.floor(Math.random() * 200);
    const delivered = Math.floor(submitted * 0.92 + Math.random() * 30);
    const bounced = Math.floor(submitted * 0.04 + Math.random() * 10);
    const failed = Math.floor(submitted * 0.02 + Math.random() * 8);
    const deferred = submitted - delivered - bounced - failed;
    data.push({
      date: date.toISOString().split('T')[0],
      submitted,
      delivered,
      bounced,
      failed,
      deferred: Math.max(0, deferred),
    });
  }
  return data;
}

export const mockOverviewStats: OverviewStats = {
  totalSubmitted: 48291,
  totalDelivered: 44307,
  totalBounced: 1928,
  deliveryRate: 91.7,
  totalDeferred: 1642,
  totalFailed: 414,
  apiQuotaUsed: 48291,
  apiQuotaTotal: 100000,
};

export const mockRecentErrors: RecentError[] = [
  { id: 'err_1', timestamp: minutesAgo(8), level: 'error', message: 'SMTP connection timeout to mx.example.com', source: 'Email transport' },
  { id: 'err_2', timestamp: minutesAgo(23), level: 'warning', message: 'Webhook delivery retry 2/5 for endpoint wh_2', source: 'Webhook dispatcher' },
  { id: 'err_3', timestamp: hoursAgo(1), level: 'error', message: 'DKIM verification failed for marketing.startup.io', source: 'Domain verifier' },
  { id: 'err_4', timestamp: hoursAgo(2), level: 'warning', message: 'Rate limit threshold at 85% for workspace ws_1', source: 'Rate limiter' },
  { id: 'err_5', timestamp: hoursAgo(4), level: 'warning', message: 'Suppression list match: bounced@outlook.com', source: 'Suppression filter' },
];

export const mockWorkspace = {
  id: 'ws_1',
  name: 'Acme Corp',
  plan: 'Growth',
  environment: 'development' as const,
};

export const mockUser = {
  id: 'usr_1',
  name: 'Alex Morgan',
  email: 'alex@acme-corp.com',
  role: 'Owner',
};
