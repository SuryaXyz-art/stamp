"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function CopyButton({ value, label = "Copy", className }: { value: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      className={className}
      onClick={async () => {
        await navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 1600);
      }}
      aria-live="polite"
    >
      {copied ? <Check aria-hidden="true" className="text-success" /> : <Copy aria-hidden="true" />}
      {copied ? "Copied" : label}
    </Button>
  );
}
