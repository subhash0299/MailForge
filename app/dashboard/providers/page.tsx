'use client';
import { FormEvent, useEffect, useState } from 'react';
import { PageHeader } from '@/components/dashboard/page-header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { apiRequest } from '@/lib/api';

type Config = { host: string; port: number; security: 'tls' | 'starttls'; username: string; senderEmail: string; passwordConfigured: boolean };
export default function ProvidersPage() {
  const [host, setHost] = useState('');
  const [port, setPort] = useState('587');
  const [security, setSecurity] = useState<'tls' | 'starttls'>('starttls');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [senderEmail, setSenderEmail] = useState('');
  const [configured, setConfigured] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  useEffect(() => {
    apiRequest<{ configured: boolean; config: Config | null }>('/v1/smtp-config').then((r) => {
      setConfigured(r.configured);
      if (r.config) { setHost(r.config.host); setPort(String(r.config.port)); setSecurity(r.config.security); setUsername(r.config.username); setSenderEmail(r.config.senderEmail); }
    }).catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load settings.')).finally(() => setLoading(false));
  }, []);
  async function save(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const r = await apiRequest<{ configured: boolean; testEmail: { status: 'accepted' | 'failed'; message: string } }>('/v1/smtp-config', { method: 'PUT', body: JSON.stringify({ host, port: Number(port), security, username, password, senderEmail }) });
      setConfigured(r.configured); setPassword('');
      if (r.testEmail.status === 'accepted') {
        setNotice(r.testEmail.message);
      } else {
        setError(r.testEmail.message);
      }
    } catch (e) { setError(e instanceof Error ? e.message : 'Could not save settings.'); } finally { setBusy(false); }
  }
  async function remove() {
    setBusy(true); setError(''); setNotice('');
    try { await apiRequest('/v1/smtp-config', { method: 'DELETE' }); setConfigured(false); setHost(''); setUsername(''); setPassword(''); setSenderEmail(''); setNotice('Provider removed.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not remove provider.'); } finally { setBusy(false); }
  }
  return <div>
    <PageHeader title="Email Provider" description="Use your own SMTP account. MailForge provides the API, queue, logs and dashboard; your provider sends the email." />
    {error && <p role="alert" className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
    {notice && <p role="status" className="mb-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">{notice}</p>}
    <Card className="mb-5 p-5"><h2 className="text-sm font-semibold">MailForge Free — bring your own provider</h2><p className="mt-2 text-sm text-muted-foreground">₹0/month during private beta. MailForge does not fund email credits; your provider's fees and limits still apply. Proposed beta limit: 10,000 API email submissions per workspace per calendar month.</p></Card>
    <Card className="p-5"><h2 className="mb-4 text-sm font-semibold">SMTP connection</h2>
      {loading ? <p className="text-sm text-muted-foreground">Loading provider settings…</p> : <form onSubmit={save} className="space-y-4">
        {configured && <p className="rounded-md border border-emerald-500/30 p-3 text-sm">Provider configured. Saved credential is hidden.</p>}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm">SMTP host<input required value={host} onChange={e=>setHost(e.target.value)} placeholder="smtp.example.com" className="w-full rounded-md border border-border bg-background px-3 py-2" /></label>
          <label className="space-y-2 text-sm">Port<select value={port} onChange={e=>{setPort(e.target.value);setSecurity(e.target.value==='465'?'tls':'starttls')}} className="w-full rounded-md border border-border bg-background px-3 py-2"><option value="465">465 — TLS</option><option value="587">587 — STARTTLS</option><option value="2525">2525 — provider-specific</option></select></label>
          <label className="space-y-2 text-sm">Security<select value={security} onChange={e=>setSecurity(e.target.value as 'tls'|'starttls')} className="w-full rounded-md border border-border bg-background px-3 py-2"><option value="tls">TLS</option><option value="starttls">STARTTLS</option></select></label>
          <label className="space-y-2 text-sm">SMTP username<input required value={username} onChange={e=>setUsername(e.target.value)} className="w-full rounded-md border border-border bg-background px-3 py-2" /></label>
          <label className="space-y-2 text-sm">SMTP password or app password<input type="password" required={!configured} value={password} onChange={e=>setPassword(e.target.value)} placeholder={configured?'Leave blank to keep current credential':'Enter credential'} className="w-full rounded-md border border-border bg-background px-3 py-2" /><span className="block text-xs text-muted-foreground">Stored encrypted; never returned by the settings API.</span></label>
          <label className="space-y-2 text-sm">Authorized sender email<input type="email" required value={senderEmail} onChange={e=>setSenderEmail(e.target.value)} placeholder="noreply@yourdomain.com" className="w-full rounded-md border border-border bg-background px-3 py-2" /></label>
        </div>
        <div className="flex flex-wrap gap-2"><Button type="submit" disabled={busy}>{busy?'Saving…':'Save SMTP settings'}</Button>{configured && <Button type="button" variant="outline" disabled={busy} onClick={()=>void remove()}>Remove provider</Button>}</div>
      </form>}
    </Card>
    <Card className="mt-5 p-5"><h2 className="text-sm font-semibold">Before sending</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-muted-foreground"><li>Use port 465 with TLS or port 587 with STARTTLS. Port 25 is blocked by this service.</li><li>Your provider must allow connections from Cloudflare Workers and authorize the sender address.</li><li>Saving settings sends “Test email from MailForge” to the email address you use to sign in. Check your inbox and spam folder.</li><li>SMTP acceptance does not guarantee inbox delivery.</li></ul></Card>
  </div>;
}
