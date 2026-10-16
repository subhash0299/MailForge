'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Menu, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Sidebar } from './sidebar';
import { apiRequest } from '@/lib/api';

type SessionResponse = { user: { id: string; email: string }; workspace: { id: string; name: string } };

export function Topbar() {
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [identity, setIdentity] = useState<SessionResponse | null>(null);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    apiRequest<SessionResponse>('/v1/auth/me').then(setIdentity).catch(() => setIdentity(null));
  }, []);

  async function logout() {
    setSigningOut(true);
    try { await apiRequest('/v1/auth/logout', { method: 'POST', body: '{}' }); } catch { /* Continue clearing the local UI even if the API is unavailable. */ }
    finally { router.replace('/login'); router.refresh(); }
  }

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6">
        <div className="flex min-w-0 items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground lg:hidden" aria-label="Open menu"><Menu className="h-5 w-5" /></button>
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/20"><Zap className="h-4 w-4 text-primary" strokeWidth={2.5} /></div>
          <div className="min-w-0"><p className="truncate text-sm font-semibold text-foreground">{identity?.workspace.name || 'MailForge Workspace'}</p><p className="truncate text-xs text-muted-foreground">{identity?.user.email || 'Workspace dashboard'}</p></div>
        </div>
        <Button variant="outline" size="sm" disabled={signingOut} onClick={() => void logout()}><LogOut className="mr-2 h-4 w-4" />{signingOut ? 'Signing out…' : 'Sign out'}</Button>
      </header>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-60 p-0"><Sidebar onItemClick={() => setMobileOpen(false)} /></SheetContent>
      </Sheet>
    </>
  );
}
