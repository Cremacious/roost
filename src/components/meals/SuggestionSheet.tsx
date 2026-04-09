"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import DraggableSheet from "@/components/shared/DraggableSheet";
import { Loader2, Plus, X } from "lucide-react";
import { SECTION_COLORS } from "@/lib/constants/colors";

const COLOR = SECTION_COLORS.meals;
const COLOR_DARK = "#C4581A";

const CATEGORIES = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch",     label: "Lunch" },
  { value: "dinner",    label: "Dinner" },
  { value: "snack",     label: "Snack" },
];

const inputStyle: React.CSSProperties = {
  backgroundColor: "var(--roost-surface)",
  border: "1.5px solid #E5E7EB",
  borderBottom: "3px solid #E5E7EB",
  color: "var(--roost-text-primary)",
  fontWeight: 600,
};

interface SuggestionSheetProps {
  open: boolean;
  onClose: () => void;
  onUpgradeRequired?: (code: string) => void;
}

export default function SuggestionSheet({ open, onClose, onUpgradeRequired }: SuggestionSheetProps) {
  const queryClient = useQueryClient();
  const [mealName, setMealName] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("dinner");
  const [prepTime, setPrepTime] = useState("");
  const [ingredients, setIngredients] = useState<string[]>(["", ""]);

  function handleClose() {
    setMealName("");
    setNote("");
    setCategory("dinner");
    setPrepTime("");
    setIngredients(["", ""]);
    onClose();
  }

  function updateIngredient(i: number, value: string) {
    setIngredients((prev) => prev.map((v, idx) => (idx === i ? value : v)));
  }

  function removeIngredient(i: number) {
    setIngredients((prev) => prev.filter((_, idx) => idx !== i));
  }

  const submitMutation = useMutation({
    mutationFn: async () => {
      const filteredIngredients = ingredients.filter((i) => i.trim());
      const res = await fetch("/api/meals/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meal_name: mealName.trim(),
          note: note.trim() || undefined,
          category,
          prep_time: prepTime ? parseInt(prepTime) : undefined,
          ingredients: filteredIngredients.length > 0 ? filteredIngredients : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const err = new Error(data.error ?? "Failed to submit suggestion") as Error & { code?: string };
        err.code = data.code;
        throw err;
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
    onError: (err: Error & { code?: string }) => {
      if (err.code && onUpgradeRequired) {
        onUpgradeRequired(err.code);
        return;
      }
      toast.error("Could not submit suggestion", {
        description: err.message,
        className: "roost-toast roost-toast-error",
        descriptionClassName: "roost-toast-description",
      });
    },
  });

  const canSubmit = mealName.trim().length > 0 && !submitMutation.isPending;

  return (
    <DraggableSheet open={open} onOpenChange={(v) => !v && handleClose()} featureColor={COLOR}>
      <div className="px-4 pb-8" style={{ maxHeight: "calc(92dvh - 60px)" }}>
        <p className="mb-5 text-lg" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
          Suggest a meal
        </p>

        <div className="space-y-5">
          {/* Meal name */}
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
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <label className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
              Category
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map((c) => {
                const active = category === c.value;
                return (
                  <motion.button
                    key={c.value}
                    type="button"
                    onClick={() => setCategory(c.value)}
                    whileTap={{ y: 1 }}
                    className="flex h-11 items-center justify-center rounded-xl text-sm"
                    style={{
                      backgroundColor: active ? COLOR + "18" : "var(--roost-surface)",
                      border: active ? `1.5px solid ${COLOR}40` : "1.5px solid var(--roost-border)",
                      borderBottom: active ? `3px solid ${COLOR_DARK}70` : "3px solid #E5E7EB",
                      color: active ? COLOR : "var(--roost-text-secondary)",
                      fontWeight: active ? 800 : 600,
                    }}
                  >
                    {c.label}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Note */}
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
              rows={2}
              className="w-full resize-none rounded-xl px-4 py-3 text-sm placeholder:italic focus:outline-none"
              style={inputStyle}
            />
          </div>

          {/* Prep time */}
          <div className="space-y-1.5">
            <label className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
              Prep time
              <span className="ml-1.5 text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                optional
              </span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                value={prepTime}
                onChange={(e) => setPrepTime(e.target.value)}
                placeholder="30"
                min={1}
                className="flex h-12 w-28 rounded-xl px-4 text-sm placeholder:italic focus:outline-none"
                style={inputStyle}
              />
              <span className="text-sm" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                minutes
              </span>
            </div>
          </div>

          {/* Ingredients */}
          <div className="space-y-1.5">
            <label className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
              Ingredients
              <span className="ml-1.5 text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                optional
              </span>
            </label>
            <div className="space-y-2">
              {ingredients.map((ingredient, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={ingredient}
                    onChange={(e) => updateIngredient(i, e.target.value)}
                    placeholder="e.g. pasta, chicken"
                    className="flex h-11 flex-1 rounded-xl px-4 text-sm placeholder:italic focus:outline-none"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => removeIngredient(i)}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                    style={{
                      border: "1.5px solid #E5E7EB",
                      borderBottom: "3px solid #E5E7EB",
                      color: "var(--roost-text-muted)",
                    }}
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ))}
              <motion.button
                type="button"
                onClick={() => setIngredients((prev) => [...prev, ""])}
                whileTap={{ y: 1 }}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm"
                style={{
                  border: "1.5px dashed #E5E7EB",
                  borderBottom: "3px dashed #E5E7EB",
                  color: "var(--roost-text-muted)",
                  fontWeight: 700,
                }}
              >
                <Plus className="size-4" />
                Add ingredient
              </motion.button>
            </div>
          </div>

          {/* Submit */}
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
      </div>
    </DraggableSheet>
  );
}
