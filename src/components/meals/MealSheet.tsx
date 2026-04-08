"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import { SECTION_COLORS } from "@/lib/constants/colors";
import { FREE_TIER_LIMITS } from "@/lib/constants/freeTierLimits";

const COLOR = SECTION_COLORS.meals;
const COLOR_DARK = "#C4581A";

// ---- Types ------------------------------------------------------------------

export interface MealData {
  id: string;
  name: string;
  description: string | null;
  category: string;
  ingredients: string | null;
  prep_time: number | null;
  created_by: string;
}

interface MealSheetProps {
  open: boolean;
  onClose: () => void;
  meal?: MealData | null;
  isPremium?: boolean;
  mealCount?: number;
  onUpgradeRequired?: (code: string) => void;
}

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

// ---- Component --------------------------------------------------------------

export default function MealSheet({ open, onClose, meal, isPremium, mealCount, onUpgradeRequired }: MealSheetProps) {
  const queryClient = useQueryClient();
  const isEdit = !!meal;

  const [name, setName] = useState("");
  const [category, setCategory] = useState("dinner");
  const [description, setDescription] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [ingredients, setIngredients] = useState<string[]>(["", "", ""]);

  useEffect(() => {
    if (meal) {
      setName(meal.name);
      setCategory(meal.category);
      setDescription(meal.description ?? "");
      setPrepTime(meal.prep_time != null ? String(meal.prep_time) : "");
      const parsed: string[] = meal.ingredients
        ? (JSON.parse(meal.ingredients) as string[])
        : [];
      setIngredients(parsed.length > 0 ? parsed : ["", "", ""]);
    } else {
      setName("");
      setCategory("dinner");
      setDescription("");
      setPrepTime("");
      setIngredients(["", "", ""]);
    }
  }, [meal, open]);

  function updateIngredient(i: number, value: string) {
    setIngredients((prev) => prev.map((v, idx) => (idx === i ? value : v)));
  }

  function removeIngredient(i: number) {
    setIngredients((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addIngredient() {
    setIngredients((prev) => [...prev, ""]);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      const filteredIngredients = ingredients.filter((i) => i.trim());
      const body = {
        name: name.trim(),
        category,
        description: description.trim() || undefined,
        prep_time: prepTime ? parseInt(prepTime) : undefined,
        ingredients: filteredIngredients,
      };

      const url = isEdit ? `/api/meals/${meal!.id}` : "/api/meals";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const err = new Error(data.error ?? "Failed to save meal") as Error & { code?: string };
        err.code = data.code;
        throw err;
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meals"] });
      toast.success(isEdit ? "Meal updated" : "Meal added to bank", {
        className: "roost-toast roost-toast-success",
        descriptionClassName: "roost-toast-description",
      });
      onClose();
    },
    onError: (err: Error & { code?: string }) => {
      if (err.code && onUpgradeRequired) {
        onUpgradeRequired(err.code);
        return;
      }
      toast.error("Could not save meal", {
        description: err.message,
        className: "roost-toast roost-toast-error",
        descriptionClassName: "roost-toast-description",
      });
    },
  });

  const canSubmit = name.trim().length > 0 && !saveMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl px-4 pb-8 pt-2"
        style={{ backgroundColor: "var(--roost-surface)", maxHeight: "92dvh", overflowY: "auto" }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ backgroundColor: "#F97316" }} />
        <SheetHeader className="mb-5 text-left">
          <SheetTitle style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
            {isEdit ? "Edit meal" : "Add to meal bank"}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Spaghetti Bolognese"
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

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
              Description
              <span className="ml-1.5 text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                optional
              </span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What makes it special?"
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
                optional, used for grocery list
              </span>
            </label>
            <div className="space-y-2">
              {ingredients.map((ingredient, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={ingredient}
                    onChange={(e) => updateIngredient(i, e.target.value)}
                    placeholder="e.g. 500g pasta"
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
                onClick={addIngredient}
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

          {/* Save */}
          <motion.button
            type="button"
            disabled={!canSubmit}
            onClick={() => {
              if (!isEdit && !isPremium && (mealCount ?? 0) >= FREE_TIER_LIMITS.mealBank) {
                onUpgradeRequired?.("MEAL_BANK_LIMIT");
                return;
              }
              saveMutation.mutate();
            }}
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
            ) : isEdit ? (
              "Save changes"
            ) : (
              "Add to meal bank"
            )}
          </motion.button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
