"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { ShoppingCart } from "lucide-react";
import DraggableSheet from "@/components/shared/DraggableSheet";
import type { IngredientItem } from "@/lib/utils/parseIngredients";

const COLOR = "#F97316";
const COLOR_DARK = "#C4581A";

interface GroceryList {
  id: string;
  name: string;
  is_default: boolean;
}

interface GroceryPushSheetProps {
  open: boolean;
  onClose: () => void;
  mealName: string;
  ingredients: IngredientItem[];
  mealId: string;
  isPremium?: boolean;
}

export default function GroceryPushSheet({
  open,
  onClose,
  mealName,
  ingredients,
  mealId,
  isPremium,
}: GroceryPushSheetProps) {
  const queryClient = useQueryClient();

  const [checked, setChecked] = useState<Set<number>>(() =>
    new Set(ingredients.map((_, i) => i))
  );
  const [listId, setListId] = useState<string | null>(null);

  // Reset selections when sheet opens
  function handleOpenChange(open: boolean) {
    if (open) {
      setChecked(new Set(ingredients.map((_, i) => i)));
      setListId(null);
    } else {
      onClose();
    }
  }

  const listsQuery = useQuery<GroceryList[]>({
    queryKey: ["grocery-lists"],
    queryFn: async () => {
      const r = await fetch("/api/grocery/lists");
      if (!r.ok) throw new Error("Failed to load lists");
      return r.json().then((d) => d.lists ?? []);
    },
    enabled: open && !!isPremium,
    staleTime: 30_000,
  });

  const lists: GroceryList[] = listsQuery.data ?? [];
  const defaultList = lists.find((l) => l.is_default);
  const resolvedListId = listId ?? defaultList?.id ?? null;

  function toggleIngredient(i: number) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  const selectedNames = ingredients
    .filter((_, i) => checked.has(i))
    .map((item) => item.name);

  const pushMutation = useMutation({
    mutationFn: async () => {
      const body: { listId?: string; ingredientNames?: string[] } = {
        ingredientNames: selectedNames,
      };
      if (resolvedListId) body.listId = resolvedListId;

      const res = await fetch(`/api/meals/${mealId}/add-to-grocery`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to add ingredients");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grocery-items"] });
      const listName = lists.find((l) => l.id === resolvedListId)?.name ?? "grocery list";
      toast.success(`Added ${selectedNames.length} ingredient${selectedNames.length !== 1 ? "s" : ""} to ${listName}`, {
        className: "roost-toast roost-toast-success",
        descriptionClassName: "roost-toast-description",
      });
      onClose();
    },
    onError: (err: Error) => {
      toast.error("Could not add ingredients", {
        description: err.message,
        className: "roost-toast roost-toast-error",
        descriptionClassName: "roost-toast-description",
      });
    },
  });

  const canConfirm = selectedNames.length > 0 && !pushMutation.isPending;

  return (
    <DraggableSheet
      open={open}
      onOpenChange={handleOpenChange}
      featureColor={COLOR}
    >
      <div className="px-4 pb-8">
        <p className="mb-1 text-lg" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
          {mealName}
        </p>
        <p className="mb-5 text-sm" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
          Select ingredients to add to your grocery list
        </p>

        {/* Ingredient checkboxes */}
        <div className="mb-5 space-y-2">
          {ingredients.map((item, i) => {
            const isChecked = checked.has(i);
            return (
              <motion.button
                key={i}
                type="button"
                onClick={() => toggleIngredient(i)}
                whileTap={{ y: 1 }}
                className="flex h-12 w-full items-center gap-3 rounded-xl px-4"
                style={{
                  backgroundColor: isChecked ? `${COLOR}12` : "var(--roost-surface)",
                  border: isChecked ? `1.5px solid ${COLOR}40` : "1.5px solid var(--roost-border)",
                  borderBottom: isChecked ? `3px solid ${COLOR_DARK}50` : "3px solid var(--roost-border-bottom)",
                }}
              >
                {/* Checkbox indicator */}
                <div
                  className="flex h-5 w-5 shrink-0 items-center justify-center rounded"
                  style={{
                    backgroundColor: isChecked ? COLOR : "transparent",
                    border: isChecked ? `2px solid ${COLOR}` : "2px solid #D1D5DB",
                  }}
                >
                  {isChecked && (
                    <svg viewBox="0 0 12 12" className="h-3 w-3 fill-white">
                      <path d="M10 3L5 8.5 2 5.5" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span
                  className="flex-1 text-left text-sm"
                  style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}
                >
                  {[item.quantity, item.unit, item.name].filter(Boolean).join(" ")}
                </span>
              </motion.button>
            );
          })}
        </div>

        {/* List selector — premium only, multiple lists */}
        {isPremium && lists.length > 1 && (
          <div className="mb-5">
            <p className="mb-2 text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
              Add to list
            </p>
            <div className="flex flex-wrap gap-2">
              {lists.map((list) => {
                const active = (resolvedListId === list.id);
                return (
                  <motion.button
                    key={list.id}
                    type="button"
                    onClick={() => setListId(list.id)}
                    whileTap={{ y: 1 }}
                    className="flex h-9 items-center rounded-xl px-4 text-sm"
                    style={{
                      backgroundColor: active ? COLOR + "18" : "var(--roost-surface)",
                      border: active ? `1.5px solid ${COLOR}40` : "1.5px solid var(--roost-border)",
                      borderBottom: active ? `3px solid ${COLOR_DARK}50` : "3px solid var(--roost-border-bottom)",
                      color: active ? COLOR : "var(--roost-text-secondary)",
                      fontWeight: active ? 800 : 600,
                    }}
                  >
                    {list.name}
                    {list.is_default && (
                      <span className="ml-1.5 text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                        default
                      </span>
                    )}
                  </motion.button>
                );
              })}
            </div>
          </div>
        )}

        {/* Confirm button */}
        <motion.button
          type="button"
          disabled={!canConfirm}
          onClick={() => pushMutation.mutate()}
          whileTap={{ y: 2 }}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm text-white disabled:opacity-50"
          style={{
            backgroundColor: "#22C55E",
            border: "1.5px solid #22C55E",
            borderBottom: "3px solid #159040",
            fontWeight: 800,
          }}
        >
          <ShoppingCart className="size-4" />
          Add {selectedNames.length} ingredient{selectedNames.length !== 1 ? "s" : ""}
        </motion.button>
      </div>
    </DraggableSheet>
  );
}
