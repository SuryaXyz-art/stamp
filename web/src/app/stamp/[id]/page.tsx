import type { Metadata } from "next";
import Link from "next/link";
import { Receipt } from "@/components/receipt/receipt";
import { EmptyState } from "@/components/stamp/empty-state";
import { Button } from "@/components/ui/button";

export async function generateMetadata({ params }: PageProps<"/stamp/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Stamp #${id}`, description: "A stamped message on Arc: who sent it, how much, and how it was settled." };
}

export default async function Page({ params }: PageProps<"/stamp/[id]">) {
  const { id } = await params;
  if (!/^\d{1,30}$/.test(id)) {
    return (
      <div className="mx-auto max-w-xl px-4 py-16">
        <EmptyState
          title="No such stamp"
          description="Stamp receipts look like /stamp/42."
          action={
            <Button asChild variant="outline">
              <Link href="/">Back home</Link>
            </Button>
          }
        />
      </div>
    );
  }
  return <Receipt id={BigInt(id)} />;
}
