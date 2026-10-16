import { Info } from 'lucide-react';

export function MockDataBanner() {
  return (
    <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-warning/20 bg-warning/5 px-4 py-2.5">
      <Info className="h-4 w-4 shrink-0 text-warning" />
      <p className="text-xs leading-relaxed text-muted-foreground">
        <span className="font-medium text-warning-foreground/90 text-foreground">
          Development Mode —
        </span>{' '}
        Displaying sample data for demonstration. No real emails are sent or tracked. Switch to Production mode for live data.
      </p>
    </div>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-border py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary/60">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-sm font-medium text-foreground">{title}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function LoadingState({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
      <div className="h-4 w-4 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      {label}
    </div>
  );
}
