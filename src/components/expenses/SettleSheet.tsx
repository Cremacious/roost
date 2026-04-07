"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Loader2, CheckCircle } from "lucide-react";
import MemberAvatar from "@/components/shared/MemberAvatar";

const COLOR = "#22C55E";
const COLOR_DARK = "#16A34A";

// ---- Types ------------------------------------------------------------------

interface DebtItem {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
}

interface SettleSheetProps {
  open: boolean;
  onClose: () => void;
  debt: DebtItem | null;
  currentUserId: string;
  memberAvatars: Record<string, string | null>;
}

// ---- Component --------------------------------------------------------------

export default function SettleSheet({
  open,
  onClose,
  debt,
  currentUserId,
  memberAvatars,
}: SettleSheetProps) {
  const queryClient = useQueryClient();
  const [confirmed, setConfirmed] = useState(false);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
  }

  const settleAllMutation = useMutation({
    mutationFn: async () => {
      if (!debt) throw new Error("No debt selected");
      const withUserId = debt.fromUserId === currentUserId ? debt.toUserId : debt.fromUserId;
      const r = await fetch("/api/expenses/settle-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ with_user_id: withUserId }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to settle up");
      }
      return r.json();
    },
    onSuccess: (data) => {
      invalidate();
      toast.success(`Settled ${data.settled} split${data.settled !== 1 ? "s" : ""}`);
      setConfirmed(false);
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  if (!debt) return null;

  const isOwer = debt.fromUserId === currentUserId;
  const otherName = isOwer ? debt.toName : debt.fromName;
  const otherUserId = isOwer ? debt.toUserId : debt.fromUserId;
  const otherAvatar = memberAvatars[otherUserId] ?? null;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) { setConfirmed(false); onClose(); } }}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl px-4 pb-8 pt-2"
        style={{ backgroundColor: "var(--roost-surface)", maxHeight: "80dvh", overflowY: "auto" }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ backgroundColor: "var(--roost-border)" }} />
        <SheetHeader className="mb-5 text-left">
          <SheetTitle style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
            Settle Up
          </SheetTitle>
        </SheetHeader>

        {/* Summary card */}
        <div
          className="mb-5 rounded-2xl p-4"
          style={{ backgroundColor: `${COLOR}18`, border: `1.5px solid ${COLOR}30`, borderBottom: `4px solid ${COLOR_DARK}30` }}
        >
          <div className="mb-3 flex items-center gap-3">
            <MemberAvatar
              name={isOwer ? (debt.fromName) : (debt.toName)}
              avatarColor={memberAvatars[currentUserId] ?? null}
              size="md"
            />
            <div>
              <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
                {isOwer ? "You owe" : "You are owed"}
              </p>
              <p className="text-2xl" style={{ color: COLOR, fontWeight: 900 }}>
                ${debt.amount.toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <MemberAvatar name={otherName} avatarColor={otherAvatar} size="sm" />
            <span className="text-sm" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
              {isOwer ? `to ${otherName.split(" ")[0]}` : `from ${otherName.split(" ")[0]}`}
            </span>
          </div>
        </div>

        <p className="mb-5 text-sm leading-relaxed" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
          Marking as settled means you have paid or received the money outside the app. This will clear all unsettled expenses between you and {otherName.split(" ")[0]}.
        </p>

        {!confirmed ? (
          <motion.button
            type="button"
            onClick={() => setConfirmed(true)}
            whileTap={{ y: 2 }}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm text-white"
            style={{
              backgroundColor: COLOR,
              border: `1.5px solid ${COLOR}`,
              borderBottom: `3px solid ${COLOR_DARK}`,
              fontWeight: 800,
            }}
          >
            <CheckCircle className="size-4" />
            Mark as settled
          </motion.button>
        ) : (
          <div className="space-y-3">
            <p className="text-center text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
              Confirm you have settled ${debt.amount.toFixed(2)} with {otherName.split(" ")[0]}?
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirmed(false)}
                className="flex h-12 flex-1 items-center justify-center rounded-xl text-sm"
                style={{ border: "1.5px solid #E5E7EB", borderBottom: "3px solid #E5E7EB", color: "var(--roost-text-primary)", fontWeight: 700 }}
              >
                Cancel
              </button>
              <motion.button
                type="button"
                whileTap={{ y: 2 }}
                onClick={() => settleAllMutation.mutate()}
                disabled={settleAllMutation.isPending}
                className="flex h-12 flex-1 items-center justify-center rounded-xl text-sm text-white"
                style={{
                  backgroundColor: COLOR,
                  border: `1.5px solid ${COLOR}`,
                  borderBottom: `3px solid ${COLOR_DARK}`,
                  fontWeight: 800,
                  opacity: settleAllMutation.isPending ? 0.7 : 1,
                }}
              >
                {settleAllMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Confirm"}
              </motion.button>
            </div>
          </div>
        )}

        {!confirmed && (
          <button
            type="button"
            onClick={onClose}
            className="mt-3 flex h-11 w-full items-center justify-center rounded-xl text-sm"
            style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}
          >
            Cancel
          </button>
        )}
      </SheetContent>
    </Sheet>
  );
}
