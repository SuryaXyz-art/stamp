import { cn } from "@/lib/utils";

export function StatCard({ label, value, tone, loading }: { label: string; value: string; tone?: string; loading?: boolean }) {
  return (
    <div className="panel px-5 py-4">
      <p className="kicker text-muted-foreground">{label}</p>
      {loading ? (
        <div className="mt-2 h-8 w-20 animate-pulse rounded-md bg-muted" />
      ) : (
        <p className={cn("mt-1 font-mono text-3xl font-medium tracking-tight tabular-nums", tone)}>{value}</p>
      )}
    </div>
  );
}
