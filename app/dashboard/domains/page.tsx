'use client';

import { useState } from 'react';
import {
  Globe,
  Plus,
  Copy,
  Check,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react';

import { PageHeader } from '@/components/dashboard/page-header';
import { MockDataBanner, EmptyState } from '@/components/dashboard/feedback';
import { StatusBadge } from '@/components/dashboard/status-badge';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { mockDomains } from '@/lib/mock-data';
import { formatDate } from '@/lib/format';
import type { SendingDomain, DnsRecord } from '@/lib/types';

export default function DomainsPage() {
  const [domains, setDomains] = useState<SendingDomain[]>(mockDomains);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newDomain, setNewDomain] = useState('');
  const [addError, setAddError] = useState('');
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set([mockDomains[2].id]));
  const [copiedRecord, setCopiedRecord] = useState<string | null>(null);
  const [checking, setChecking] = useState<string | null>(null);

  const handleAddDomain = () => {
    setAddError('');
    if (!newDomain.trim()) {
      setAddError('Please enter a domain name.');
      return;
    }
    if (!/^[a-zA-Z0-9]([a-zA-Z0-9-]*\.)+[a-zA-Z]{2,}$/.test(newDomain.trim())) {
      setAddError('Please enter a valid domain (e.g., example.com).');
      return;
    }
    if (domains.some((d) => d.domain === newDomain.trim())) {
      setAddError('This domain has already been added.');
      return;
    }
    const domain: SendingDomain = {
      id: `dom_${Date.now()}`,
      domain: newDomain.trim(),
      status: 'pending',
      createdAt: new Date().toISOString(),
      verifiedAt: null,
      dkimSelector: 'mailforge',
      spfRecord: {
        type: 'TXT',
        name: newDomain.trim(),
        value: 'v=spf1 include:_spf.mailforge.dev ~all',
        verified: false,
      },
      dkimRecord: {
        type: 'TXT',
        name: `mailforge._domainkey.${newDomain.trim()}`,
        value: 'v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQ...',
        verified: false,
      },
      dmarcRecord: {
        type: 'TXT',
        name: `_dmarc.${newDomain.trim()}`,
        value: 'v=DMARC1; p=quarantine; rua=mailto:dmarc@' + newDomain.trim() + '; pct=100',
        verified: false,
      },
      returnPathRecord: {
        type: 'CNAME',
        name: `rp.${newDomain.trim()}`,
        value: 'rp.mailforge.net',
        verified: false,
      },
      verificationToken: `mf-verify-${Math.random().toString(36).slice(2, 14)}`,
    };
    setDomains([domain, ...domains]);
    setNewDomain('');
    setAddDialogOpen(false);
  };

  const handleRecheck = (domainId: string) => {
    setChecking(domainId);
    setTimeout(() => {
      setDomains((prev) =>
        prev.map((d) => {
          if (d.id !== domainId) return d;
          if (d.status === 'verified') return d;
          const allVerified = [d.spfRecord, d.dkimRecord, d.dmarcRecord, d.returnPathRecord].every(
            (r) => r.verified
          );
          return {
            ...d,
            status: allVerified ? 'verified' : 'action_required',
            verifiedAt: allVerified ? new Date().toISOString() : null,
          };
        })
      );
      setChecking(null);
    }, 1500);
  };

  const toggleExpand = (id: string) => {
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyToClipboard = (text: string, recordId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedRecord(recordId);
    setTimeout(() => setCopiedRecord(null), 2000);
  };

  const dnsRecords = (domain: SendingDomain): { label: string; record: DnsRecord; description: string }[] => [
    { label: 'SPF', record: domain.spfRecord, description: 'Authorizes MailForge servers to send email on behalf of your domain.' },
    { label: 'DKIM', record: domain.dkimRecord, description: 'Adds a digital signature to emails, allowing recipients to verify authenticity.' },
    { label: 'DMARC', record: domain.dmarcRecord, description: 'Tells receiving servers what to do if SPF or DKIM checks fail.' },
    { label: 'Return Path', record: domain.returnPathRecord, description: 'Enables bounce tracking by routing return-path bounces to MailForge.' },
  ];

  return (
    <div>
      <PageHeader
        title="Sending Domains"
        description="Add and verify domains to enable sending. You cannot send from unverified domains."
        action={
          <Button onClick={() => setAddDialogOpen(true)} size="sm">
            <Plus className="h-4 w-4" />
            Add Domain
          </Button>
        }
      />
      <MockDataBanner />

      {domains.length === 0 ? (
        <EmptyState
          icon={Globe}
          title="No domains configured"
          description="Add your first sending domain to start sending transactional emails."
          action={<Button onClick={() => setAddDialogOpen(true)} size="sm"><Plus className="h-4 w-4" />Add Domain</Button>}
        />
      ) : (
        <div className="space-y-3">
          {domains.map((domain) => (
            <Card key={domain.id} className="overflow-hidden">
              <Collapsible open={expandedDomains.has(domain.id)} onOpenChange={() => toggleExpand(domain.id)}>
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <CollapsibleTrigger asChild>
                      <button className="flex h-7 w-7 items-center justify-center rounded-md hover:bg-secondary">
                        {expandedDomains.has(domain.id) ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    </CollapsibleTrigger>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{domain.domain}</span>
                        <StatusBadge status={domain.status} type="domain" />
                      </div>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Added {formatDate(domain.createdAt)}
                        {domain.verifiedAt && ` · Verified ${formatDate(domain.verifiedAt)}`}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {domain.status !== 'verified' && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleRecheck(domain.id)}
                        disabled={checking === domain.id}
                      >
                        <RefreshCw className={`h-3.5 w-3.5 ${checking === domain.id ? 'animate-spin' : ''}`} />
                        Recheck
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => toggleExpand(domain.id)}>
                      {expandedDomains.has(domain.id) ? 'Hide' : 'Details'}
                    </Button>
                  </div>
                </div>

                <CollapsibleContent>
                  <div className="border-t border-border p-4">
                    {domain.status === 'verified' && (
                      <div className="mb-4 flex items-center gap-2 rounded-lg border border-success/20 bg-success/5 p-3">
                        <ShieldCheck className="h-4 w-4 text-success" />
                        <span className="text-sm text-foreground">This domain is verified and ready for sending.</span>
                      </div>
                    )}
                    {domain.status === 'action_required' && (
                      <div className="mb-4 flex items-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                        <AlertCircle className="h-4 w-4 text-destructive" />
                        <span className="text-sm text-foreground">
                          Some DNS records are not yet verified. Update your DNS configuration and click Recheck.
                        </span>
                      </div>
                    )}
                    {domain.status === 'pending' && (
                      <div className="mb-4 flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/5 p-3">
                        <AlertCircle className="h-4 w-4 text-warning" />
                        <span className="text-sm text-foreground">
                          DNS records have been generated. Add them to your DNS provider and click Recheck to verify.
                        </span>
                      </div>
                    )}

                    <div className="mb-3 rounded-md bg-secondary/30 p-3">
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Verification Token</p>
                      <div className="mt-1 flex items-center gap-2">
                        <code className="font-mono text-xs text-foreground">{domain.verificationToken}</code>
                        <button
                          onClick={() => copyToClipboard(domain.verificationToken, `${domain.id}-token`)}
                          className="text-muted-foreground hover:text-foreground"
                        >
                          {copiedRecord === `${domain.id}-token` ? (
                            <Check className="h-3.5 w-3.5 text-success" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>

                    <h4 className="mb-3 text-sm font-semibold text-foreground">DNS Records</h4>
                    <div className="space-y-3">
                      {dnsRecords(domain).map(({ label, record, description }) => (
                        <div key={label} className="rounded-lg border border-border bg-secondary/20 p-3">
                          <div className="mb-2 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="rounded bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">{label}</span>
                              <span className="rounded bg-secondary px-2 py-0.5 text-xs font-mono text-muted-foreground">{record.type}</span>
                              {record.verified ? (
                                <span className="flex items-center gap-1 text-xs text-success">
                                  <Check className="h-3 w-3" /> Verified
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 text-xs text-warning">
                                  <AlertCircle className="h-3 w-3" /> Pending
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="mb-2 text-xs text-muted-foreground">{description}</p>
                          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                            <div>
                              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Name / Host</p>
                              <div className="mt-1 flex items-center gap-2">
                                <code className="flex-1 truncate rounded bg-background px-2 py-1 font-mono text-xs text-foreground">{record.name}</code>
                                <button
                                  onClick={() => copyToClipboard(record.name, `${domain.id}-${label}-name`)}
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  {copiedRecord === `${domain.id}-${label}-name` ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                                </button>
                              </div>
                            </div>
                            <div>
                              <p className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Value</p>
                              <div className="mt-1 flex items-center gap-2">
                                <code className="flex-1 truncate rounded bg-background px-2 py-1 font-mono text-xs text-foreground">{record.value}</code>
                                <button
                                  onClick={() => copyToClipboard(record.value, `${domain.id}-${label}-value`)}
                                  className="text-muted-foreground hover:text-foreground"
                                >
                                  {copiedRecord === `${domain.id}-${label}-value` ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 rounded-lg border border-border p-3">
                      <h5 className="text-xs font-semibold text-foreground">Setup Instructions</h5>
                      <ol className="mt-2 space-y-1.5 text-xs text-muted-foreground">
                        <li>1. Log in to your DNS provider (Cloudflare, Route53, etc.)</li>
                        <li>2. Add each DNS record above exactly as shown</li>
                        <li>3. Wait for DNS propagation (can take up to 48 hours, usually 15-30 min)</li>
                        <li>4. Click <span className="font-medium text-foreground">Recheck</span> to verify</li>
                        <li>5. Once all records are verified, you can send from this domain</li>
                      </ol>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Sending Domain</DialogTitle>
            <DialogDescription>
              Enter the domain you want to send emails from. We&apos;ll generate the DNS records you need to add.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="space-y-2">
              <Label htmlFor="domain">Domain name</Label>
              <Input
                id="domain"
                placeholder="example.com"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddDomain()}
              />
              {addError && (
                <p className="text-xs text-destructive">{addError}</p>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              You must own this domain and have access to its DNS configuration to complete verification.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleAddDomain}>Add Domain</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
