'use client';

import { useState, useMemo } from 'react';
import { Search, Filter, Ban, Plus, Trash2, AlertTriangle } from 'lucide-react';

import { PageHeader } from '@/components/dashboard/page-header';
import { MockDataBanner, EmptyState } from '@/components/dashboard/feedback';
import { SuppressionReasonBadge } from '@/components/dashboard/status-badge';
import { DataTable } from '@/components/dashboard/data-table';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { mockSuppressions } from '@/lib/mock-data';
import { formatDate } from '@/lib/format';
import type { Suppression, SuppressionReason } from '@/lib/types';

const reasonFilters: { value: string; label: string }[] = [
  { value: 'all', label: 'All reasons' },
  { value: 'hard_bounce', label: 'Hard Bounce' },
  { value: 'spam_complaint', label: 'Spam Complaint' },
  { value: 'manual', label: 'Manual' },
];

const PAGE_SIZE = 10;

export default function SuppressionsPage() {
  const [suppressions, setSuppressions] = useState<Suppression[]>(mockSuppressions);
  const [search, setSearch] = useState('');
  const [reasonFilter, setReasonFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [addOpen, setAddOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newReason, setNewReason] = useState<SuppressionReason>('manual');
  const [newDetail, setNewDetail] = useState('');
  const [addError, setAddError] = useState('');
  const [removeTarget, setRemoveTarget] = useState<Suppression | null>(null);

  const filtered = useMemo(() => {
    return suppressions.filter((s) => {
      const matchesSearch = !search || s.email.toLowerCase().includes(search.toLowerCase()) || s.domain.toLowerCase().includes(search.toLowerCase());
      const matchesReason = reasonFilter === 'all' || s.reason === reasonFilter;
      return matchesSearch && matchesReason;
    });
  }, [suppressions, search, reasonFilter]);

  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleAdd = () => {
    setAddError('');
    if (!newEmail.trim()) { setAddError('Please enter an email address.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) { setAddError('Please enter a valid email address.'); return; }
    if (suppressions.some((s) => s.email === newEmail.trim())) { setAddError('This address is already suppressed.'); return; }
    const sup: Suppression = {
      id: `sup_${Date.now()}`,
      email: newEmail.trim(),
      reason: newReason,
      createdAt: new Date().toISOString(),
      domain: newEmail.trim().split('@')[1],
      detail: newDetail.trim() || 'Manually added suppression',
    };
    setSuppressions([sup, ...suppressions]);
    setNewEmail(''); setNewDetail(''); setNewReason('manual');
    setAddOpen(false);
  };

  const handleRemove = () => {
    if (!removeTarget) return;
    setSuppressions((prev) => prev.filter((s) => s.id !== removeTarget.id));
    setRemoveTarget(null);
  };

  const columns = [
    {
      key: 'email',
      header: 'Email Address',
      render: (row: Suppression) => <span className="text-sm font-medium text-foreground">{row.email}</span>,
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (row: Suppression) => <SuppressionReasonBadge reason={row.reason} />,
    },
    {
      key: 'domain',
      header: 'Domain',
      render: (row: Suppression) => <span className="text-xs text-muted-foreground">{row.domain}</span>,
    },
    {
      key: 'detail',
      header: 'Detail',
      render: (row: Suppression) => <span className="text-xs text-muted-foreground truncate max-w-[240px] block">{row.detail}</span>,
    },
    {
      key: 'createdAt',
      header: 'Added',
      render: (row: Suppression) => <span className="text-xs text-muted-foreground">{formatDate(row.createdAt)}</span>,
    },
    {
      key: 'actions',
      header: '',
      render: (row: Suppression) => (
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={(e) => { e.stopPropagation(); setRemoveTarget(row); }}
        >
          <Trash2 className="h-3.5 w-3.5" />
          Remove
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        title="Suppressions"
        description="Manage addresses that should never receive email. MailForge will not send to any suppressed address."
        action={
          <Button onClick={() => setAddOpen(true)} size="sm">
            <Plus className="h-4 w-4" />
            Add Suppression
          </Button>
        }
      />
      <MockDataBanner />

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Hard Bounces</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
            {suppressions.filter((s) => s.reason === 'hard_bounce').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Spam Complaints</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
            {suppressions.filter((s) => s.reason === 'spam_complaint').length}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Manual</p>
          <p className="mt-1 text-xl font-semibold tabular-nums text-foreground">
            {suppressions.filter((s) => s.reason === 'manual').length}
          </p>
        </Card>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by email or domain..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="pl-9"
          />
        </div>
        <Select value={reasonFilter} onValueChange={(v) => { setReasonFilter(v); setPage(1); }}>
          <SelectTrigger className="w-[160px]">
            <Filter className="mr-2 h-3.5 w-3.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {reasonFilters.map((r) => (
              <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <DataTable
        columns={columns}
        data={paginated}
        emptyState={
          <EmptyState
            icon={Ban}
            title="No suppressions found"
            description="There are no suppression entries matching your filters."
          />
        }
        pagination={{
          page,
          pageSize: PAGE_SIZE,
          total: filtered.length,
          onPageChange: setPage,
        }}
      />

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Suppression</DialogTitle>
            <DialogDescription>
              Add an email address to the suppression list. MailForge will never send to this address.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="supemail">Email address</Label>
              <Input id="supemail" placeholder="user@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
              {addError && <p className="text-xs text-destructive">{addError}</p>}
            </div>
            <div className="space-y-2">
              <Label htmlFor="supreason">Reason</Label>
              <Select value={newReason} onValueChange={(v) => setNewReason(v as SuppressionReason)}>
                <SelectTrigger id="supreason"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="hard_bounce">Hard Bounce</SelectItem>
                  <SelectItem value="spam_complaint">Spam Complaint</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="supdetail">Detail (optional)</Label>
              <Input id="supdetail" placeholder="Reason for suppression" value={newDetail} onChange={(e) => setNewDetail(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add Suppression</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!removeTarget} onOpenChange={(open) => !open && setRemoveTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Suppression?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove <span className="font-medium text-foreground">{removeTarget?.email}</span> from the suppression list. Future emails will be sent to this address again. Only do this if you are confident the address is now valid.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
