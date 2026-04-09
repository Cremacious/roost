"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import DraggableSheet from "@/components/shared/DraggableSheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { addDays, format, isToday, isTomorrow, startOfWeek } from "date-fns";
import { Loader2, Search, Trash2, UtensilsCrossed } from "lucide-react";
import { SECTION_COLORS } from "@/lib/constants/colors";

const COLOR = SECTION_COLORS.meals;
const COLOR_DARK = "#C4581A";

// ---- Types ------------------------------------------------------------------

export interface MealRow {
  id: string;
  name: string;
  category: string;
  description: string | null;
  prep_time: number | null;
}

export interface SlotRow {
  id: string;
  slot_date: string;
  slot_type: string;
  meal_id: string | null;
  custom_meal_name: string | null;
  meal_name: string | null;
  assigned_by_name: string | null;
}

interface MealSlotSheetProps {
  open: boolean;
  onClose: () => void;
  slotDate: Date | null;
  slotType: string;
  existingSlot?: SlotRow | null;
  meals: MealRow[];
  weekStart: string;
  preSelectedMeal?: MealRow | null;
  existingSlots?: SlotRow[];
}

const SLOT_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
const SLOT_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

const inputStyle: React.CSSProperties = {
  backgroundColor: "var(--roost-surface)",
  border: "1.5px solid #E5E7EB",
  borderBottom: "3px solid #E5E7EB",
  color: "var(--roost-text-primary)",
  fontWeight: 600,
};

function getDayLabel(d: Date): string {
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return format(d, "EEE");
}

// ---- Component --------------------------------------------------------------

