"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { addDays, format } from "date-fns";
import DraggableSheet from "@/components/shared/DraggableSheet";
import RecipeEditor from "@/components/meals/RecipeEditor";
import { CalendarDays, Loader2 } from "lucide-react";
import { SECTION_COLORS } from "@/lib/constants/colors";
import type { IngredientItem } from "@/lib/utils/parseIngredients";

const COLOR = SECTION_COLORS.meals;
const COLOR_DARK = "#C4581A";

const SLOT_TYPES = [
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

function getTodayStr() {
  return format(new Date(), "yyyy-MM-dd");
}

function getTomorrowStr() {
  return format(addDays(new Date(), 1), "yyyy-MM-dd");
}

function getWeekendStr() {
  const today = new Date();
  const day = today.getDay(); // 0=Sun, 6=Sat
  const daysUntilSat = day === 6 ? 0 : 6 - day;
  return format(addDays(today, daysUntilSat), "yyyy-MM-dd");
}

type QuickSelect = "today" | "tomorrow" | "weekend" | null;

interface SuggestionSheetProps {
  open: boolean;
  onClose: () => void;
  onUpgradeRequired?: (code: string) => void;
}

export default function SuggestionSheet({ open, onClose, onUpgradeRequired }: SuggestionSheetProps) {
  const queryClient = useQueryClient();

  const todayStr = getTodayStr();
  const tomorrowStr = getTomorrowStr();
  const weekendStr = getWeekendStr();

  const [mealName, setMealName] = useState("");
  const [note, setNote] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [ingredients, setIngredients] = useState<IngredientItem[]>([{ name: "" }, { name: "" }]);
  const [targetSlotDate, setTargetSlotDate] = useState(todayStr);
  const [targetSlotType, setTargetSlotType] = useState("dinner");
  const [quickSelect, setQuickSelect] = useState<QuickSelect>("today");

  function handleClose() {
    setMealName("");
    setNote("");
    setPrepTime("");
    setIngredients([{ name: "" }, { name: "" }]);
    setTargetSlotDate(todayStr);
    setTargetSlotType("dinner");
    setQuickSelect("today");
    onClose();
  }

  function handleQuickPill(type: QuickSelect, dateStr: string) {
    setQuickSelect(type);
    setTargetSlotDate(dateStr);
  }

  function handleDateInput(value: string) {
    setTargetSlotDate(value);
    if (value === todayStr) setQuickSelect("today");
    else if (value === tomorrowStr) setQuickSelect("tomorrow");
    else if (value === weekendStr) setQuickSelect("weekend");
    else setQuickSelect(null);
  }

  const submitMutation = useMutation({
    mutationFn: async () => {
      const filteredIngredients = ingredients.filter((item) => item.name.trim());
      const res = await fetch("/api/meals/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          meal_name: mealName.trim(),
          note: note.trim() || undefined,
          prep_time: prepTime ? parseInt(prepTime, 10) : undefined,
          ingredients: filteredIngredients.length > 0 ? filteredIngredients : undefined,
          target_slot_date: targetSlotDate,
          target_slot_type: targetSlotType,
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

  const QUICK_PILLS: { key: QuickSelect; label: string; date: string }[] = [
    { key: "today", label: "Today", date: todayStr },
    { key: "tomorrow", label: "Tomorrow", date: tomorrowStr },
    { key: "weekend", label: "This weekend", date: weekendStr },
  ];

  return (
    <DraggableSheet open={open} onOpenChange={(value) => !value && handleClose()} featureColor={COLOR}>
      <div className="px-4 pb-8">
        <p className="mb-5 text-lg" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
          Suggest a meal
        </p>

        <div className="space-y-5">
          {/* Meal name */}
          <div className="space-y-1.5">
            <label className="text-sm" style={{ color: "#374151", fontWeight: 700 }}>
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

          {/* Date picker */}
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm" style={{ color: "#374151", fontWeight: 700 }}>
              <CalendarDays className="size-4" />
              Which day?
            </label>

            {/* Quick-select pills */}
            <div className="flex gap-2">
              {QUICK_PILLS.map(({ key, label, date }) => {
                const active = quickSelect === key;
                return (
                  <motion.button
                    key={key}
                    type="button"
                    whileTap={{ y: 1 }}
                    onClick={() => handleQuickPill(key, date)}
                    className="flex h-10 items-center justify-center rounded-xl px-3 text-sm"
                    style={{
                      backgroundColor: active ? COLOR + "18" : "var(--roost-surface)",
                      border: active ? `1.5px solid ${COLOR}40` : "1.5px solid #E5E7EB",
                      borderBottom: active ? `3px solid ${COLOR_DARK}60` : "3px solid #E5E7EB",
                      color: active ? COLOR : "var(--roost-text-secondary)",
                      fontWeight: active ? 800 : 600,
                    }}
                  >
                    {label}
                  </motion.button>
                );
              })}
            </div>

            {/* Always-visible date input */}
            <input
              type="date"
              min={todayStr}
              value={targetSlotDate}
              onChange={(e) => handleDateInput(e.target.value)}
              className="flex h-12 w-full rounded-xl px-4 text-sm focus:outline-none"
              style={inputStyle}
            />
          </div>

          {/* Slot type */}
          <div className="space-y-1.5">
            <label className="text-sm" style={{ color: "#374151", fontWeight: 700 }}>
              Which slot?
            </label>
            <div className="grid grid-cols-4 gap-2">
              {SLOT_TYPES.map((item) => {
                const active = targetSlotType === item.value;
                return (
                  <motion.button
                    key={item.value}
                    type="button"
                    onClick={() => setTargetSlotType(item.value)}
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

          {/* Ingredients via RecipeEditor (simple mode, no steps) */}
          <div className="space-y-1.5">
            <label className="text-sm" style={{ color: "#374151", fontWeight: 700 }}>
              Ingredients
              <span className="ml-1.5 text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                optional
              </span>
            </label>
            <RecipeEditor
              ingredients={ingredients}
              steps={[]}
              onChange={(ing) => setIngredients(ing)}
              color={COLOR}
              hideSteps
            />
          </div>

          {/* Why this one */}
          <div className="space-y-1.5">
            <label className="text-sm" style={{ color: "#374151", fontWeight: 700 }}>
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

          {/* Prep time */}
          <div className="space-y-1.5">
            <label className="text-sm" style={{ color: "#374151", fontWeight: 700 }}>
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
              "Pitch it for this day"
            )}
          </motion.button>
        </div>
      </div>
    </DraggableSheet>
  );
}
