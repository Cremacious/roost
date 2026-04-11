"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { addDays, format, isToday, isTomorrow } from "date-fns";
import DraggableSheet from "@/components/shared/DraggableSheet";
import { CalendarDays, Loader2, Plus, X } from "lucide-react";
import { SECTION_COLORS } from "@/lib/constants/colors";

const COLOR = SECTION_COLORS.meals;
const COLOR_DARK = "#C4581A";

const CATEGORIES = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
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
  weekStart: string;
  onUpgradeRequired?: (code: string) => void;
}

function getDayLabel(date: Date): string {
  if (isToday(date)) return "Today";
  if (isTomorrow(date)) return "Tomorrow";
  return format(date, "EEE");
}

export default function SuggestionSheet({
  open,
  onClose,
  weekStart,
  onUpgradeRequired,
}: SuggestionSheetProps) {
  const queryClient = useQueryClient();
  const weekStartDate = new Date(`${weekStart}T12:00:00`);
  const weekDays = Array.from({ length: 7 }, (_, index) =>
    addDays(weekStartDate, index)
  );

  const [mealName, setMealName] = useState("");
  const [note, setNote] = useState("");
  const [category, setCategory] = useState("dinner");
  const [prepTime, setPrepTime] = useState("");
  const [ingredients, setIngredients] = useState<string[]>(["", ""]);
  const [targetSlotDate, setTargetSlotDate] = useState(() =>
    format(weekStartDate, "yyyy-MM-dd")
  );
  const [targetSlotType, setTargetSlotType] = useState("dinner");

  function handleClose() {
    setMealName("");
    setNote("");
    setCategory("dinner");
    setPrepTime("");
    setIngredients(["", ""]);
    setTargetSlotDate(format(weekStartDate, "yyyy-MM-dd"));
    setTargetSlotType("dinner");
    onClose();
  }

  function updateIngredient(index: number, value: string) {
    setIngredients((prev) => prev.map((item, i) => (i === index ? value : item)));
  }

  function removeIngredient(index: number) {
    setIngredients((prev) => prev.filter((_, i) => i !== index));
  }

  const submitMutation = useMutation({
    mutationFn: async () => {
      const filteredIngredients = ingredients.filter((item) => item.trim());
      const res = await fetch("/api/meals/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meal_name: mealName.trim(),
          note: note.trim() || undefined,
          category,
          prep_time: prepTime ? parseInt(prepTime, 10) : undefined,
          ingredients: filteredIngredients.length > 0 ? filteredIngredients : undefined,
          target_slot_date: targetSlotDate,
          target_slot_type: targetSlotType,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const err = new Error(data.error ?? "Failed to submit suggestion") as Error & {
          code?: string;
        };
        err.code = data.code;
        throw err;
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suggestions"] });
      toast.success("Meal suggested", {
        description: "It is ready for review in the Suggestions tab.",
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

  const canSubmit =
    mealName.trim().length > 0 &&
    targetSlotDate.length > 0 &&
    targetSlotType.length > 0 &&
    !submitMutation.isPending;

  return (
    <DraggableSheet open={open} onOpenChange={(value) => !value && handleClose()} featureColor={COLOR}>
      <div className="px-4 pb-8" style={{ maxHeight: "calc(92dvh - 60px)" }}>
        <p className="mb-5 text-lg" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
          Suggest a meal
        </p>

        <div className="space-y-5">
          <div className="space-y-1.5">
            <label className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
              What should we eat?
            </label>
            <input
              type="text"
              value={mealName}
              onChange={(e) => setMealName(e.target.value)}
              placeholder="Taco bowls, breakfast burritos, homemade pizza..."
              className="flex h-12 w-full rounded-xl px-4 text-sm placeholder:italic focus:outline-none"
              style={inputStyle}
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
              <CalendarDays className="size-4" />
              Which day should this land on?
            </label>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {weekDays.map((date) => {
                const dateValue = format(date, "yyyy-MM-dd");
                const active = targetSlotDate === dateValue;
                return (
                  <motion.button
                    key={dateValue}
                    type="button"
                    whileTap={{ y: 1 }}
                    onClick={() => setTargetSlotDate(dateValue)}
                    className="flex min-w-14 shrink-0 flex-col items-center gap-0.5 rounded-xl px-3 py-2"
                    style={{
                      backgroundColor: active ? COLOR + "18" : "var(--roost-bg)",
                      border: active ? `1.5px solid ${COLOR}40` : "1.5px solid #E5E7EB",
                      borderBottom: active ? `3px solid ${COLOR_DARK}60` : "3px solid #E5E7EB",
                    }}
                  >
                    <span className="text-[10px]" style={{ color: active ? COLOR : "var(--roost-text-muted)", fontWeight: 700 }}>
                      {getDayLabel(date)}
                    </span>
                    <span className="text-sm" style={{ color: active ? COLOR : "var(--roost-text-primary)", fontWeight: 800 }}>
                      {format(date, "d")}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
              Which slot?
            </label>
            <div className="grid grid-cols-4 gap-2">
              {CATEGORIES.map((item) => {
                const active = targetSlotType === item.value;
                return (
                  <motion.button
                    key={item.value}
                    type="button"
                    onClick={() => {
                      setCategory(item.value);
                      setTargetSlotType(item.value);
                    }}
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
                    {item.label}
                  </motion.button>
                );
              })}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
              Ingredients
            </label>
            <div className="space-y-2">
              {ingredients.map((ingredient, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={ingredient}
                    onChange={(e) => updateIngredient(index, e.target.value)}
                    placeholder="e.g. tortillas, chicken, salsa"
                    className="flex h-11 flex-1 rounded-xl px-4 text-sm placeholder:italic focus:outline-none"
                    style={inputStyle}
                  />
                  <button
                    type="button"
                    onClick={() => removeIngredient(index)}
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

          <div className="space-y-1.5">
            <label className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
              Why this one?
              <span className="ml-1.5 text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                optional
              </span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Easy cleanup, kid favorite, uses what is already in the fridge..."
              rows={2}
              className="w-full resize-none rounded-xl px-4 py-3 text-sm placeholder:italic focus:outline-none"
              style={inputStyle}
            />
          </div>

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
              "Pitch it for this day"
            )}
          </motion.button>
        </div>
      </div>
    </DraggableSheet>
  );
}
