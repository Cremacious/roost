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
import { Loader2, Search, Trash2, UtensilsCrossed } from "lucide-react";
import { format } from "date-fns";
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
}

const SLOT_LABELS: Record<string, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

const inputStyle: React.CSSProperties = {
  border: "1.5px solid var(--roost-border)",
  borderBottom: "3px solid var(--roost-border-bottom)",
  color: "var(--roost-text-primary)",
  fontWeight: 600,
  backgroundColor: "transparent",
};

// ---- Component --------------------------------------------------------------

export default function MealSlotSheet({
  open,
  onClose,
  slotDate,
  slotType,
  existingSlot,
  meals,
  weekStart,
}: MealSlotSheetProps) {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"menu" | "bank" | "quick">("menu");
  const [search, setSearch] = useState("");
  const [quickName, setQuickName] = useState("");

  const dateStr = slotDate ? format(slotDate, "yyyy-MM-dd") : "";
  const dayLabel = slotDate ? format(slotDate, "EEEE") : "";
  const slotLabel = SLOT_LABELS[slotType] ?? slotType;
  const currentMealName = existingSlot?.meal_name ?? existingSlot?.custom_meal_name ?? null;

  function handleClose() {
    setMode("menu");
    setSearch("");
    setQuickName("");
    onClose();
  }

  const filteredMeals = meals.filter((m) =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const saveMutation = useMutation({
    mutationFn: async (body: { meal_id?: string; custom_meal_name?: string }) => {
      const res = await fetch("/api/meals/planner", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slot_date: dateStr, slot_type: slotType, ...body }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save slot");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["planner", weekStart] });
      toast.success(`${dayLabel} ${slotLabel} planned`, {
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
      toast.success("Meal removed from planner", {
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

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl px-4 pb-8 pt-2"
        style={{ backgroundColor: "var(--roost-surface)", maxHeight: "88dvh", overflowY: "auto" }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ backgroundColor: "var(--roost-border)" }} />
        <SheetHeader className="mb-5 text-left">
          <SheetTitle style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
            {dayLabel} {slotLabel}
          </SheetTitle>
        </SheetHeader>

        {/* Existing slot — view + remove */}
        {existingSlot && mode === "menu" && (
          <div className="space-y-3">
            <div
              className="flex items-center gap-3 rounded-2xl p-4"
              style={{
                backgroundColor: COLOR + "10",
                border: `1.5px solid ${COLOR}30`,
                borderBottom: `4px solid ${COLOR_DARK}40`,
              }}
            >
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                style={{ backgroundColor: COLOR + "20" }}
              >
                <UtensilsCrossed className="size-5" style={{ color: COLOR }} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
                  {currentMealName}
                </p>
                {existingSlot.assigned_by_name && (
                  <p className="mt-0.5 text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                    Planned by {existingSlot.assigned_by_name}
                  </p>
                )}
              </div>
            </div>

            <motion.button
              type="button"
              onClick={() => setMode("bank")}
              whileTap={{ y: 1 }}
              className="flex h-12 w-full items-center justify-center rounded-xl text-sm"
              style={{
                backgroundColor: "var(--roost-bg)",
                border: "1.5px solid var(--roost-border)",
                borderBottom: "3px solid var(--roost-border-bottom)",
                color: "var(--roost-text-primary)",
                fontWeight: 700,
              }}
            >
              Change meal
            </motion.button>

            <motion.button
              type="button"
              onClick={() => removeMutation.mutate()}
              disabled={removeMutation.isPending}
              whileTap={{ y: 1 }}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm disabled:opacity-50"
              style={{
                backgroundColor: "var(--roost-surface)",
                border: "1.5px solid var(--roost-border)",
                borderBottom: "3px solid var(--roost-border-bottom)",
                color: "#EF4444",
                fontWeight: 700,
              }}
            >
              {removeMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Remove from planner
                </>
              )}
            </motion.button>
          </div>
        )}

        {/* Empty slot or change mode — show two options */}
        {(!existingSlot || mode !== "menu") && mode !== "bank" && mode !== "quick" && (
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
                backgroundColor: "var(--roost-bg)",
                border: "1.5px solid var(--roost-border)",
                borderBottom: "4px solid var(--roost-border-bottom)",
              }}
            >
              <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
                Quick add
              </p>
              <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                Type any meal name, no details needed
              </p>
            </motion.button>
          </div>
        )}

        {/* Bank picker */}
        {mode === "bank" && (
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
                    onClick={() => saveMutation.mutate({ meal_id: m.id })}
                    disabled={saveMutation.isPending}
                    whileTap={{ y: 1 }}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.12 }}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left disabled:opacity-50"
                    style={{
                      backgroundColor: "var(--roost-bg)",
                      border: "1.5px solid var(--roost-border)",
                      borderBottom: "3px solid var(--roost-border-bottom)",
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
                      style={{
                        backgroundColor: COLOR + "18",
                        color: COLOR,
                        fontWeight: 700,
                      }}
                    >
                      {m.category}
                    </span>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick add */}
        {mode === "quick" && (
          <div className="space-y-3">
            <input
              type="text"
              value={quickName}
              onChange={(e) => setQuickName(e.target.value)}
              placeholder="e.g. Takeout pizza, Leftovers"
              autoFocus
              className="flex h-12 w-full rounded-xl px-4 text-sm placeholder:italic focus:outline-none"
              style={inputStyle}
              onKeyDown={(e) => {
                if (e.key === "Enter" && quickName.trim()) {
                  saveMutation.mutate({ custom_meal_name: quickName.trim() });
                }
              }}
            />
            <motion.button
              type="button"
              disabled={!quickName.trim() || saveMutation.isPending}
              onClick={() => saveMutation.mutate({ custom_meal_name: quickName.trim() })}
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
      </SheetContent>
    </Sheet>
  );
}
