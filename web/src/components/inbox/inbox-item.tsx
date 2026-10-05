"use client";

import { Reply, Trash2 } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { EnvelopeCard } from "@/components/stamp/envelope-card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import type { StampItem } from "@/hooks/use-stampbox";
import { byteLength, formatStampPrice, formatUsdc } from "@/lib/format";

type Props = {
  index: number;
  item: StampItem;
  focused: boolean;
  selected: boolean;
  onSelect: (v: boolean) => void;
  replying: boolean;
  onReplyToggle: (v: boolean) => void;
  onRefund: (reply: string) => void;
  onKeep: () => void;
  busy: boolean;
  onFocus: () => void;
};

export function InboxItem({ index, item, focused, selected, onSelect, replying, onReplyToggle, onRefund, onKeep, busy, onFocus }: Props) {
  const [reply, setReply] = useState("");
  const replyId = useId();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pending = item.status === "pending";
  const reduce = useReducedMotion();

  useEffect(() => {
    if (replying) textareaRef.current?.focus();
  }, [replying]);

  return (
    <div data-index={index} className="relative" onClickCapture={onFocus}>
      <EnvelopeCard
        id={item.id}
        counterparty={item.from}
        direction="from"
        amount={item.amount}
        sentAt={item.sentAt}
        status={item.status}
        message={item.message}
        reply={item.reply}
        selected={selected}
        focused={focused}
        leading={
          pending ? (
            <Checkbox checked={selected} onCheckedChange={(v) => onSelect(Boolean(v))} aria-label={`Select stamp #${item.id}`} className="mt-2.5" />
          ) : undefined
        }
        actions={
          pending ? (
            <>
              <Button size="sm" className="h-9 rounded-lg" onClick={() => onReplyToggle(!replying)} aria-expanded={replying} disabled={busy}>
                <Reply aria-hidden="true" /> Reply &amp; refund
              </Button>
              <Button size="sm" variant="destructive" className="h-9 rounded-lg" onClick={onKeep} disabled={busy}>
                <Trash2 aria-hidden="true" /> Spam: keep {formatStampPrice(item.amount)}
              </Button>
            </>
          ) : undefined
        }
      />
      <AnimatePresence initial={false}>
        {pending && replying && (
          <motion.form
            initial={reduce ? false : { height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={reduce ? { opacity: 0, transition: { duration: 0 } } : { height: 0, opacity: 0 }}
            transition={{ duration: reduce ? 0 : 0.2 }}
            className="overflow-hidden"
            onSubmit={(e) => {
              e.preventDefault();
              onRefund(reply.trim());
            }}
          >
            <div className="mx-3 -mt-2 rounded-b-2xl border border-t-0 border-border bg-muted/50 p-4 pt-6 sm:mx-6">
              <label htmlFor={replyId} className="text-sm font-medium">
                Your reply <span className="font-normal text-muted-foreground">(optional, public on-chain)</span>
              </label>
              <Textarea
                ref={textareaRef}
                id={replyId}
                value={reply}
                onChange={(e) => setReply(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") onReplyToggle(false);
                  if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) onRefund(reply.trim());
                }}
                rows={3}
                placeholder="Thanks for reaching out! Let's talk: …"
                className="mt-2 rounded-xl bg-background"
              />
              <div className="mt-3 flex items-center justify-between gap-3">
                <span className="text-xs text-muted-foreground tabular">{byteLength(reply)} / 1000</span>
                <div className="flex gap-2">
                  <Button type="button" variant="ghost" size="sm" onClick={() => onReplyToggle(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="rounded-lg" disabled={busy || byteLength(reply) > 1000}>
                    Send reply &amp; refund {formatUsdc(item.amount)}
                  </Button>
                </div>
              </div>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
