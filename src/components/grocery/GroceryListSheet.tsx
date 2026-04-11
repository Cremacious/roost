"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import DraggableSheet from "@/components/shared/DraggableSheet";
import { Loader2 } from "lucide-react";
import { SECTION_COLORS } from "@/lib/constants/colors";
import PremiumGate from "@/components/shared/PremiumGate";

const COLOR = SECTION_COLORS.grocery;

// ---- Types ------------------------------------------------------------------

export interface GroceryListData {
  id: string;
  name: string;
  is_default: boolean;
}

interface GroceryListSheetProps {
  open: boolean;
  onClose: () => void;
  list?: GroceryListData | null;
  isPremium: boolean;
  existingListCount: number;
}

// ---- Component --------------------------------------------------------------

export default function GroceryListSheet({
  open,
  onClose,
  list,
  isPremium,
  existingListCount,
}: GroceryListSheetProps) {
  const queryClient = useQueryClient();
  const isEdit = !!list;
  const [name, setName] = useState("");

  useEffect(() => {
    if (list) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setName(list.name);
    } else {
      setName("");
    }
  }, [list, open]);

  const inputStyle: React.CSSProperties = {
    backgroundColor: "var(--roost-surface)",
    border: "1.5px solid #E5E7EB",
    borderBottom: "3px solid #E5E7EB",
    color: "var(--roost-text-primary)",
    fontWeight: 600,
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const url = isEdit
        ? `/api/grocery/lists/${list!.id}`
        : "/api/grocery/lists";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to save list");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["grocery-lists"] });
      toast.success(isEdit ? "List renamed" : "List created");
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const canSubmit = name.trim().length > 0 && !saveMutation.isPending;

  // Free tier trying to add a second or additional list
  if (open && !isPremium && !isEdit && existingListCount >= 1) {
    return <PremiumGate feature="grocery" trigger="sheet" onClose={onClose} />;
  }

  return (
    <DraggableSheet open={open} onOpenChange={(v) => !v && onClose()} featureColor="#F59E0B">
      <div className="px-4 pb-8">
        <p className="mb-5 text-lg" style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}>
          {isEdit ? "Rename list" : "New list"}
        </p>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <label
              className="text-sm"
              style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}
            >
              List name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && canSubmit && saveMutation.mutate()}
              placeholder="e.g. Costco run, Weekly shop"
              className="flex h-12 w-full rounded-xl px-4 text-sm placeholder:italic focus:outline-none"
              style={inputStyle}
            />
          </div>

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
              "Save name"
            ) : (
              "Create list"
            )}
          </motion.button>
        </div>
      </div>
    </DraggableSheet>
  );
}