export default function MealSlotSheet({
  open,
  onClose,
  slotDate,
  slotType,
  existingSlot,
  meals,
  weekStart,
  preSelectedMeal,
  existingSlots = [],
}: MealSlotSheetProps) {
  const queryClient = useQueryClient();

  type Mode = "menu" | "bank" | "quick" | "date";
  const [mode, setMode] = useState<Mode>("menu");
  const [search, setSearch] = useState("");
  const [quickName, setQuickName] = useState("");
  const [pickedDate, setPickedDate] = useState<Date>(new Date());
  const [pickedSlotType, setPickedSlotType] = useState("dinner");
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);

  // Reset state when sheet opens
  useEffect(() => {
    if (open) {
      setSearch("");
      setQuickName("");
      setShowRemoveConfirm(false);
      if (preSelectedMeal) {
        setMode("date");
        setPickedDate(new Date());
        setPickedSlotType("dinner");
      } else {
        setMode("menu");
        setPickedDate(slotDate ?? new Date());
        setPickedSlotType(slotType);
      }
    }
  }, [open, preSelectedMeal, slotDate, slotType]);

  const dateStr = slotDate ? format(slotDate, "yyyy-MM-dd") : "";
  const dayLabel = slotDate ? format(slotDate, "EEEE") : "";
  const slotLabel = SLOT_LABELS[slotType] ?? slotType;
  const currentMealName = existingSlot?.meal_name ?? existingSlot?.custom_meal_name ?? null;
  const isEditMode = !preSelectedMeal && !!existingSlot;

  // Week days for the date picker (current week Mon-Sun)
  const pickerWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const pickerWeekDays = Array.from({ length: 7 }, (_, i) => addDays(pickerWeekStart, i));

  function handleClose() {
    setMode("menu");
    setSearch("");
    setQuickName("");
    setShowRemoveConfirm(false);
    onClose();
  }

  const filteredMeals = meals.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const saveMutation = useMutation({
    mutationFn: async ({
      date,
      slot,
      meal_id,
      custom_meal_name,
    }: {
      date: string;
      slot: string;
      meal_id?: string;
      custom_meal_name?: string;
    }) => {
      const res = await fetch("/api/meals/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot_date: date, slot_type: slot, meal_id, custom_meal_name }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save slot");
      }
      return res.json();
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ["planner", weekStart] });
      const label = SLOT_LABELS[vars.slot] ?? vars.slot;
      const day = format(new Date(vars.date + "T12:00:00"), "EEEE");
      toast.success(`Added to ${day} ${label}`, {
        className: "roost-toast roost-toast-success",
        descriptionClassName: "roost-toast-description",
      });
      handleClose();
    },
    onError: (err: Error) => {
      toast.error("Could not save slot", {
        description: err.message,
        className: "roost-toast roost-toast-error",
        descriptionClassName: "roost-toast-description",
      });
    },
  });

  const removeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/meals/planner/${existingSlot!.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to remove slot");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner", weekStart] });
      toast.success("Removed from plan", {
        className: "roost-toast roost-toast-success",
        descriptionClassName: "roost-toast-description",
      });
      handleClose();
    },
    onError: (err: Error) => {
      toast.error("Could not remove meal", {
        description: err.message,
        className: "roost-toast roost-toast-error",
        descriptionClassName: "roost-toast-description",
      });
    },
  });

  // Sheet title
  const sheetTitle = preSelectedMeal && mode === "date"
    ? `Plan: ${preSelectedMeal.name}`
    : isEditMode
      ? "Change meal"
      : `${dayLabel} ${slotLabel}`.trim() || "Add meal";

  return (
    <>
      <DraggableSheet open={open} onOpenChange={(v) => !v && handleClose()} featureColor={COLOR}>
        <div className="overflow-y-auto px-4 pb-8" style={{ maxHeight: "calc(88dvh - 60px)" }}>
          <p className="mb-1 text-lg" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
            {sheetTitle}
          </p>
          {isEditMode && currentMealName && mode === "menu" && (
            <p className="mb-4 text-sm" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
              Currently: {currentMealName}
            </p>
          )}

          {/* DATE PICKER MODE — for "Add to planner" from meal bank */}
          {mode === "date" && preSelectedMeal && (
            <div className="space-y-5">
              {/* Day picker */}
              <div className="space-y-2">
                <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
                  Which day?
                </p>
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {pickerWeekDays.map((d) => {
                    const dStr = format(d, "yyyy-MM-dd");
                    const active = format(pickedDate, "yyyy-MM-dd") === dStr;
                    const hasSlot = existingSlots.some(
                      (s) => s.slot_date === dStr && s.slot_type === pickedSlotType
                    );
                    return (
                      <motion.button
                        key={dStr}
                        type="button"
                        whileTap={{ y: 1 }}
                        onClick={() => setPickedDate(d)}
                        className="relative flex shrink-0 flex-col items-center gap-0.5 rounded-xl px-3 py-2"
                        style={{
                          backgroundColor: active ? COLOR + "18" : "var(--roost-bg)",
                          border: active ? `1.5px solid ${COLOR}40` : "1.5px solid #E5E7EB",
                          borderBottom: active ? `3px solid ${COLOR_DARK}60` : "3px solid #E5E7EB",
                          minWidth: 56,
                        }}
                      >
                        <span className="text-[10px]" style={{ color: active ? COLOR : "var(--roost-text-muted)", fontWeight: 700 }}>
                          {getDayLabel(d)}
                        </span>
                        <span className="text-sm" style={{ color: active ? COLOR : "var(--roost-text-primary)", fontWeight: 800 }}>
                          {format(d, "d")}
                        </span>
                        {hasSlot && (
                          <span
                            className="mt-0.5 size-1.5 rounded-full"
                            style={{ backgroundColor: active ? COLOR : "var(--roost-text-muted)" }}
                          />
                        )}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Slot type picker */}
              <div className="space-y-2">
                <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
                  Which meal?
                </p>
                <div className="grid grid-cols-4 gap-2">
                  {SLOT_TYPES.map((st) => {
                    const active = pickedSlotType === st;
                    return (
                      <motion.button
                        key={st}
                        type="button"
                        whileTap={{ y: 1 }}
                        onClick={() => setPickedSlotType(st)}
                        className="flex h-11 items-center justify-center rounded-xl text-sm capitalize"
                        style={{
                          backgroundColor: active ? COLOR + "18" : "var(--roost-surface)",
                          border: active ? `1.5px solid ${COLOR}40` : "1.5px solid #E5E7EB",
                          borderBottom: active ? `3px solid ${COLOR_DARK}70` : "3px solid #E5E7EB",
                          color: active ? COLOR : "var(--roost-text-secondary)",
                          fontWeight: active ? 800 : 600,
                        }}
                      >
                        {SLOT_LABELS[st]}
                      </motion.button>
                    );
                  })}
                </div>
              </div>

              {/* Confirm */}
              <motion.button
                type="button"
                disabled={saveMutation.isPending}
                onClick={() =>
                  saveMutation.mutate({
                    date: format(pickedDate, "yyyy-MM-dd"),
                    slot: pickedSlotType,
                    meal_id: preSelectedMeal.id,
                  })
                }
                whileTap={{ y: 2 }}
                className="flex h-12 w-full items-center justify-center rounded-xl text-sm text-white disabled:opacity-50"
                style={{
                  backgroundColor: COLOR,
                  border: `1.5px solid ${COLOR}`,
                  borderBottom: `3px solid ${COLOR_DARK}`,
                  fontWeight: 800,
                }}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Add to plan"
                )}
              </motion.button>
            </div>
          )}

          {/* MENU — create or edit: two options + remove (edit only) */}
          {!preSelectedMeal && mode === "menu" && (
            <div className="space-y-3">
              <motion.button
                type="button"
                onClick={() => setMode("bank")}
                whileTap={{ y: 1 }}
                className="flex w-full flex-col gap-1 rounded-2xl p-5 text-left"
                style={{
                  backgroundColor: COLOR + "08",
                  border: `1.5px solid ${COLOR}25`,
                  borderBottom: `4px solid ${COLOR_DARK}30`,
                }}
              >
                <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
                  Pick from meal bank
                </p>
                <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                  Choose one of your household favorites
                </p>
              </motion.button>

              <motion.button
                type="button"
                onClick={() => setMode("quick")}
                whileTap={{ y: 1 }}
                className="flex w-full flex-col gap-1 rounded-2xl p-5 text-left"
                style={{
                  backgroundColor: "var(--roost-surface)",
                  border: "1.5px solid var(--roost-border)",
                  borderBottom: `4px solid ${COLOR_DARK}`,
                }}
              >
                <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
                  Quick add
                </p>
                <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                  Type any meal name, no details needed
                </p>
              </motion.button>

              {/* Remove — edit mode only */}
              {isEditMode && (
                <motion.button
                  type="button"
                  onClick={() => setShowRemoveConfirm(true)}
                  whileTap={{ y: 1 }}
                  className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm"
                  style={{
                    backgroundColor: "transparent",
                    border: "1.5px solid #E5E7EB",
                    borderBottom: "3px solid #E5E7EB",
                    color: "#EF4444",
                    fontWeight: 700,
                  }}
                >
                  <Trash2 className="size-4" />
                  Remove from plan
                </motion.button>
              )}
            </div>
          )}

          {/* BANK PICKER */}
          {!preSelectedMeal && mode === "bank" && (
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2" style={{ color: "var(--roost-text-muted)" }} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search your meal bank..."
                  autoFocus
                  className="flex h-12 w-full rounded-xl pl-10 pr-4 text-sm placeholder:italic focus:outline-none"
                  style={inputStyle}
                />
              </div>

              {filteredMeals.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-sm" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                    {search ? "No meals match your search." : "Your meal bank is empty."}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredMeals.map((m, i) => (
                    <motion.button
                      key={m.id}
                      type="button"
                      onClick={() => saveMutation.mutate({ date: dateStr, slot: slotType, meal_id: m.id })}
                      disabled={saveMutation.isPending}
                      whileTap={{ y: 1 }}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03, duration: 0.12 }}
                      className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left disabled:opacity-50"
                      style={{
                        backgroundColor: "var(--roost-surface)",
                        border: "1.5px solid var(--roost-border)",
                        borderBottom: `3px solid ${COLOR_DARK}`,
                      }}
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
                          {m.name}
                        </p>
                        {m.prep_time && (
                          <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                            {m.prep_time} min
                          </p>
                        )}
                      </div>
                      <span
                        className="shrink-0 rounded-full px-2 py-0.5 text-[11px] capitalize"
                        style={{ backgroundColor: COLOR + "18", color: COLOR, fontWeight: 700 }}
                      >
                        {m.category}
                      </span>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* QUICK ADD */}
          {!preSelectedMeal && mode === "quick" && (
            <div className="space-y-3">
              <input
                type="text"
                value={quickName}
                onChange={(e) => setQuickName(e.target.value)}
                placeholder="e.g. Takeout pizza, Leftovers, Whatever is in the fridge"
                autoFocus
                className="flex h-12 w-full rounded-xl px-4 text-sm placeholder:italic focus:outline-none"
                style={inputStyle}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && quickName.trim()) {
                    saveMutation.mutate({ date: dateStr, slot: slotType, custom_meal_name: quickName.trim() });
                  }
                }}
              />
              <motion.button
                type="button"
                disabled={!quickName.trim() || saveMutation.isPending}
                onClick={() => saveMutation.mutate({ date: dateStr, slot: slotType, custom_meal_name: quickName.trim() })}
                whileTap={{ y: 2 }}
                className="flex h-12 w-full items-center justify-center rounded-xl text-sm text-white disabled:opacity-50"
                style={{
                  backgroundColor: COLOR,
                  border: `1.5px solid ${COLOR}`,
                  borderBottom: `3px solid ${COLOR_DARK}`,
                  fontWeight: 800,
                }}
              >
                {saveMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  "Add to planner"
                )}
              </motion.button>
            </div>
          )}
        </div>
      </DraggableSheet>

      {/* Remove confirmation */}
      <AlertDialog open={showRemoveConfirm} onOpenChange={setShowRemoveConfirm}>
        <AlertDialogContent style={{ backgroundColor: "var(--roost-surface)", border: "1.5px solid var(--roost-border)", borderRadius: 20 }}>
          <AlertDialogHeader>
            <AlertDialogTitle style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
              Remove from plan?
            </AlertDialogTitle>
            <AlertDialogDescription style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
              This will clear {currentMealName} from {dayLabel} {slotLabel}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              style={{
                backgroundColor: "var(--roost-bg)",
                border: "1.5px solid var(--roost-border)",
                borderBottom: "3px solid #E5E7EB",
                color: "var(--roost-text-primary)",
                fontWeight: 700,
                borderRadius: 12,
              }}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeMutation.mutate()}
              disabled={removeMutation.isPending}
              style={{
                backgroundColor: "#EF4444",
                border: "1.5px solid #EF4444",
                borderBottom: "3px solid #B91C1C",
                color: "#fff",
                fontWeight: 800,
                borderRadius: 12,
              }}
            >
              {removeMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Remove"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
