"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Pencil, Trash2 } from "lucide-react";
import { format } from "date-fns";
import MemberAvatar from "@/components/shared/MemberAvatar";

const COLOR = "#22C55E";
const COLOR_DARK = "#16A34A";

// ---- Types ------------------------------------------------------------------

export interface SplitData {
  id: string;
  user_id: string;
  amount: string;
  settled: boolean;
  settled_at: string | null;
  user_name: string | null;
  user_avatar: string | null;
}

export interface ExpenseData {
  id: string;
  title: string;
  total_amount: string;
  paid_by: string;
  category: string | null;
  created_at: string | null;
  updated_at: string | null;
  payer_name: string | null;
  payer_avatar: string | null;
  splits: SplitData[];
}

interface Member {
  userId: string;
  name: string;
  avatarColor: string | null;
}

interface ExpenseSheetProps {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit" | "view";
  expense?: ExpenseData | null;
  currentUserId: string;
  isAdmin: boolean;
  members: Member[];
}

// ---- Input style ------------------------------------------------------------

const inputStyle: React.CSSProperties = {
  border: "1.5px solid var(--roost-border)",
  borderBottom: "3px solid var(--roost-border-bottom)",
  color: "var(--roost-text-primary)",
  fontWeight: 600,
  backgroundColor: "transparent",
};

// ---- Split methods ----------------------------------------------------------

type SplitMethod = "equal" | "custom" | "payer-only";

// ---- Component --------------------------------------------------------------

