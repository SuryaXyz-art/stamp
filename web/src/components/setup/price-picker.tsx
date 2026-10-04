"use client";

import { useId, useState } from "react";
import { parseEther } from "viem";
import { Input } from "@/components/ui/input";
import { formatStampPrice, parseUsdc } from "@/lib/format";
import { cn } from "@/lib/utils";

const presets = ["0.25", "1", "5", "25"].map((v) => parseEther(v));

/** Price chips ($0.25 / $1 / $5 / $25 / custom). Value is 18-decimal native USDC. */
export function PricePicker({ value, onChange }: { value: bigint | undefined; onChange: (v: bigint | undefined) => void }) {
  const isPreset = value !== undefined && presets.includes(value);
  const [custom, setCustom] = useState(!isPreset && value !== undefined);
  const [text, setText] = useState(value !== undefined && !isPreset ? formatStampPrice(value).replace("$", "") : "");
  const customId = useId();

  return (
    <div>
      <div role="radiogroup" aria-label="Stamp price" className="flex flex-wrap gap-2">
        {presets.map((p) => {
          const active = !custom && value === p;
          return (
            <button
              key={p.toString()}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => {
                setCustom(false);
                onChange(p);
              }}
              className={cn(
                "h-11 min-w-16 rounded-xl border px-4 font-medium tabular transition-all duration-150",
                active ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:border-foreground/40",
              )}
            >
              {formatStampPrice(p)}
            </button>
          );
        })}
        <button
          type="button"
          role="radio"
          aria-checked={custom}
          onClick={() => {
            setCustom(true);
            onChange(parseUsdc(text));
          }}
          className={cn(
            "h-11 rounded-xl border px-4 font-medium transition-all duration-150",
            custom ? "border-foreground bg-foreground text-background" : "border-border bg-card hover:border-foreground/40",
          )}
        >
          Custom
        </button>
      </div>
      {custom && (
        <div className="mt-3 flex max-w-48 items-center rounded-xl border border-border bg-background focus-within:ring-2 focus-within:ring-ring">
          <span className="pl-3 text-muted-foreground" aria-hidden="true">
            $
          </span>
          <label htmlFor={customId} className="sr-only">
            Custom price in USDC
          </label>
          <Input
            id={customId}
            inputMode="decimal"
            autoFocus
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              onChange(parseUsdc(e.target.value));
            }}
            placeholder="2.50"
            className="h-11 border-0 bg-transparent tabular shadow-none focus-visible:ring-0"
          />
          <span className="pr-3 text-sm text-muted-foreground">USDC</span>
        </div>
      )}
    </div>
  );
}
