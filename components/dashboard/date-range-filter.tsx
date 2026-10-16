'use client';

import { useState } from 'react';
import { Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const ranges = [
  { label: '24 hours', value: '24h' },
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
];

export function DateRangeFilter({
  value = '7d',
  onChange,
}: {
  value?: string;
  onChange?: (value: string) => void;
}) {
  const [internalValue, setInternalValue] = useState(value);
  const current = internalValue;
  const handleSelect = (v: string) => {
    setInternalValue(v);
    onChange?.(v);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-2">
          <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-sm">
            {ranges.find((r) => r.value === current)?.label || 'Custom'}
          </span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {ranges.map((r) => (
          <DropdownMenuItem
            key={r.value}
            onClick={() => handleSelect(r.value)}
            className={cn(r.value === current && 'text-primary')}
          >
            {r.label}
            {r.value === current && <span className="ml-auto text-xs">•</span>}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
