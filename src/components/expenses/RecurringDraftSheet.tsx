"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { RefreshCw, CheckCircle2, SkipForward } from "lucide-react";
import DraggableSheet from "@/components/shared/DraggableSheet";
import { SECTION_COLORS } from "@/lib/constants/colors";

const EXPENSE_COLOR = SECTION_COLORS.expenses;
const EXPENSE_COLOR_DARK = "#16A34A";

interface RecurringDraft {
  id: string;
  title: string;
  total_amount: string;
  paid_by: string;
  category: string | null;
  recurring_template_id: string | null;
  created_at: string | null;
  template_frequency: string | null;
  template_splits: { userId: string; amount: number }[] | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  drafts: RecurringDraft[];
}

const FREQ_LABELS: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
  yearly: "Yearly",
};

export default function RecurringDraftSheet({ open, onOpenChange, drafts }: Props) {
  const queryClient = useQueryClient();
  const [processing, setProcessing] = useState<Set<string>>(new Set());

  const postMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const res = await fetch(`/api/expenses/recurring/${templateId}/post`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to post expense");
      }
      return res.json();
    },
    onSuccess: (_, templateId) => {
      setProcessing((prev) => { const s = new Set(prev); s.delete(templateId); return s; });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Expense posted", { description: "Added to your expense list." });
      // Close sheet if all handled
      const remaining = drafts.filter(
        (d) => d.recurring_template_id !== templateId
      );
      if (remaining.length === 0) onOpenChange(false);
    },
    onError: (err: Error, templateId) => {
      setProcessing((prev) => { const s = new Set(prev); s.delete(templateId); return s; });
      toast.error("Failed to post expense", { description: err.message });
    },
  });

  const skipMutation = useMutation({
    mutationFn: async (templateId: string) => {
      const res = await fetch(`/api/expenses/recurring/${templateId}/skip`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to skip");
      }
      return res.json();
    },
    onSuccess: (_, templateId) => {
      setProcessing((prev) => { const s = new Set(prev); s.delete(templateId); return s; });
      queryClient.invalidateQueries({ queryKey: ["expenses"] });
      toast.success("Skipped", { description: "This cycle has been skipped." });
      const remaining = drafts.filter(
        (d) => d.recurring_template_id !== templateId
      );
      if (remaining.length === 0) onOpenChange(false);
    },
    onError: (err: Error, templateId) => {
      setProcessing((prev) => { const s = new Set(prev); s.delete(templateId); return s; });
      toast.error("Failed to skip", { description: err.message });
    },
  });

  function handlePost(draft: RecurringDraft) {
    if (!draft.recurring_template_id) return;
    setProcessing((prev) => new Set(prev).add(draft.recurring_template_id!));
    postMutation.mutate(draft.recurring_template_id);
  }

  function handleSkip(draft: RecurringDraft) {
    if (!draft.recurring_template_id) return;
    setProcessing((prev) => new Set(prev).add(draft.recurring_template_id!));
    skipMutation.mutate(draft.recurring_template_id);
  }

  return (
    <DraggableSheet open={open} onOpenChange={onOpenChange} featureColor={EXPENSE_COLOR}>
      <div className="overflow-y-auto px-4 pb-8" style={{ maxHeight: "calc(80dvh - 60px)" }}>
        <p className="mb-1 text-lg" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
          Recurring expenses due
        </p>
        <p className="mb-4 text-sm" style={{ color: "var(--roost-text-muted)" }}>
          Review and post or skip each one.
        </p>

        <div className="space-y-3">
          {drafts.map((draft) => {
            const templateId = draft.recurring_template_id ?? "";
            const busy = processing.has(templateId);
            const amount = parseFloat(draft.total_amount ?? "0");
            const freq = draft.template_frequency
              ? FREQ_LABELS[draft.template_frequency] ?? draft.template_frequency
              : null;

            return (
              <div
                key={draft.id}
                className="rounded-2xl p-4"
                style={{
                  backgroundColor: "var(--roost-surface)",
                  border: "1.5px solid var(--roost-border)",
                  borderBottom: `4px solid ${EXPENSE_COLOR_DARK}`,
                }}
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="flex-1 min-w-0">
                    <p
                      className="font-700 text-base truncate"
                      style={{ color: "var(--roost-text-primary)" }}
                    >
                      {draft.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span
                        className="text-sm font-600"
                        style={{ color: EXPENSE_COLOR }}
                      >
                        ${amount.toFixed(2)}
                      </span>
                      {freq && (
                        <>
                          <span style={{ color: "var(--roost-text-muted)" }}>·</span>
                          <span
                            className="text-sm"
                            style={{ color: "var(--roost-text-muted)" }}
                          >
                            {freq}
                          </span>
                        </>
                      )}
                      {draft.category && (
                        <>
                          <span style={{ color: "var(--roost-text-muted)" }}>·</span>
                          <span
                            className="text-sm"
                            style={{ color: "var(--roost-text-muted)" }}
                          >
                            {draft.category}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                  <RefreshCw
                    size={16}
                    style={{ color: EXPENSE_COLOR, flexShrink: 0, marginTop: 3 }}
                  />
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handlePost(draft)}
                    disabled={busy}
                    className="flex-1 flex items-center justify-center gap-1.5 h-11 rounded-xl font-700 text-sm transition-all active:translate-y-0.5 disabled:opacity-50"
                    style={{
                      backgroundColor: EXPENSE_COLOR,
                      borderBottom: `3px solid ${EXPENSE_COLOR_DARK}`,
                      color: "#fff",
                    }}
                  >
                    <CheckCircle2 size={15} />
                    Post
                  </button>
                  <button
                    onClick={() => handleSkip(draft)}
                    disabled={busy}
                    className="flex items-center justify-center gap-1.5 h-11 px-4 rounded-xl font-700 text-sm transition-all active:translate-y-0.5 disabled:opacity-50"
                    style={{
                      backgroundColor: "var(--roost-bg)",
                      border: "1.5px solid var(--roost-border)",
                      borderBottom: "3px solid var(--roost-border-bottom)",
                      color: "var(--roost-text-secondary)",
                    }}
                  >
                    <SkipForward size={15} />
                    Skip
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DraggableSheet>
  );
}
