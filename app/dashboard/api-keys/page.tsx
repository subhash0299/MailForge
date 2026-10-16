'use client';

import { FormEvent, useEffect, useState } from 'react';
import { Check, Copy, KeyRound, Plus, ShieldAlert, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { KeyTypeBadge } from '@/components/dashboard/status-badge';
import { formatDate, formatRelativeTime } from '@/lib/format';
import { apiRequest } from '@/lib/api';
import type { ApiKey, KeyType } from '@/lib/types';

type KeyListResponse = { data: Array<{ id: string; name: string; type: KeyType; prefix: string; createdAt: string; lastUsedAt: string | null; revoked: boolean }> };
type CreateResponse = { data: KeyListResponse['data'][number]; secret: string };

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [name, setName] = useState('');
  const [type, setType] = useState<KeyType>('test');
  const [secret, setSecret] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function loadKeys() {
    try {
      const result = await apiRequest<KeyListResponse>('/v1/api-keys');
      setKeys(result.data.map((key) => ({ id: key.id, name: key.name, type: key.type, prefix: key.prefix, createdAt: key.createdAt, lastUsedAt: key.lastUsedAt, revoked: key.revoked })));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load API keys.');
    }
  }

  useEffect(() => { void loadKeys(); }, []);

  async function createKey(event: FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    setError('');
    try {
      const result = await apiRequest<CreateResponse>('/v1/api-keys', { method: 'POST', body: JSON.stringify({ name: name.trim(), type }) });
      setSecret(result.secret);
      setName('');
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create API key.');
    } finally {
      setBusy(false);
    }
  }

  async function revokeKey(key: ApiKey) {
    if (!window.confirm(`Revoke "${key.name}"? Applications using this key will stop authenticating.`)) return;
    setError('');
    try {
      await apiRequest(`/v1/api-keys/${key.id}`, { method: 'DELETE' });
      await loadKeys();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not revoke API key.');
    }
  }

  async function copySecret() {
    await navigator.clipboard.writeText(secret);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div>
      <PageHeader title="API Keys" description="Create and revoke keys for applications that send through MailForge." />
      <div className="mb-5 flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
        <p className="text-sm text-muted-foreground">Keys are stored as SHA-256 hashes. The full secret is shown only once when created. Keep it in a secret manager and never ship live keys in browser code.</p>
      </div>

      {error && <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      {secret && (
        <Card className="mb-5 border-primary/30 p-5">
          <h2 className="font-semibold text-foreground">Copy your new API key now</h2>
          <p className="mt-1 text-sm text-muted-foreground">MailForge will not show this secret again after you close this panel.</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <code className="min-w-0 flex-1 break-all rounded-md border border-border bg-background p-3 text-sm">{secret}</code>
            <Button onClick={copySecret} variant="outline" className="shrink-0">{copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}{copied ? 'Copied' : 'Copy key'}</Button>
          </div>
          <Button className="mt-3" variant="outline" onClick={() => setSecret('')}>I saved the key</Button>
        </Card>
      )}

      <Card className="p-5">
        <h2 className="mb-4 text-sm font-semibold text-foreground">Generate API key</h2>
        <form onSubmit={createKey} className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px_auto]">
          <input aria-label="Key name" required maxLength={80} value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Production app" className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          <select aria-label="Key type" value={type} onChange={(event) => setType(event.target.value as KeyType)} className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary">
            <option value="test">Test key</option>
            <option value="live">Live key</option>
          </select>
          <Button disabled={busy} type="submit"><Plus className="mr-2 h-4 w-4" />{busy ? 'Generating…' : 'Generate key'}</Button>
        </form>
      </Card>

      <div className="mt-6">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Your keys ({keys.filter((key) => !key.revoked).length} active)</h2>
        {keys.length === 0 ? (
          <Card className="flex flex-col items-center p-10 text-center">
            <KeyRound className="h-8 w-8 text-muted-foreground" />
            <p className="mt-3 font-medium text-foreground">No API keys yet</p>
            <p className="mt-1 text-sm text-muted-foreground">Generate a test key to make your first authenticated API request.</p>
          </Card>
        ) : (
          <div className="space-y-2">
            {keys.map((key) => (
              <Card key={key.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <div className="rounded-lg bg-secondary p-2"><KeyRound className="h-4 w-4 text-muted-foreground" /></div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium text-foreground">{key.name}</span><KeyTypeBadge type={key.type} />{key.revoked && <span className="rounded bg-destructive/10 px-2 py-0.5 text-xs text-destructive">Revoked</span>}</div>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{key.prefix}••••••••••••••••</p>
                    <p className="mt-1 text-xs text-muted-foreground">Created {formatDate(key.createdAt)} · Last used {key.lastUsedAt ? formatRelativeTime(key.lastUsedAt) : 'Never'}</p>
                  </div>
                </div>
                {!key.revoked && <Button variant="outline" size="sm" className="self-start text-destructive hover:text-destructive sm:self-center" onClick={() => void revokeKey(key)}><Trash2 className="mr-2 h-4 w-4" />Revoke</Button>}
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
