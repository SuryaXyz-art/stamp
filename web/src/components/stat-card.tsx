import { cn } from "@/lib/utils";

export function StatCard({ label, value, tone, loading }: { label: string; value: string; tone?: string; loading?: boolean }) {
  return (
    <div className="rounded-2xl border border-border bg-card px-5 py-4 shadow-[var(--shadow-paper)]">
      <p className="text-sm text-muted-foreground">{label}</p>
      {loading ? (
        <div className="mt-1.5 h-8 w-20 animate-pulse rounded-lg bg-muted" />
      ) : (
        <p className={cn("mt-0.5 font-serif text-3xl tabular", tone)}>{value}</p>
      )}
    </div>
  );
}
