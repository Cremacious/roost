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
import { Loader2 } from "lucide-react";
import { SECTION_COLORS } from "@/lib/constants/colors";

const COLOR = SECTION_COLORS.meals;
const COLOR_DARK = "#C4581A";

const inputStyle: React.CSSProperties = {
  border: "1.5px solid var(--roost-border)",
  borderBottom: "3px solid var(--roost-border-bottom)",
  color: "var(--roost-text-primary)",
  fontWeight: 600,
  backgroundColor: "transparent",
};

interface SuggestionSheetProps {
  open: boolean;
  onClose: () => void;
}

export default function SuggestionSheet({ open, onClose }: SuggestionSheetProps) {
  const queryClient = useQueryClient();
  const [mealName, setMealName] = useState("");
  const [note, setNote] = useState("");

  function handleClose() {
    setMealName("");
    setNote("");
    onClose();
  }

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/meals/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ meal_name: mealName.trim(), note: note.trim() || undefined }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to submit suggestion");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      toast.success("Suggestion submitted", {
        description: "Your household can now vote on it.",
        className: "roost-toast roost-toast-success",
        descriptionClassName: "roost-toast-description",
      });
      handleClose();
    },
    onError: (err: Error) => {
      toast.error("Could not submit suggestion", {
        description: err.message,
        className: "roost-toast roost-toast-error",
        descriptionClassName: "roost-toast-description",
      });
    },
  });

  const canSubmit = mealName.trim().length > 0 && !submitMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl px-4 pb-8 pt-2"
        style={{ backgroundColor: "var(--roost-surface)", maxHeight: "80dvh", overflowY: "auto" }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ backgroundColor: "var(--roost-border)" }} />
        <SheetHeader className="mb-5 text-left">
          <SheetTitle style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
            Suggest a meal
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
              What are you craving?
            </label>
            <input
              type="text"
              value={mealName}
              onChange={(e) => setMealName(e.target.value)}
              placeholder="What are you craving?"
              autoFocus
              className="flex h-12 w-full rounded-xl px-4 text-sm placeholder:italic focus:outline-none"
              style={inputStyle}
              onKeyDown={(e) => {
                if (e.key === "Enter" && canSubmit) submitMutation.mutate();
              }}
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
              Make your case
              <span className="ml-1.5 text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                optional
              </span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Why should we have this? Make your case..."
              rows={3}
              className="w-full resize-none rounded-xl px-4 py-3 text-sm placeholder:italic focus:outline-none"
              style={inputStyle}
            />
          </div>

          <motion.button
            type="button"
            disabled={!canSubmit}
            onClick={() => submitMutation.mutate()}
            whileTap={{ y: 2 }}
            className="flex h-12 w-full items-center justify-center rounded-xl text-sm text-white disabled:opacity-50"
            style={{
              backgroundColor: COLOR,
              border: `1.5px solid ${COLOR}`,
              borderBottom: `3px solid ${COLOR_DARK}`,
              fontWeight: 800,
            }}
          >
            {submitMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              "Submit my vote"
            )}
          </motion.button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
