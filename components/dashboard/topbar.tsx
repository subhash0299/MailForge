'use client';

import { useState } from 'react';
import {
  Bell,
  Search,
  ChevronDown,
  Circle,
  Menu,
  X,
} from 'lucide-react';

import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Sidebar } from './sidebar';
import { mockUser, mockWorkspace } from '@/lib/mock-data';

const environments = [
  { id: 'development', label: 'Development', color: 'text-warning' },
  { id: 'production', label: 'Production', color: 'text-success' },
];

export function Topbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [env, setEnv] = useState(mockWorkspace.environment);
  const currentEnv = environments.find((e) => e.id === env) || environments[0];

  return (
    <>
      <header className="flex h-16 items-center justify-between border-b border-border bg-card px-4 md:px-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium text-foreground hover:bg-secondary transition-colors">
                <span>{mockWorkspace.name}</span>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <div className="px-2 py-1.5">
                <p className="text-xs text-muted-foreground">Workspaces</p>
              </div>
              <DropdownMenuItem className="flex items-center justify-between">
                <span>{mockWorkspace.name}</span>
                <span className="text-xs text-muted-foreground">{mockWorkspace.plan}</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-muted-foreground">
                Create new workspace
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="hidden h-6 w-px bg-border md:block" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="hidden items-center gap-2 rounded-md border border-border px-2.5 py-1 text-xs font-medium transition-colors hover:bg-secondary md:flex">
                <Circle className={cn('h-2 w-2 fill-current', currentEnv.color)} />
                <span className={currentEnv.color}>{currentEnv.label}</span>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {environments.map((e) => (
                <DropdownMenuItem
                  key={e.id}
                  onClick={() => setEnv(e.id as 'development' | 'production')}
                  className="flex items-center gap-2"
                >
                  <Circle className={cn('h-2 w-2 fill-current', e.color)} />
                  <span className={e.color}>{e.label}</span>
                  {e.id === env && <span className="ml-auto text-xs text-muted-foreground">Active</span>}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center gap-2 md:gap-3">
          <div className="relative hidden md:block">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search..."
              className="h-9 w-44 rounded-md border border-border bg-secondary/50 pl-8 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 lg:w-56"
            />
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
                <Bell className="h-4.5 w-4.5" />
                <span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-72">
              <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                Notifications
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="flex flex-col items-start gap-1 py-2">
                <span className="text-sm text-foreground">DKIM verification needed</span>
                <span className="text-xs text-muted-foreground">marketing.startup.io requires DNS updates</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 py-2">
                <span className="text-sm text-foreground">Webhook failing</span>
                <span className="text-xs text-muted-foreground">Slack endpoint returning 500 errors</span>
              </DropdownMenuItem>
              <DropdownMenuItem className="flex flex-col items-start gap-1 py-2">
                <span className="text-sm text-foreground">Quota at 48%</span>
                <span className="text-xs text-muted-foreground">48,291 of 100,000 emails used</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 rounded-md p-1 hover:bg-secondary transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary/15 text-xs font-medium text-primary">
                    {mockUser.name.split(' ').map((n) => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden text-left md:block">
                  <p className="text-xs font-medium text-foreground">{mockUser.name}</p>
                  <p className="text-[11px] text-muted-foreground">{mockUser.role}</p>
                </div>
                <ChevronDown className="hidden h-3.5 w-3.5 text-muted-foreground md:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium text-foreground">{mockUser.name}</p>
                <p className="text-xs text-muted-foreground">{mockUser.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem>Profile settings</DropdownMenuItem>
              <DropdownMenuItem>API keys</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive">Sign out</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <button
            onClick={() => setMobileOpen(false)}
            className="absolute right-3 top-3 z-50 flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-secondary lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
          <Sidebar onItemClick={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}
