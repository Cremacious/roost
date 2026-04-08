"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Bell, CheckCircle, Loader2, XCircle } from "lucide-react";
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

export interface PendingClaim {
  fromUserId: string;
  toUserId: string;
  amount: number;
  claimedAt: string;
}

interface SettleSheetProps {
  open: boolean;
  onClose: () => void;
  debt: DebtItem | null;
  currentUserId: string;
  memberAvatars: Record<string, string | null>;
  pendingClaim?: PendingClaim | null;
}

// ---- Component --------------------------------------------------------------

export default function SettleSheet({
  open,
  onClose,
  debt,
  currentUserId,
  memberAvatars,
  pendingClaim,
}: SettleSheetProps) {
  const queryClient = useQueryClient();
  const [reminderSent, setReminderSent] = useState(false);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
  }

  function handleClose() {
    setReminderSent(false);
    onClose();
  }

  // Claim: debtor says they paid
  const claimMutation = useMutation({
    mutationFn: async () => {
      if (!debt) throw new Error("No debt selected");
      const r = await fetch("/api/expenses/settle-all/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: debt.toUserId }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to initiate settlement");
      }
      return r.json();
    },
    onSuccess: () => {
      invalidate();
      toast.success("Payment claim sent. Waiting for confirmation.");
      handleClose();
    },
    onError: (err: Error) => toast.error("Could not send claim", { description: err.message }),
  });

  // Cancel: debtor cancels their pending claim
  const cancelMutation = useMutation({
    mutationFn: async () => {
      if (!debt) throw new Error("No debt selected");
      const r = await fetch("/api/expenses/settle-all/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: debt.toUserId }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to cancel claim");
      }
      return r.json();
    },
    onSuccess: () => {
      invalidate();
      toast.success("Claim cancelled.");
      handleClose();
    },
    onError: (err: Error) => toast.error("Could not cancel claim", { description: err.message }),
  });

  // Confirm: payee confirms they received payment
  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!debt) throw new Error("No debt selected");
      const r = await fetch("/api/expenses/settle-all/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromUserId: debt.fromUserId }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to confirm payment");
      }
      return r.json();
    },
    onSuccess: (data) => {
      invalidate();
      toast.success(`Payment of $${data.total?.toFixed(2)} confirmed.`);
      handleClose();
    },
    onError: (err: Error) => toast.error("Could not confirm payment", { description: err.message }),
  });

  // Dispute: payee disputes the claim
  const disputeMutation = useMutation({
    mutationFn: async () => {
      if (!debt) throw new Error("No debt selected");
      const r = await fetch("/api/expenses/settle-all/dispute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fromUserId: debt.fromUserId }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to dispute payment");
      }
      return r.json();
    },
    onSuccess: () => {
      invalidate();
      toast.success("Payment disputed. They have been notified.");
      handleClose();
    },
    onError: (err: Error) => toast.error("Could not dispute payment", { description: err.message }),
  });

  // Remind: send a reminder to the payee
  const remindMutation = useMutation({
    mutationFn: async () => {
      if (!debt) throw new Error("No debt selected");
      const r = await fetch("/api/expenses/settle-all/remind", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toUserId: debt.toUserId }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Could not send reminder");
      }
      return r.json();
    },
    onSuccess: () => {
      setReminderSent(true);
      toast.success("Reminder sent.");
    },
    onError: (err: Error) => toast.error("Could not send reminder", { description: err.message }),
  });

  if (!debt) return null;

  const isOwer = debt.fromUserId === currentUserId;
  const otherName = isOwer ? debt.toName : debt.fromName;
  const otherUserId = isOwer ? debt.toUserId : debt.fromUserId;
  const otherAvatar = memberAvatars[otherUserId] ?? null;

  // Determine mode
  const iClaimedPending = pendingClaim?.fromUserId === currentUserId;
  const theyClaimedPending = pendingClaim?.toUserId === currentUserId;

  function renderContent() {
    if (iClaimedPending) {
      // I claimed, waiting for payee to confirm
      return (
        <>
          <SheetHeader className="mb-5 text-left">
            <SheetTitle style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
              Waiting for confirmation
            </SheetTitle>
          </SheetHeader>

          <div className="mb-5 rounded-2xl p-4" style={{ backgroundColor: "#FFF7ED", border: "1.5px solid #FED7AA", borderBottom: "4px solid #F97316" }}>
            <p className="text-sm" style={{ color: "#92400E", fontWeight: 700 }}>
              {otherName.split(" ")[0]} has not confirmed yet.
            </p>
            <p className="mt-1 text-xs" style={{ color: "#B45309", fontWeight: 600 }}>
              Once they confirm in the app, this will be marked as settled.
            </p>
          </div>

          <div className="mb-5 text-center">
            <p className="text-3xl" style={{ color: COLOR, fontWeight: 900 }}>
              ${debt!.amount.toFixed(2)}
            </p>
            <div className="mt-1 flex items-center justify-center gap-2">
              <MemberAvatar name={otherName} avatarColor={otherAvatar} size="sm" />
              <span className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                to {otherName.split(" ")[0]}
              </span>
            </div>
          </div>

          <div className="space-y-3">
            <motion.button
              type="button"
              whileTap={{ y: 1 }}
              onClick={() => remindMutation.mutate()}
              disabled={remindMutation.isPending || reminderSent}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm"
              style={{
                border: "1.5px solid var(--roost-border)",
                borderBottom: "3px solid var(--roost-border-bottom)",
                color: "var(--roost-text-primary)",
                fontWeight: 700,
                opacity: reminderSent ? 0.6 : 1,
              }}
            >
              {remindMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Bell className="size-4" />
              )}
              {reminderSent ? "Reminder sent" : "Send reminder"}
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ y: 1 }}
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm"
              style={{
                border: "1.5px solid #EF444430",
                borderBottom: "3px solid #EF444440",
                color: "#EF4444",
                fontWeight: 700,
              }}
            >
              {cancelMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Cancel claim"}
            </motion.button>
          </div>

          <button type="button" onClick={handleClose} className="mt-3 flex h-11 w-full items-center justify-center rounded-xl text-sm" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
            Close
          </button>
        </>
      );
    }

    if (theyClaimedPending) {
      // They claimed they paid me, I need to confirm or dispute
      const payerName = debt!.fromName;
      return (
        <>
          <SheetHeader className="mb-5 text-left">
            <SheetTitle style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
              {payerName.split(" ")[0]} says they paid you ${pendingClaim?.amount.toFixed(2)}
            </SheetTitle>
          </SheetHeader>

          <div className="mb-5 rounded-2xl p-4" style={{ backgroundColor: `${COLOR}18`, border: `1.5px solid ${COLOR}30`, borderBottom: `4px solid ${COLOR_DARK}30` }}>
            <p className="text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
              Did you receive this payment from {payerName.split(" ")[0]}?
            </p>
            <p className="mt-3 text-3xl text-center" style={{ color: COLOR, fontWeight: 900 }}>
              ${debt!.amount.toFixed(2)}
            </p>
          </div>

          <div className="space-y-3">
            <motion.button
              type="button"
              whileTap={{ y: 2 }}
              onClick={() => confirmMutation.mutate()}
              disabled={confirmMutation.isPending}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm text-white"
              style={{ backgroundColor: COLOR, border: `1.5px solid ${COLOR}`, borderBottom: `3px solid ${COLOR_DARK}`, fontWeight: 800 }}
            >
              {confirmMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
              Yes, I received it
            </motion.button>

            <motion.button
              type="button"
              whileTap={{ y: 1 }}
              onClick={() => disputeMutation.mutate()}
              disabled={disputeMutation.isPending}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm"
              style={{ border: "1.5px solid #EF444430", borderBottom: "3px solid #EF444440", color: "#EF4444", fontWeight: 700 }}
            >
              {disputeMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <XCircle className="size-4" />}
              No, I did not receive it
            </motion.button>
          </div>

          <button type="button" onClick={handleClose} className="mt-3 flex h-11 w-full items-center justify-center rounded-xl text-sm" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
            Cancel
          </button>
        </>
      );
    }

    // Default: fresh settle up (no pending claim)
    return (
      <>
        <SheetHeader className="mb-5 text-left">
          <SheetTitle style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
            Settle up with {otherName.split(" ")[0]}
          </SheetTitle>
        </SheetHeader>

        <div className="mb-4 rounded-2xl p-4" style={{ backgroundColor: `${COLOR}18`, border: `1.5px solid ${COLOR}30`, borderBottom: `4px solid ${COLOR_DARK}30` }}>
          <div className="flex items-center gap-3">
            <MemberAvatar name={otherName} avatarColor={otherAvatar} size="md" />
            <div>
              <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
                {isOwer ? "You owe" : "You are owed"}
              </p>
              <p className="text-2xl" style={{ color: COLOR, fontWeight: 900 }}>
                ${debt!.amount.toFixed(2)}
              </p>
            </div>
          </div>
        </div>

        <p className="mb-5 text-sm leading-relaxed" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
          Tap below once you have paid {otherName.split(" ")[0]} outside the app. Venmo, cash, bank transfer, whatever works. They will need to confirm receipt.
        </p>

        <motion.button
          type="button"
          onClick={() => claimMutation.mutate()}
          disabled={claimMutation.isPending}
          whileTap={{ y: 2 }}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm text-white"
          style={{ backgroundColor: COLOR, border: `1.5px solid ${COLOR}`, borderBottom: `3px solid ${COLOR_DARK}`, fontWeight: 800, opacity: claimMutation.isPending ? 0.7 : 1 }}
        >
          {claimMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle className="size-4" />}
          I paid {otherName.split(" ")[0]} ${debt!.amount.toFixed(2)}
        </motion.button>

        <button type="button" onClick={handleClose} className="mt-3 flex h-11 w-full items-center justify-center rounded-xl text-sm" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
          Cancel
        </button>
      </>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) handleClose(); }}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl px-4 pb-8 pt-2"
        style={{ backgroundColor: "var(--roost-surface)", maxHeight: "80dvh", overflowY: "auto" }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ backgroundColor: "var(--roost-border)" }} />
        {renderContent()}
      </SheetContent>
    </Sheet>
  );
}
