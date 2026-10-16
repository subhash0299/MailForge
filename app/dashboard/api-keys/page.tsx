'use client';

import { useState } from 'react';
import {
  KeyRound,
  Plus,
  Copy,
  Check,
  Eye,
  EyeOff,
  AlertTriangle,
  Trash2,
  Clock,
} from 'lucide-react';

import { PageHeader } from '@/components/dashboard/page-header';
import { MockDataBanner, EmptyState } from '@/components/dashboard/feedback';
import { KeyTypeBadge } from '@/components/dashboard/status-badge';
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { mockApiKeys } from '@/lib/mock-data';
import { formatDate, formatRelativeTime } from '@/lib/format';
import type { ApiKey, KeyType } from '@/lib/types';

function generateKey(type: KeyType): string {
  const prefix = type === 'live' ? 'mf_live_' : 'mf_test_';
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let body = '';
  for (let i = 0; i < 40; i++) body += chars[Math.floor(Math.random() * chars.length)];
  return prefix + body;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>(mockApiKeys);
  const [createOpen, setCreateOpen] = useState(false);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyType, setNewKeyType] = useState<KeyType>('test');
  const [newKeyRestrictions, setNewKeyRestrictions] = useState('');
  const [createdKey, setCreatedKey] = useState<string | null>(null);
  const [showKey, setShowKey] = useState(true);
  const [copied, setCopied] = useState(false);
  const [revokeTarget, setRevokeTarget] = useState<ApiKey | null>(null);

  const activeKeys = keys.filter((k) => !k.revoked);
  const revokedKeys = keys.filter((k) => k.revoked);

  const handleCreate = () => {
    if (!newKeyName.trim()) return;
    const secret = generateKey(newKeyType);
    const key: ApiKey = {
      id: `key_${Date.now()}`,
      name: newKeyName.trim(),
      type: newKeyType,
      prefix: newKeyType === 'live' ? 'mf_live_' : 'mf_test_',
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      revoked: false,
      restrictions: newKeyRestrictions.trim() || undefined,
    };
    setKeys([key, ...keys]);
    setCreatedKey(secret);
    setNewKeyName('');
    setNewKeyRestrictions('');
    setNewKeyType('test');
    setShowKey(true);
  };

  const handleRevoke = () => {
    if (!revokeTarget) return;
    setKeys((prev) => prev.map((k) => k.id === revokeTarget.id ? { ...k, revoked: true } : k));
    setRevokeTarget(null);
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const closeCreatedDialog = () => {
    setCreatedKey(null);
    setCreateOpen(false);
  };

  return (
    <div>
      <PageHeader
        title="API Keys"
        description="Manage your API keys for authenticating email API requests. Secrets are shown only once at creation."
        action={
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="h-4 w-4" />
            Generate Key
          </Button>
        }
      />
      <MockDataBanner />

      <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-accent/20 bg-accent/5 p-3">
        <KeyRound className="h-4 w-4 shrink-0 text-accent" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          API keys are hashed before storage. The full secret is displayed only once after creation — store it securely. You will not be able to see it again.
        </p>
      </div>

      {activeKeys.length === 0 && revokedKeys.length === 0 ? (
        <EmptyState
          icon={KeyRound}
          title="No API keys yet"
          description="Generate your first API key to start sending emails through the MailForge API."
          action={<Button onClick={() => setCreateOpen(true)} size="sm"><Plus className="h-4 w-4" />Generate Key</Button>}
        />
      ) : (
        <div className="space-y-6">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">Active Keys ({activeKeys.length})</h3>
            <div className="space-y-2">
              {activeKeys.map((key) => (
                <Card key={key.id} className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/60">
                      <KeyRound className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{key.name}</span>
                        <KeyTypeBadge type={key.type} />
                      </div>
                      <div className="mt-0.5 flex items-center gap-3 text-xs text-muted-foreground">
                        <span className="font-mono">{key.prefix}••••••••••••••••</span>
                        {key.restrictions && <span>· {key.restrictions}</span>}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="hidden text-right sm:block">
                      <p className="text-xs text-muted-foreground">Created</p>
                      <p className="text-xs font-medium text-foreground">{formatDate(key.createdAt)}</p>
                    </div>
                    <div className="hidden text-right sm:block">
                      <p className="text-xs text-muted-foreground">Last used</p>
                      <p className="flex items-center gap-1 text-xs font-medium text-foreground">
                        <Clock className="h-3 w-3" />
                        {key.lastUsedAt ? formatRelativeTime(key.lastUsedAt) : 'Never'}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() => setRevokeTarget(key)}
                    >
                      Revoke
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          {revokedKeys.length > 0 && (
            <div>
              <h3 className="mb-3 text-sm font-semibold text-muted-foreground">Revoked Keys ({revokedKeys.length})</h3>
              <div className="space-y-2">
                {revokedKeys.map((key) => (
                  <Card key={key.id} className="flex items-center justify-between p-4 opacity-60">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-secondary/30">
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground line-through">{key.name}</span>
                          <KeyTypeBadge type={key.type} />
                        </div>
                        <p className="mt-0.5 text-xs text-muted-foreground">
                          Revoked · Created {formatDate(key.createdAt)}
                        </p>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={(open) => { setCreateOpen(open); if (!open) { setNewKeyName(''); setNewKeyRestrictions(''); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate API Key</DialogTitle>
            <DialogDescription>
              Create a new API key for authenticating with the MailForge API. The secret will be shown only once.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="keyname">Key name</Label>
              <Input
                id="keyname"
                placeholder="e.g., Production Server"
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="keytype">Key type</Label>
              <Select value={newKeyType} onValueChange={(v) => setNewKeyType(v as KeyType)}>
                <SelectTrigger id="keytype">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="test">Test — mock data only, no real emails sent</SelectItem>
                  <SelectItem value="live">Live — sends real emails through transport</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="restrictions">Restrictions (optional)</Label>
              <Input
                id="restrictions"
                placeholder="e.g., Domain: example.com"
                value={newKeyRestrictions}
                onChange={(e) => setNewKeyRestrictions(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Limit which domains or endpoints this key can access.</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!newKeyName.trim()}>Generate Key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!createdKey} onOpenChange={(open) => !open && closeCreatedDialog()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Created</DialogTitle>
            <DialogDescription>
              Copy your API key now. For security, it will not be shown again.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 rounded-lg border border-warning/20 bg-warning/5 p-3">
              <AlertTriangle className="h-4 w-4 shrink-0 text-warning" />
              <p className="text-xs text-foreground">This is the only time you will see the full key. Store it securely.</p>
            </div>
            <div className="rounded-lg border border-border bg-secondary/30 p-3">
              <div className="flex items-center gap-2">
                <code className={`flex-1 break-all font-mono text-sm text-foreground ${showKey ? '' : 'blur-sm select-none'}`}>
                  {createdKey}
                </code>
                <button
                  onClick={() => setShowKey(!showKey)}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
                <button
                  onClick={() => createdKey && copyKey(createdKey)}
                  className="shrink-0 text-muted-foreground hover:text-foreground"
                >
                  {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={closeCreatedDialog}>I&apos;ve saved my key</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!revokeTarget} onOpenChange={(open) => !open && setRevokeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke API Key?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently revoke <span className="font-medium text-foreground">{revokeTarget?.name}</span>. Any application using this key will immediately lose access. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke Key
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
