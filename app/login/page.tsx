'use client';

import Link from 'next/link';
import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiRequest } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);
    try {
      await apiRequest('/v1/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
      router.replace('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-xl">
        <Link href="/" className="text-sm font-semibold tracking-wide text-primary">MAILFORGE</Link>
        <h1 className="mt-7 text-2xl font-semibold text-foreground">Welcome back</h1>
        <p className="mt-2 text-sm text-muted-foreground">Sign in to manage your email delivery.</p>
        <form onSubmit={submit} className="mt-7 space-y-4">
          <label className="block text-sm font-medium text-foreground">Email
            <input type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-primary" />
          </label>
          <label className="block text-sm font-medium text-foreground">Password
            <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="mt-2 w-full rounded-lg border border-border bg-background px-3 py-2.5 outline-none focus:border-primary" />
          </label>
          {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          <button disabled={busy} className="w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground disabled:opacity-60">{busy ? 'Signing in…' : 'Sign in'}</button>
        </form>
        <p className="mt-6 text-center text-sm text-muted-foreground">New to MailForge? <Link className="font-medium text-primary hover:underline" href="/signup">Create an account</Link></p>
      </section>
    </main>
  );
}
