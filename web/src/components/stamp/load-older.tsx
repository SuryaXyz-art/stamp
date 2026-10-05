import { Button } from "@/components/ui/button";

type Props = { shown: number; limit: number; total: bigint | undefined; loading: boolean; onClick: () => void };

/**
 * "Load older" under a mailbox list. Only shown when the loaded page is full: the count refetches on its own
 * timer, so a brand-new stamp can bump `total` before the list catches up, and that isn't an "older" one.
 */
export function LoadOlder({ shown, limit, total, loading, onClick }: Props) {
  if (total === undefined || shown < limit || BigInt(shown) >= total) return null;
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