export default function ExpenseSheet({
  open,
  onClose,
  mode: initialMode,
  expense,
  currentUserId,
  isAdmin,
  members,
}: ExpenseSheetProps) {
  const queryClient = useQueryClient();
  const amountRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState(initialMode);
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [paidBy, setPaidBy] = useState(currentUserId);
  const [category, setCategory] = useState("");
  const [splitMethod, setSplitMethod] = useState<SplitMethod>("equal");
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const canEdit = expense && (expense.paid_by === currentUserId || isAdmin);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    if (initialMode === "create") {
      setTitle("");
      setAmount("");
      setPaidBy(currentUserId);
      setCategory("");
      setSplitMethod("equal");
      setCustomSplits({});
      setTimeout(() => amountRef.current?.focus(), 100);
    } else if (expense) {
      setTitle(expense.title);
      setAmount(parseFloat(expense.total_amount).toFixed(2));
      setPaidBy(expense.paid_by);
      setCategory(expense.category ?? "");
      setSplitMethod("custom");
      const splits: Record<string, string> = {};
      for (const s of expense.splits) {
        splits[s.user_id] = parseFloat(s.amount).toFixed(2);
      }
      setCustomSplits(splits);
    }
  }, [open, initialMode, expense, currentUserId]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
  }

  // Computed splits for "equal" method
  function computeEqualSplits(): { user_id: string; amount: number }[] {
    if (!members.length) return [];
    const total = parseFloat(amount) || 0;
    const share = Math.round((total / members.length) * 100) / 100;
    const splits = members.map((m) => ({ user_id: m.userId, amount: share }));
    // Adjust last member for rounding
    const sumSoFar = splits.slice(0, -1).reduce((a, s) => a + s.amount, 0);
    splits[splits.length - 1].amount = Math.round((total - sumSoFar) * 100) / 100;
    return splits;
  }

  function computeSplits(): { user_id: string; amount: number }[] {
    if (splitMethod === "equal") return computeEqualSplits();
    if (splitMethod === "payer-only") {
      const total = parseFloat(amount) || 0;
      return [{ user_id: paidBy, amount: total }];
    }
    // custom
    return members.map((m) => ({
      user_id: m.userId,
      amount: parseFloat(customSplits[m.userId] || "0") || 0,
    }));
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const total = parseFloat(amount);
      if (!title.trim()) throw new Error("Title is required");
      if (!total || total <= 0) throw new Error("Amount must be greater than 0");

      const splits = computeSplits();
      const splitsSum = splits.reduce((a, s) => a + s.amount, 0);
      if (Math.abs(splitsSum - total) > 0.02) {
        throw new Error("Splits must add up to the total");
      }

      if (mode === "create") {
        const r = await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), total_amount: total, paid_by: paidBy, category: category.trim() || undefined, splits }),
        });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error ?? "Failed to save expense");
        }
        return r.json();
      } else {
        const r = await fetch(`/api/expenses/${expense!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), category: category.trim() || null }),
        });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error ?? "Failed to update expense");
        }
        return r.json();
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success(mode === "create" ? "Expense added" : "Expense updated");
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/expenses/${expense!.id}`, { method: "DELETE" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to delete expense");
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success("Expense deleted");
      setDeleteDialogOpen(false);
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const total = parseFloat(amount) || 0;

  // ---- View mode -------------------------------------------------------------

  if (mode === "view" && expense) {
    const timestamp = expense.created_at
      ? format(new Date(expense.created_at), "EEEE MMMM d 'at' h:mm a")
      : null;
    const totalAmt = parseFloat(expense.total_amount);
    const unsettledSplits = expense.splits.filter((s) => !s.settled && s.user_id !== expense.paid_by);

    return (
      <>
        <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
          <SheetContent
            side="bottom"
            className="rounded-t-2xl px-4 pb-8 pt-2"
            style={{ backgroundColor: "var(--roost-surface)", maxHeight: "88dvh", overflowY: "auto" }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ backgroundColor: "var(--roost-border)" }} />

            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl leading-tight" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
                  {expense.title}
                </h2>
                {expense.category && (
                  <p className="mt-0.5 text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                    {expense.category}
                  </p>
                )}
              </div>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setMode("edit")}
                  className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm"
                  style={{
                    border: "1.5px solid var(--roost-border)",
                    borderBottom: "3px solid var(--roost-border-bottom)",
                    color: "var(--roost-text-secondary)",
                    fontWeight: 700,
                  }}
                >
                  <Pencil className="size-3.5" />
                  Edit
                </button>
              )}
            </div>

            {/* Amount */}
            <div
              className="mb-4 rounded-2xl p-4 text-center"
              style={{ backgroundColor: `${COLOR}18`, border: `1.5px solid ${COLOR}30` }}
            >
              <p className="text-3xl" style={{ color: COLOR, fontWeight: 900 }}>
                ${totalAmt.toFixed(2)}
              </p>
              <div className="mt-1 flex items-center justify-center gap-1.5">
                {expense.payer_name && (
                  <MemberAvatar name={expense.payer_name} avatarColor={expense.payer_avatar} size="sm" />
                )}
                <span className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                  Paid by {expense.payer_name?.split(" ")[0] ?? "Someone"}
                </span>
              </div>
            </div>

            {/* Splits */}
            {expense.splits.length > 0 && (
              <div className="mb-4 space-y-2">
                <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
                  Splits
                </p>
                {expense.splits.map((split) => (
                  <div
                    key={split.id}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5"
                    style={{ border: "1.5px solid var(--roost-border)", borderBottom: "3px solid var(--roost-border-bottom)" }}
                  >
                    <div className="flex items-center gap-2">
                      {split.user_name && (
                        <MemberAvatar name={split.user_name} avatarColor={split.user_avatar} size="sm" />
                      )}
                      <span className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
                        {split.user_name?.split(" ")[0] ?? "Member"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
                        ${parseFloat(split.amount).toFixed(2)}
                      </span>
                      {split.settled ? (
                        <span className="rounded-full px-2 py-0.5 text-xs" style={{ backgroundColor: `${COLOR}18`, color: COLOR, fontWeight: 700 }}>
                          Settled
                        </span>
                      ) : (
                        split.user_id !== expense.paid_by && (
                          <span className="rounded-full px-2 py-0.5 text-xs" style={{ backgroundColor: "var(--roost-border)", color: "var(--roost-text-muted)", fontWeight: 700 }}>
                            Pending
                          </span>
                        )
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                {timestamp}
              </span>
            </div>

            {/* Delete */}
            {canEdit && (
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(true)}
                className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm"
                style={{ color: "#EF4444", fontWeight: 700 }}
              >
                <Trash2 className="size-4" />
                Delete expense
              </button>
            )}
          </SheetContent>
        </Sheet>

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
                Delete expense?
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
              {expense.title} — ${parseFloat(expense.total_amount).toFixed(2)}
            </p>
            <DialogFooter className="mt-2 gap-2">
              <button type="button" onClick={() => setDeleteDialogOpen(false)}
                className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm"
                style={{ border: "1.5px solid var(--roost-border)", borderBottom: "3px solid var(--roost-border-bottom)", color: "var(--roost-text-primary)", fontWeight: 700 }}>
                Cancel
              </button>
              <motion.button type="button" whileTap={{ y: 1 }}
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm text-white"
                style={{ backgroundColor: "#EF4444", border: "1.5px solid #C93B3B", borderBottom: "3px solid #A63030", fontWeight: 800, opacity: deleteMutation.isPending ? 0.7 : 1 }}>
                {deleteMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
              </motion.button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // ---- Create / Edit mode ----------------------------------------------------

  const CATEGORIES = ["Food", "Groceries", "Utilities", "Rent", "Transport", "Entertainment", "Other"];

  const splits = computeSplits();
  const splitsSum = splits.reduce((a, s) => a + s.amount, 0);
  const splitsDiff = Math.abs(splitsSum - total);
  const splitsValid = total > 0 && splitsDiff <= 0.02;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl px-4 pb-8 pt-2"
        style={{ backgroundColor: "var(--roost-surface)", maxHeight: "88dvh", overflowY: "auto" }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ backgroundColor: "var(--roost-border)" }} />
        <SheetHeader className="mb-5 text-left">
          <SheetTitle style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
            {mode === "create" ? "New Expense" : "Edit Expense"}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Title */}
          <div>
            <label className="mb-1.5 block text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
              What was it for?
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Dinner, electricity bill..."
              className="h-12 w-full rounded-xl px-4 text-sm focus:outline-none"
              style={inputStyle}
            />
          </div>

          {/* Amount */}
          <div>
            <label className="mb-1.5 block text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
              Amount
            </label>
            <div className="relative">
              <span
                className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm"
                style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}
              >
                $
              </span>
              <input
                ref={amountRef}
                type="number"
                step="0.01"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="h-12 w-full rounded-xl pl-8 pr-4 text-sm focus:outline-none"
                style={inputStyle}
                disabled={mode === "edit"}
              />
            </div>
          </div>

          {/* Paid by */}
          {mode === "create" && (
            <div>
              <label className="mb-1.5 block text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
                Paid by
              </label>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const active = paidBy === m.userId;
                  return (
                    <button
                      key={m.userId}
                      type="button"
                      onClick={() => setPaidBy(m.userId)}
                      className="flex h-10 items-center gap-2 rounded-xl px-3 text-sm"
                      style={{
                        border: active ? `1.5px solid ${COLOR}` : "1.5px solid var(--roost-border)",
                        borderBottom: active ? `3px solid ${COLOR_DARK}` : "3px solid var(--roost-border-bottom)",
                        backgroundColor: active ? `${COLOR}18` : "transparent",
                        color: active ? COLOR : "var(--roost-text-secondary)",
                        fontWeight: 700,
                      }}
                    >
                      <MemberAvatar name={m.name} avatarColor={m.avatarColor} size="sm" />
                      {m.name.split(" ")[0]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Category */}
          <div>
            <label className="mb-1.5 block text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
              Category (optional)
            </label>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const active = category === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(active ? "" : cat)}
                    className="h-9 rounded-xl px-3 text-xs"
                    style={{
                      border: active ? `1.5px solid ${COLOR}` : "1.5px solid var(--roost-border)",
                      borderBottom: active ? `3px solid ${COLOR_DARK}` : "3px solid var(--roost-border-bottom)",
                      backgroundColor: active ? `${COLOR}18` : "transparent",
                      color: active ? COLOR : "var(--roost-text-secondary)",
                      fontWeight: 700,
                    }}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Split method — create only */}
          {mode === "create" && (
            <div>
              <label className="mb-1.5 block text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
                Split
              </label>
              <div className="flex gap-2">
                {([
                  { value: "equal" as SplitMethod, label: "Equal" },
                  { value: "custom" as SplitMethod, label: "Custom" },
                  { value: "payer-only" as SplitMethod, label: "Just me" },
                ] as const).map(({ value, label }) => {
                  const active = splitMethod === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setSplitMethod(value)}
                      className="h-10 flex-1 rounded-xl text-sm"
                      style={{
                        border: active ? `1.5px solid ${COLOR}` : "1.5px solid var(--roost-border)",
                        borderBottom: active ? `3px solid ${COLOR_DARK}` : "3px solid var(--roost-border-bottom)",
                        backgroundColor: active ? `${COLOR}18` : "transparent",
                        color: active ? COLOR : "var(--roost-text-secondary)",
                        fontWeight: 700,
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>

              {/* Custom split inputs */}
              {splitMethod === "custom" && total > 0 && (
                <div className="mt-3 space-y-2">
                  {members.map((m) => (
                    <div key={m.userId} className="flex items-center gap-3">
                      <div className="flex flex-1 items-center gap-2">
                        <MemberAvatar name={m.name} avatarColor={m.avatarColor} size="sm" />
                        <span className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
                          {m.name.split(" ")[0]}
                        </span>
                      </div>
                      <div className="relative w-28">
                        <span
                          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm"
                          style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}
                        >
                          $
                        </span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={customSplits[m.userId] ?? ""}
                          onChange={(e) => setCustomSplits((prev) => ({ ...prev, [m.userId]: e.target.value }))}
                          placeholder="0.00"
                          className="h-10 w-full rounded-xl pl-7 pr-3 text-sm focus:outline-none"
                          style={inputStyle}
                        />
                      </div>
                    </div>
                  ))}
                  {total > 0 && !splitsValid && (
                    <p className="text-xs" style={{ color: "#EF4444", fontWeight: 600 }}>
                      Splits total ${splitsSum.toFixed(2)}, need ${total.toFixed(2)}
                    </p>
                  )}
                </div>
              )}

              {/* Equal split preview */}
              {splitMethod === "equal" && total > 0 && members.length > 0 && (
                <p className="mt-2 text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                  ${(total / members.length).toFixed(2)} each across {members.length} members
                </p>
              )}
            </div>
          )}

          {/* Save */}
          <motion.button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !title.trim() || (mode === "create" && (!splitsValid || !paidBy))}
            whileTap={{ y: 2 }}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm text-white"
            style={{
              backgroundColor: COLOR,
              border: `1.5px solid ${COLOR}`,
              borderBottom: `3px solid ${COLOR_DARK}`,
              fontWeight: 800,
              opacity: (saveMutation.isPending || !title.trim() || (mode === "create" && (!splitsValid || !paidBy))) ? 0.6 : 1,
            }}
          >
            {saveMutation.isPending
              ? <Loader2 className="size-4 animate-spin" />
              : mode === "create" ? "Add Expense" : "Save Changes"}
          </motion.button>

          {/* Cancel */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-11 w-full items-center justify-center rounded-xl text-sm"
            style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}
          >
            Cancel
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
