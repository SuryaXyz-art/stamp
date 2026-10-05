import { Button } from "@/components/ui/button";

/** "Load older" under a mailbox list. Renders nothing once everything is shown. */
export function LoadOlder({ shown, total, loading, onClick }: { shown: number; total: bigint | undefined; loading: boolean; onClick: () => void }) {
  if (total === undefined || BigInt(shown) >= total) return null;
  return (
    <div className="flex flex-col items-center gap-2 pt-2">
      <Button variant="outline" className="rounded-xl" onClick={onClick} disabled={loading} aria-busy={loading}>
        {loading ? "Loading…" : "Load older"}
      </Button>
      <p className="text-xs text-muted-foreground tabular">
        Showing the newest {shown} of {total.toString()}
      </p>
    </div>
  );
}
