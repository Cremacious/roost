"use client";

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { Loader2, Pause, Play, Trash2 } from "lucide-react";
import DraggableSheet from "@/components/shared/DraggableSheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import MemberAvatar from "@/components/shared/MemberAvatar";
import { SECTION_COLORS } from "@/lib/constants/colors";

const COLOR = SECTION_COLORS.expenses;
const COLOR_DARK = "#16A34A";

const inputStyle: React.CSSProperties = {
  backgroundColor: "var(--roost-surface)",
  border: "1.5px solid #E5E7EB",
  borderBottom: "3px solid #E5E7EB",
  color: "var(--roost-text-primary)",
  fontWeight: 600,
};

const FREQ_OPTIONS = [
  { value: "weekly", label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
] as const;

const CATEGORIES = [
  "Food", "Groceries", "Utilities", "Rent", "Transport", "Entertainment", "Other",
];

export interface RecurringTemplateData {
  id: string;
  title: string;
  category: string | null;
  notes: string | null;
  total_amount: string;
  frequency: string;
  next_due_date: string;
  last_posted_at: string | null;
  paused: boolean;
  splits: { userId: string; amount: number }[];
  created_by: string;
  created_at: string | null;
}

interface Member {
  userId: string;
  name: string;
  avatarColor: string | null;
}

interface Props {
  open: boolean;
  onClose: () => void;
  template: RecurringTemplateData;
  members: Member[];
}

export default function EditRecurringSheet({ open, onClose, template, members }: Props) {
  const queryClient = useQueryClient();

  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [frequency, setFrequency] = useState<"weekly" | "biweekly" | "monthly" | "yearly">("monthly");
  const [nextDueDate, setNextDueDate] = useState("");
  const [notes, setNotes] = useState("");
  const [splits, setSplits] = useState<{ userId: string; amount: number }[]>([]);
  const [editSplits, setEditSplits] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitle(template.title);
    setAmount(parseFloat(template.total_amount).toFixed(2));
    setCategory(template.category ?? "");
    setFrequency(template.frequency as typeof frequency);
    setNextDueDate(template.next_due_date);
    setNotes(template.notes ?? "");
    setSplits(template.splits ?? []);
    setEditSplits(false);
  }, [open, template]);

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["recurringTemplates"] });
    queryClient.invalidateQueries({ queryKey: ["expenses"] });
  }

  const total = parseFloat(amount) || 0;

  // Recompute splits equally when amount changes and not in custom edit mode
  function computeEqualSplits(): { userId: string; amount: number }[] {
    if (!members.length || !total) return splits;
    const share = Math.round((total / members.length) * 100) / 100;
    const result = members.map((m) => ({ userId: m.userId, amount: share }));
    const drift = Math.round((total - result.slice(0, -1).reduce((a, s) => a + s.amount, 0)) * 100) / 100;
    result[result.length - 1].amount = Math.round(drift * 100) / 100;
    return result;
  }

  const splitsSum = splits.reduce((a, s) => a + s.amount, 0);
  const splitsValid = total > 0 && Math.abs(splitsSum - total) <= 0.02;

  const saveMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/expenses/recurring/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim() || undefined,
          notes: notes.trim() || "",
          frequency,
          totalAmount: parseFloat(amount) || undefined,
          nextDueDate,
          category: category || undefined,
          splits: editSplits ? splits : undefined,
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to update");
      }
      return r.json();
    },
    onSuccess: () => {
      invalidate();
      toast.success("Recurring expense updated");
      onClose();
    },
    onError: (err: Error) => toast.error("Failed to update", { description: err.message }),
  });

  const pauseResumeMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/expenses/recurring/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paused: !template.paused }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to update");
      }
      return r.json();
    },
    onSuccess: () => {
      invalidate();
      toast.success(template.paused ? "Resumed" : "Paused");
      onClose();
    },
    onError: (err: Error) => toast.error("Failed to update", { description: err.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/expenses/recurring/${template.id}`, { method: "DELETE" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to delete");
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success("Recurring expense removed", {
        description: "Past expenses are kept in your history.",
      });
      setDeleteDialogOpen(false);
      onClose();
    },
    onError: (err: Error) => toast.error("Failed to delete", { description: err.message }),
  });

  return (
    <>
      <DraggableSheet open={open} onOpenChange={(v) => !v && onClose()} featureColor={COLOR}>
        <div className="px-4 pb-8" style={{ maxHeight: "calc(88dvh - 60px)" }}>
          <p className="mb-5 text-lg" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
            Edit Recurring Expense
          </p>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="mb-1.5 block text-xs" style={{ color: "#374151", fontWeight: 700 }}>
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="h-12 w-full rounded-xl px-4 text-sm focus:outline-none"
                style={inputStyle}
              />
            </div>

            {/* Amount */}
            <div>
              <label className="mb-1.5 block text-xs" style={{ color: "#374151", fontWeight: 700 }}>
                Amount
              </label>
              <div className="relative">
                <span
                  className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm"
                  style={{ color: "#374151", fontWeight: 700 }}
                >
                  $
                </span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="h-12 w-full rounded-xl pl-8 pr-4 text-sm focus:outline-none"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="mb-1.5 block text-xs" style={{ color: "#374151", fontWeight: 700 }}>
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
                        border: active ? `1.5px solid ${COLOR}` : "1.5px solid #E5E7EB",
                        borderBottom: active ? `3px solid ${COLOR_DARK}` : "3px solid #E5E7EB",
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

            {/* Frequency */}
            <div>
              <label className="mb-1.5 block text-xs" style={{ color: "#374151", fontWeight: 700 }}>
                Frequency
              </label>
              <div className="flex gap-2">
                {FREQ_OPTIONS.map(({ value, label }) => {
                  const active = frequency === value;
                  return (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setFrequency(value)}
                      className="h-10 flex-1 rounded-xl text-xs"
                      style={{
                        border: active ? `1.5px solid ${COLOR}` : "1.5px solid #E5E7EB",
                        borderBottom: active ? `3px solid ${COLOR_DARK}` : "3px solid #E5E7EB",
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
            </div>

            {/* Next due date */}
            <div>
              <label className="mb-1.5 block text-xs" style={{ color: "#374151", fontWeight: 700 }}>
                Next due
              </label>
              <input
                type="date"
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
                className="h-12 w-full rounded-xl px-4 text-sm focus:outline-none"
                style={inputStyle}
              />
            </div>

            {/* Notes */}
            <div>
              <label className="mb-1.5 block text-xs" style={{ color: "#374151", fontWeight: 700 }}>
                Notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Any details about this expense"
                className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none resize-none"
                style={inputStyle}
              />
            </div>

            {/* Splits */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs" style={{ color: "#374151", fontWeight: 700 }}>
                  Splits
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (!editSplits) {
                      // Pre-populate with equal splits if switching to edit mode
                      setSplits(computeEqualSplits());
                    }
                    setEditSplits((v) => !v);
                  }}
                  className="text-xs"
                  style={{ color: COLOR, fontWeight: 700 }}
                >
                  {editSplits ? "Done" : "Edit splits"}
                </button>
              </div>

              {!editSplits ? (
                <div className="space-y-1.5">
                  {splits.map((s) => {
                    const member = members.find((m) => m.userId === s.userId);
                    const name = member?.name ?? "Member";
                    return (
                      <div
                        key={s.userId}
                        className="flex items-center justify-between rounded-xl px-3 py-2"
                        style={{
                          border: "1.5px solid var(--roost-border)",
                          borderBottom: "3px solid #E5E7EB",
                        }}
                      >
                        <div className="flex items-center gap-2">
                          <MemberAvatar name={name} avatarColor={member?.avatarColor ?? null} size="sm" />
                          <span className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
                            {name.split(" ")[0]}
                          </span>
                        </div>
                        <span className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
                          ${s.amount.toFixed(2)}
                        </span>
                      </div>
                    );
                  })}
                  {splits.length === 0 && (
                    <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                      No splits configured. Tap &ldquo;Edit splits&rdquo; to set them.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-2">
                  {members.map((m) => {
                    const current = splits.find((s) => s.userId === m.userId)?.amount ?? 0;
                    return (
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
                            style={{ color: "#374151", fontWeight: 700 }}
                          >
                            $
                          </span>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={current === 0 ? "" : current.toString()}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setSplits((prev) => {
                                const existing = prev.find((s) => s.userId === m.userId);
                                if (existing) return prev.map((s) => s.userId === m.userId ? { ...s, amount: val } : s);
                                return [...prev, { userId: m.userId, amount: val }];
                              });
                            }}
                            placeholder="0.00"
                            className="h-10 w-full rounded-xl pl-7 pr-3 text-sm focus:outline-none"
                            style={inputStyle}
                          />
                        </div>
                      </div>
                    );
                  })}
                  {!splitsValid && total > 0 && (
                    <p className="text-xs" style={{ color: "#EF4444", fontWeight: 600 }}>
                      Splits total ${splitsSum.toFixed(2)}, need ${total.toFixed(2)}
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => setSplits(computeEqualSplits())}
                    className="text-xs"
                    style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}
                  >
                    Reset to equal
                  </button>
                </div>
              )}
            </div>

            {/* Save */}
            <motion.button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || !title.trim() || (editSplits && !splitsValid)}
              whileTap={{ y: 2 }}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm text-white"
              style={{
                backgroundColor: COLOR,
                border: `1.5px solid ${COLOR}`,
                borderBottom: `3px solid ${COLOR_DARK}`,
                fontWeight: 800,
                opacity: saveMutation.isPending || !title.trim() || (editSplits && !splitsValid) ? 0.6 : 1,
              }}
            >
              {saveMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Save Changes"}
            </motion.button>

            {/* Pause / Resume */}
            <button
              type="button"
              onClick={() => pauseResumeMutation.mutate()}
              disabled={pauseResumeMutation.isPending}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm"
              style={{
                border: "1.5px solid #FCD34D",
                borderBottom: "3px solid #D97706",
                color: "#D97706",
                fontWeight: 700,
                opacity: pauseResumeMutation.isPending ? 0.7 : 1,
              }}
            >
              {template.paused ? <Play className="size-4" /> : <Pause className="size-4" />}
              {template.paused ? "Resume recurring" : "Pause recurring"}
            </button>

            {/* Delete */}
            <button
              type="button"
              onClick={() => setDeleteDialogOpen(true)}
              className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm"
              style={{ color: "#EF4444", fontWeight: 700 }}
            >
              <Trash2 className="size-4" />
              Stop recurring expense
            </button>
          </div>
        </div>
      </DraggableSheet>

      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
              Stop this recurring expense?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
            Past expenses won&apos;t be deleted. No new drafts will be created for{" "}
            <strong>{template.title}</strong>.
          </p>
          <DialogFooter className="mt-2 gap-2">
            <button
              type="button"
              onClick={() => setDeleteDialogOpen(false)}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm"
              style={{
                border: "1.5px solid #E5E7EB",
                borderBottom: "3px solid #E5E7EB",
                color: "var(--roost-text-primary)",
                fontWeight: 700,
              }}
            >
              Cancel
            </button>
            <motion.button
              type="button"
              whileTap={{ y: 1 }}
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm text-white"
              style={{
                backgroundColor: "#EF4444",
                border: "1.5px solid #C93B3B",
                borderBottom: "3px solid #A63030",
                fontWeight: 800,
                opacity: deleteMutation.isPending ? 0.7 : 1,
              }}
            >
              {deleteMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Stop recurring"}
            </motion.button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
