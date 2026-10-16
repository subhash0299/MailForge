'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';

export default function SignupPage() {
  const router = useRouter();
  const [workspaceName, setWorkspaceName] = useState('My Workspace');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await apiRequest('/v1/auth/register', { method: 'POST', body: JSON.stringify({ email, password, workspaceName }) });
      router.replace('/dashboard/api-keys');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        <Link href="/" className="text-sm font-semibold tracking-wide text-primary">MAILFORGE</Link>
        <h1 className="mt-7 text-2xl font-semibold text-foreground">Join the MailForge private beta</h1>
        <p className="mt-2 text-sm text-muted-foreground">MailForge is in private beta. Use the email address that received your invitation to create a workspace.</p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block text-sm font-medium text-foreground">Workspace name
            <input required maxLength={80} value={workspaceName} onChange={(e) => setWorkspaceName(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-primary" />
          </label>
          <label className="block text-sm font-medium text-foreground">Email
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-primary" />
          </label>
          <label className="block text-sm font-medium text-foreground">Password
            <input type="password" autoComplete="new-password" minLength={12} maxLength={200} required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-primary" />
            <span className="mt-1 block text-xs text-muted-foreground">Use at least 12 characters.</span>
          </label>
          {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          <button disabled={busy} className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy ? 'Creating workspace…' : 'Create account'}</button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">Already have an account? <Link className="font-medium text-primary hover:underline" href="/login">Sign in</Link></p>
      </section>
    </main>
  );
}
