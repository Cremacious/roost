"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import DraggableSheet from "@/components/shared/DraggableSheet";
import RecipeEditor from "@/components/meals/RecipeEditor";
import { Loader2 } from "lucide-react";
import { SECTION_COLORS } from "@/lib/constants/colors";
import { FREE_TIER_LIMITS } from "@/lib/constants/freeTierLimits";
import { parseIngredients, type IngredientItem } from "@/lib/utils/parseIngredients";

const COLOR = SECTION_COLORS.meals;
const COLOR_DARK = "#C4581A";

// ---- Types ------------------------------------------------------------------

export interface MealData {
  id: string;
  name: string;
  description: string | null;
  category: string;
  ingredients: string | null;
  instructions: string | null;
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

function parseSteps(raw: string | null): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((s) => typeof s === "string") : [];
  } catch {
    return [];
  }
}

// ---- Component --------------------------------------------------------------

export default function MealSheet({ open, onClose, meal, isPremium, mealCount, onUpgradeRequired }: MealSheetProps) {
  const queryClient = useQueryClient();
  const isEdit = !!meal;

  const [name, setName] = useState("");
  const [category, setCategory] = useState("dinner");
  const [description, setDescription] = useState("");
  const [prepTime, setPrepTime] = useState("");
  const [ingredients, setIngredients] = useState<IngredientItem[]>([{ name: "" }, { name: "" }, { name: "" }]);
  const [steps, setSteps] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      if (meal) {
        setName(meal.name);
        setCategory(meal.category);
        setDescription(meal.description ?? "");
        setPrepTime(meal.prep_time != null ? String(meal.prep_time) : "");
        const parsed = parseIngredients(meal.ingredients ?? "");
        setIngredients(parsed.length > 0 ? parsed : [{ name: "" }, { name: "" }, { name: "" }]);
        setSteps(parseSteps(meal.instructions));
      } else {
        setName("");
        setCategory("dinner");
        setDescription("");
        setPrepTime("");
        setIngredients([{ name: "" }, { name: "" }, { name: "" }]);
        setSteps([]);
      }
    }
  }, [meal, open]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const filteredIngredients = ingredients.filter((i) => i.name.trim());
      const filteredSteps = steps.filter((s) => s.trim());
      const body = {
        name: name.trim(),
        category,
        description: description.trim() || undefined,
        prep_time: prepTime ? parseInt(prepTime) : undefined,
        ingredients: filteredIngredients,
        instructions: filteredSteps.length > 0 ? filteredSteps : undefined,
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
    <DraggableSheet open={open} onOpenChange={(v) => !v && onClose()} featureColor="#F97316">
      <div className="px-4 pb-8">
        <p className="mb-5 text-lg" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
          {isEdit ? "Edit meal" : "Add to meal bank"}
        </p>

        <div className="space-y-5">
          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-sm" style={{ color: "#374151", fontWeight: 700 }}>
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
            <label className="text-sm" style={{ color: "#374151", fontWeight: 700 }}>
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
            <label className="text-sm" style={{ color: "#374151", fontWeight: 700 }}>
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

          {/* Recipe editor */}
          <div className="space-y-1.5">
            <label className="text-sm" style={{ color: "#374151", fontWeight: 700 }}>
              Ingredients
              <span className="ml-1.5 text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                optional, used for grocery list
              </span>
            </label>
            <RecipeEditor
              ingredients={ingredients}
              steps={steps}
              onChange={(ing, stps) => {
                setIngredients(ing);
                setSteps(stps);
              }}
              color={COLOR}
            />
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
      </div>
    </DraggableSheet>
  );
}
