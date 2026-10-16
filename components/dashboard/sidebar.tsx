'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Mail,
  Globe,
  KeyRound,
  Ban,
  Webhook,
  BarChart3,
  Settings,
  BookOpen,
  Zap,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import type { NavItem } from '@/lib/types';

const navItems: NavItem[] = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Email Activity', href: '/dashboard/email-activity', icon: Mail },
  { label: 'Sending Domains', href: '/dashboard/domains', icon: Globe },
  { label: 'API Keys', href: '/dashboard/api-keys', icon: KeyRound },
  { label: 'Suppressions', href: '/dashboard/suppressions', icon: Ban },
  { label: 'Webhooks', href: '/dashboard/webhooks', icon: Webhook },
  { label: 'Usage', href: '/dashboard/usage', icon: BarChart3 },
  { label: 'Settings', href: '/dashboard/settings', icon: Settings },
  { label: 'Documentation', href: '/dashboard/docs', icon: BookOpen },
];

export function Sidebar({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname();

  return (
    <div className="flex h-full flex-col bg-card">
      <div className="flex h-16 items-center gap-2.5 border-b border-border px-6">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/20">
          <Zap className="h-4.5 w-4.5 text-primary" strokeWidth={2.5} />
        </div>
        <span className="text-[15px] font-semibold tracking-tight text-foreground">
          MailForge
        </span>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4 scrollbar-thin">
        {navItems.map((item) => {
          const isActive =
            item.href === '/dashboard'
              ? pathname === '/dashboard'
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onItemClick}
              className={cn(
                'group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all',
                isActive
                  ? 'bg-primary/10 text-primary'
                  : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
              )}
            >
              <item.icon
                className={cn(
                  'h-4 w-4 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
                )}
                strokeWidth={2}
              />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-4">
        <div className="rounded-lg border border-border bg-secondary/50 p-3">
          <p className="text-xs font-medium text-foreground">Backend connected</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
            Core overview, API keys, and email logs use live backend data. Domain verification and other modules are still in progress.
          </p>
        </div>
      </div>
    </div>
  );
}
