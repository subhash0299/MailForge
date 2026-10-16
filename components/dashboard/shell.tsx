'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/dashboard/sidebar';
import { Topbar } from '@/components/dashboard/topbar';

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    fetch('/api/mailforge/v1/auth/me', { credentials: 'same-origin', cache: 'no-store' })
      .then((response) => {
        if (response.status === 401) {
          router.replace('/login');
          return;
        }
        if (!response.ok) throw new Error('Unable to verify your session.');
        if (active) setReady(true);
      })
      .catch(() => {
        if (active) setReady(true);
      });
    return () => { active = false; };
  }, [router]);

  if (!ready) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">Connecting to MailForge…</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <aside className="hidden w-60 shrink-0 border-r border-border lg:block">
        <Sidebar />
      </aside>
      <div className="flex flex-1 flex-col overflow-hidden">
        <Topbar />
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
