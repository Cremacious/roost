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
import { Loader2, Sparkles } from "lucide-react";
import { SECTION_COLORS } from "@/lib/constants/colors";

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
}

// ---- Upgrade prompt ---------------------------------------------------------

function UpgradePrompt({ onClose }: { onClose: () => void }) {
  return (
    <div className="space-y-6">
      <div
        className="flex items-center gap-3 rounded-2xl p-4"
        style={{
          backgroundColor: COLOR + "12",
          border: `1.5px solid ${COLOR}30`,
          borderBottom: `4px solid ${COLOR}50`,
        }}
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
          style={{
            backgroundColor: COLOR + "18",
            border: `1px solid ${COLOR}30`,
            borderBottom: `2px solid ${COLOR}40`,
          }}
        >
          <Sparkles className="size-5" style={{ color: COLOR }} />
        </div>
        <div>
          <p
            className="text-sm"
            style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}
          >
            Multiple lists are a premium feature.
          </p>
          <p
            className="mt-0.5 text-sm"
            style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}
          >
            Upgrade for $3 a month to create named lists, plus bill splitting,
            receipt scanning, and more.
          </p>
        </div>
      </div>

      <motion.a
        href="/settings/billing"
        whileTap={{ y: 2 }}
        className="flex h-12 w-full items-center justify-center rounded-xl text-sm text-white"
        style={{
          backgroundColor: COLOR,
          border: `1.5px solid ${COLOR}`,
          borderBottom: "3px solid rgba(0,0,0,0.2)",
          fontWeight: 800,
        }}
      >
        Upgrade to Premium
      </motion.a>

      <motion.button
        type="button"
        onClick={onClose}
        whileTap={{ y: 1 }}
        className="flex h-11 w-full items-center justify-center rounded-xl text-sm"
        style={{
          backgroundColor: "var(--roost-surface)",
          border: "1.5px solid #E5E7EB",
          borderBottom: "3px solid #E5E7EB",
          color: "var(--roost-text-secondary)",
          fontWeight: 700,
        }}
      >
        Maybe later
      </motion.button>
    </div>
  );
}

// ---- Component --------------------------------------------------------------

export default function GroceryListSheet({
  open,
  onClose,
  list,
  isPremium,
}: GroceryListSheetProps) {
  const queryClient = useQueryClient();
  const isEdit = !!list;
  const [name, setName] = useState("");

  useEffect(() => {
    if (list) {
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

  // Free tier trying to add a new list
  if (!isPremium && !isEdit) {
    return (
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl px-4 pb-8 pt-2"
          style={{ backgroundColor: "var(--roost-surface)" }}
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ backgroundColor: "#F59E0B" }} />
          <SheetHeader className="mb-5">
            <SheetTitle
              className="text-lg"
              style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}
            >
              Multiple lists
            </SheetTitle>
          </SheetHeader>
          <UpgradePrompt onClose={onClose} />
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl px-4 pb-8 pt-4"
        style={{ backgroundColor: "var(--roost-bg)" }}
      >
        <SheetHeader className="mb-5">
          <SheetTitle
            className="text-lg"
            style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}
          >
            {isEdit ? "Rename list" : "New list"}
          </SheetTitle>
        </SheetHeader>

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
              autoFocus
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
      </SheetContent>
    </Sheet>
  );
}
