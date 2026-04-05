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
import { Loader2, Trash2 } from "lucide-react";
import { SECTION_COLORS } from "@/lib/constants/colors";

const COLOR = SECTION_COLORS.grocery;

// ---- Types ------------------------------------------------------------------

export interface GroceryItemData {
  id: string;
  name: string;
  quantity: string | null;
  checked: boolean;
}

interface GroceryItemSheetProps {
  open: boolean;
  onClose: () => void;
  item?: GroceryItemData | null;
  listId: string;
}

// ---- Component --------------------------------------------------------------

export default function GroceryItemSheet({
  open,
  onClose,
  item,
  listId,
}: GroceryItemSheetProps) {
  const queryClient = useQueryClient();
  const isEdit = !!item;

  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");

  useEffect(() => {
    if (item) {
      setName(item.name);
      setQuantity(item.quantity ?? "");
    } else {
      setName("");
      setQuantity("");
    }
  }, [item, open]);

  const inputStyle: React.CSSProperties = {
    border: "1.5px solid var(--roost-border)",
    borderBottom: "3px solid var(--roost-border-bottom)",
    color: "var(--roost-text-primary)",
    fontWeight: 600,
    backgroundColor: "transparent",
  };

  // ---- Mutations ------------------------------------------------------------

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = isEdit
        ? `/api/grocery/items/${item!.id}`
        : `/api/grocery/lists/${listId}/items`;
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          quantity: quantity.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save item");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grocery-items", listId] });
      queryClient.invalidateQueries({ queryKey: ["grocery-lists"] });
      toast.success(isEdit ? "Item updated" : "Item added");
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/grocery/items/${item!.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete item");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grocery-items", listId] });
      queryClient.invalidateQueries({ queryKey: ["grocery-lists"] });
      toast.success("Item removed");
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const canSubmit = name.trim().length > 0 && !saveMutation.isPending;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="max-h-[85dvh] overflow-y-auto rounded-t-2xl px-4 pb-8 pt-4"
        style={{ backgroundColor: "var(--roost-bg)" }}
      >
        <SheetHeader className="mb-5">
          <SheetTitle
            className="text-lg"
            style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}
          >
            {isEdit ? "Edit item" : "Add item"}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-1.5">
            <label
              className="text-sm"
              style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}
            >
              Item
            </label>
            <input
              type="text"
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Add an item"
              className="flex h-12 w-full rounded-xl px-4 text-sm placeholder:italic focus:outline-none"
              style={inputStyle}
            />
          </div>

          {/* Quantity */}
          <div className="space-y-1.5">
            <label
              className="text-sm"
              style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}
            >
              Quantity
              <span
                className="ml-1.5 text-xs"
                style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
              >
                optional
              </span>
            </label>
            <input
              type="text"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 2 bags, 1 dozen, a lot"
              className="flex h-12 w-full rounded-xl px-4 text-sm placeholder:italic focus:outline-none"
              style={inputStyle}
            />
          </div>

          {/* Save */}
          <motion.button
            type="button"
            disabled={!canSubmit}
            onClick={() => saveMutation.mutate()}
            whileTap={{ y: 2 }}
            className="flex h-12 w-full items-center justify-center rounded-xl text-sm text-white disabled:opacity-50"
            style={{
              backgroundColor: COLOR,
              border: `1.5px solid ${COLOR}`,
              borderBottom: "3px solid rgba(0,0,0,0.2)",
              fontWeight: 800,
            }}
          >
            {saveMutation.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : isEdit ? (
              "Save changes"
            ) : (
              "Add item"
            )}
          </motion.button>

          {/* Delete (edit mode only) */}
          {isEdit && (
            <motion.button
              type="button"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              whileTap={{ y: 2 }}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm"
              style={{
                backgroundColor: "var(--roost-surface)",
                border: "1.5px solid var(--roost-border)",
                borderBottom: "3px solid var(--roost-border-bottom)",
                color: "#EF4444",
                fontWeight: 700,
              }}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <>
                  <Trash2 className="size-4" />
                  Remove item
                </>
              )}
            </motion.button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
