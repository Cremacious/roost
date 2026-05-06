"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Plus, X } from "lucide-react";
import type { IngredientItem } from "@/lib/utils/parseIngredients";

const UNITS = [
  "cups", "tbsp", "tsp", "oz", "g", "lbs", "ml", "L", "whole", "to taste", "pinch",
];

const inputStyle: React.CSSProperties = {
  backgroundColor: "var(--roost-surface)",
  border: "1.5px solid #E5E7EB",
  borderBottom: "3px solid #E5E7EB",
  color: "var(--roost-text-primary)",
  fontWeight: 600,
};

interface RecipeEditorProps {
  ingredients: IngredientItem[];
  steps: string[];
  onChange: (ingredients: IngredientItem[], steps: string[]) => void;
  color?: string;
  hideSteps?: boolean;
}

export default function RecipeEditor({
  ingredients,
  steps,
  onChange,
  color = "#F97316",
  hideSteps = false,
}: RecipeEditorProps) {
  const [expanded, setExpanded] = useState(false);
  const colorDark = "#C4581A";

  function updateIngredientName(i: number, name: string) {
    const next = ingredients.map((item, idx) => (idx === i ? { ...item, name } : item));
    onChange(next, steps);
  }

  function updateIngredientQty(i: number, quantity: string) {
    const next = ingredients.map((item, idx) => (idx === i ? { ...item, quantity } : item));
    onChange(next, steps);
  }

  function updateIngredientUnit(i: number, unit: string) {
    const next = ingredients.map((item, idx) => (idx === i ? { ...item, unit } : item));
    onChange(next, steps);
  }

  function removeIngredient(i: number) {
    const next = ingredients.filter((_, idx) => idx !== i);
    onChange(next, steps);
  }

  function addIngredient() {
    onChange([...ingredients, { name: "" }], steps);
  }

  function updateStep(i: number, value: string) {
    const next = steps.map((s, idx) => (idx === i ? value : s));
    onChange(ingredients, next);
  }

  function removeStep(i: number) {
    onChange(ingredients, steps.filter((_, idx) => idx !== i));
  }

  function addStep() {
    onChange(ingredients, [...steps, ""]);
  }

  return (
    <div className="space-y-3">
      {/* Ingredient rows */}
      <div className="space-y-2">
        {ingredients.map((item, i) =>
          expanded ? (
            <div key={i} className="flex items-center gap-1.5">
              {/* Quantity */}
              <input
                type="text"
                value={item.quantity ?? ""}
                onChange={(e) => updateIngredientQty(i, e.target.value)}
                placeholder="qty"
                className="flex h-11 rounded-xl px-2 text-sm placeholder:italic focus:outline-none"
                style={{ ...inputStyle, width: 56 }}
              />
              {/* Unit */}
              <select
                value={item.unit ?? ""}
                onChange={(e) => updateIngredientUnit(i, e.target.value)}
                className="flex h-11 rounded-xl px-2 text-sm focus:outline-none"
                style={{ ...inputStyle, width: 88 }}
              >
                <option value="">unit</option>
                {UNITS.map((u) => (
                  <option key={u} value={u}>{u}</option>
                ))}
              </select>
              {/* Name */}
              <input
                type="text"
                value={item.name}
                onChange={(e) => updateIngredientName(i, e.target.value)}
                placeholder="ingredient"
                className="flex h-11 flex-1 rounded-xl px-3 text-sm placeholder:italic focus:outline-none"
                style={inputStyle}
              />
              {/* Remove */}
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
          ) : (
            <div key={i} className="flex items-center gap-2">
              <input
                type="text"
                value={item.name}
                onChange={(e) => updateIngredientName(i, e.target.value)}
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
          )
        )}

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

      {/* Expand toggle — hidden when hideSteps */}
      {!hideSteps && <div className="flex items-center gap-3 pt-1">
        <button
          type="button"
          role="switch"
          aria-checked={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="relative flex h-6 w-11 shrink-0 items-center rounded-full transition-colors"
          style={{
            backgroundColor: expanded ? color : "#E5E7EB",
          }}
        >
          <span
            className="absolute h-5 w-5 rounded-full bg-white shadow-sm transition-transform"
            style={{ transform: expanded ? "translateX(22px)" : "translateX(2px)" }}
          />
        </button>
        <span className="text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 700 }}>
          Add recipe details
        </span>
      </div>}

      {/* Steps section — expanded only */}
      {!hideSteps && expanded && (
        <div className="space-y-2 pt-1">
          <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
            Steps
          </p>
          {steps.map((step, i) => (
            <div key={i} className="flex items-center gap-2">
              {/* Numbered circle */}
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs text-white"
                style={{ backgroundColor: color, fontWeight: 800 }}
              >
                {i + 1}
              </div>
              <input
                type="text"
                value={step}
                onChange={(e) => updateStep(i, e.target.value)}
                placeholder={`Step ${i + 1}`}
                className="flex h-11 flex-1 rounded-xl px-4 text-sm placeholder:italic focus:outline-none"
                style={inputStyle}
              />
              <button
                type="button"
                onClick={() => removeStep(i)}
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
            onClick={addStep}
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
            Add step
          </motion.button>
        </div>
      )}
    </div>
  );
}
