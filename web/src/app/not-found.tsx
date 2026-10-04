import Link from "next/link";
import { EmptyState } from "@/components/stamp/empty-state";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl px-4 py-16">
      <EmptyState
        title="Return to sender"
        description="This page doesn't exist. The link may be mistyped."
        action={
          <Button asChild>
            <Link href="/">Back home</Link>
          </Button>
        }
      />
    </div>
  );
}
