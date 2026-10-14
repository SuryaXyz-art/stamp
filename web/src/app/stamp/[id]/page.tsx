import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Receipt } from "@/components/receipt/receipt";

export async function generateMetadata({ params }: PageProps<"/stamp/[id]">): Promise<Metadata> {
  const { id } = await params;
  return { title: `Stamp #${id}`, description: "A stamped message on Arc: who sent it, how much, and how it was settled." };
}

export default async function Page({ params }: PageProps<"/stamp/[id]">) {
  const { id } = await params;
  // Receipts look like /stamp/42; anything else gets the real 404 page and status.
  if (!/^\d{1,30}$/.test(id)) notFound();
  return <Receipt id={BigInt(id)} />;
}
