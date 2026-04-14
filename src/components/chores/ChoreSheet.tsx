"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import DraggableSheet from "@/components/shared/DraggableSheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Lock, Trash2 } from "lucide-react";
import { SECTION_COLORS } from "@/lib/constants/colors";
import ChoreCategoryPicker from "./ChoreCategoryPicker";

const COLOR = SECTION_COLORS.chores;

// ---- Types ------------------------------------------------------------------

export interface ChoreData {
  id: string;
  title: string;
  description: string | null;
  frequency: string;
  custom_days: string | null;
  assigned_to: string | null;
  category_id: string | null;
}

interface Member {
  userId: string;
  name: string;
  avatarColor: string | null;
  role: string;
}

interface ChoreSheetProps {
  open: boolean;
  onClose: () => void;
  chore?: ChoreData | null;
  members: Member[];
  isAdmin: boolean;
  isPremium?: boolean;
  onUpgradeRequired?: (code: string) => void;
}

// ---- Constants --------------------------------------------------------------

const FREQUENCIES = [
  { value: "daily",   label: "Daily",   premiumOnly: false },
  { value: "weekly",  label: "Weekly",  premiumOnly: true  },
  { value: "monthly", label: "Monthly", premiumOnly: true  },
  { value: "custom",  label: "Custom",  premiumOnly: true  },
];

const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

// ---- Shared input style -----------------------------------------------------

const inputStyle: React.CSSProperties = {
  backgroundColor: "var(--roost-surface)",
  border: "1.5px solid #E5E7EB",
  borderBottom: "3px solid #E5E7EB",
  color: "var(--roost-text-primary)",
  fontWeight: 600,
};

// ---- Component --------------------------------------------------------------

export default function ChoreSheet({
  open,
  onClose,
  chore,
  members,
  isAdmin,
  isPremium = false,
  onUpgradeRequired,
}: ChoreSheetProps) {
  const queryClient = useQueryClient();
  const isEdit = !!chore;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (chore) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setTitle(chore.title);
      setDescription(chore.description ?? "");
      setAssignedTo(chore.assigned_to ?? "");
      setFrequency(chore.frequency);
      setCustomDays(
        chore.custom_days ? (JSON.parse(chore.custom_days) as number[]) : []
      );
      setCategoryId(chore.category_id ?? null);
    } else {
      setTitle("");
      setDescription("");
      setAssignedTo("");
      setFrequency("daily");
      setCustomDays([]);
      setCategoryId(null);
    }
  }, [chore, open]);

  function toggleDay(day: number) {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  function handleFrequencyClick(value: string, premiumOnly: boolean) {
    if (premiumOnly && !isPremium) {
      onUpgradeRequired?.("RECURRING_CHORES_PREMIUM");
      return;
    }
    setFrequency(value);
  }

  // ---- Mutations ------------------------------------------------------------

  const saveMutation = useMutation({
    mutationFn: async () => {
      const body = {
        title: title.trim(),
        description: description.trim() || undefined,
        assigned_to: assignedTo || undefined,
        frequency,
        custom_days: frequency === "custom" ? customDays : undefined,
        category_id: categoryId ?? null,
      };

      const url = isEdit ? `/api/chores/${chore!.id}` : "/api/chores";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const err = new Error(data.error ?? "Failed to save chore") as Error & { code?: string };
        err.code = data.code;
        throw err;
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chores"] });
      toast.success(isEdit ? "Chore updated" : "Chore created");
      onClose();
    },
    onError: (err: Error & { code?: string }) => {
      if (err.code && onUpgradeRequired) {
        onUpgradeRequired(err.code);
      } else {
        toast.error(err.message);
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/chores/${chore!.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Failed to delete chore");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chores"] });
      toast.success("Chore deleted");
      setConfirmDelete(false);
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const canSubmit =
    title.trim().length > 0 &&
    (frequency !== "custom" || customDays.length > 0) &&
    !saveMutation.isPending;

  return (
    <>
      <DraggableSheet open={open} onOpenChange={(v) => !v && onClose()} featureColor="#EF4444">
        <div className="px-4 pb-8" style={{ maxHeight: "calc(90dvh - 60px)" }}>
          <p className="mb-5 text-lg" style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}>
            {isEdit ? "Edit chore" : "Add chore"}
          </p>

          <div className="space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
              <label
                className="text-sm"
                style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}
              >
                Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Vacuum the living room"
                className="flex h-12 w-full rounded-xl px-4 text-sm placeholder:italic focus:outline-none"
                style={inputStyle}
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label
                className="text-sm"
                style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}
              >
                Description
                <span
                  className="ml-1.5 text-xs"
                  style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
                >
                  optional
                </span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Any extra details for the person doing it"
                rows={2}
                className="w-full rounded-xl px-4 py-3 text-sm placeholder:italic focus:outline-none resize-none"
                style={inputStyle}
              />
            </div>

            {/* Category */}
            <div className="space-y-1.5">
              <label
                className="text-sm"
                style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}
              >
                Category
                <span
                  className="ml-1.5 text-xs"
                  style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
                >
                  optional
                </span>
              </label>
              <ChoreCategoryPicker
                selectedId={categoryId}
                onSelect={setCategoryId}
                isPremium={isPremium}
                isAdmin={isAdmin}
                onUpgradeRequired={onUpgradeRequired}
              />
            </div>

            {/* Assign to */}
            <div className="space-y-1.5">
              <label
                className="text-sm"
                style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}
              >
                Assign to
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="flex h-12 w-full rounded-xl px-4 text-sm focus:outline-none"
                style={inputStyle}
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Frequency: slab pill toggles */}
            <div className="space-y-1.5">
              <label
                className="text-sm"
                style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}
              >
                Frequency
              </label>
              <div className="grid grid-cols-4 gap-2">
                {FREQUENCIES.map((f) => {
                  const active = frequency === f.value;
                  const locked = f.premiumOnly && !isPremium;
                  return (
                    <motion.button
                      key={f.value}
                      type="button"
                      onClick={() => handleFrequencyClick(f.value, f.premiumOnly)}
                      whileTap={{ y: 1 }}
                      className="relative flex h-11 items-center justify-center rounded-xl text-sm"
                      style={{
                        backgroundColor: active ? COLOR + "18" : "var(--roost-surface)",
                        border: active
                          ? `1.5px solid ${COLOR}40`
                          : "1.5px solid var(--roost-border)",
                        borderBottom: active
                          ? `3px solid ${COLOR}70`
                          : "3px solid #E5E7EB",
                        color: locked ? "var(--roost-text-muted)" : active ? COLOR : "var(--roost-text-secondary)",
                        fontWeight: active ? 800 : 600,
                      }}
                    >
                      {f.label}
                      {locked && (
                        <Lock
                          className="absolute right-1.5 top-1.5 size-2.5"
                          style={{ color: "var(--roost-text-muted)" }}
                        />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* Custom day buttons */}
            {frequency === "custom" && (
              <div className="space-y-1.5">
                <label
                  className="text-sm"
                  style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}
                >
                  Days
                </label>
                <div className="grid grid-cols-7 gap-1.5">
                  {DAYS.map((d) => {
                    const active = customDays.includes(d.value);
                    return (
                      <motion.button
                        key={d.value}
                        type="button"
                        onClick={() => toggleDay(d.value)}
                        whileTap={{ y: 1 }}
                        className="flex h-11 items-center justify-center rounded-xl text-xs"
                        style={{
                          backgroundColor: active ? COLOR + "18" : "var(--roost-surface)",
                          border: active
                            ? `1.5px solid ${COLOR}40`
                            : "1.5px solid var(--roost-border)",
                          borderBottom: active
                            ? `3px solid ${COLOR}70`
                            : "3px solid #E5E7EB",
                          color: active ? COLOR : "var(--roost-text-secondary)",
                          fontWeight: active ? 800 : 600,
                        }}
                      >
                        {d.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Save button */}
            <motion.button
              type="button"
              data-testid="chore-save-btn"
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
                "Add chore"
              )}
            </motion.button>

            {/* Delete button */}
            {isEdit && isAdmin && (
              <motion.button
                type="button"
                onClick={() => setConfirmDelete(true)}
                whileTap={{ y: 2 }}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm"
                style={{
                  backgroundColor: "var(--roost-surface)",
                  border: "1.5px solid #E5E7EB",
                  borderBottom: "3px solid #E5E7EB",
                  color: "#EF4444",
                  fontWeight: 700,
                }}
              >
                <Trash2 className="size-4" />
                Delete chore
              </motion.button>
            )}
          </div>
        </div>
      </DraggableSheet>

      {/* Delete confirmation dialog */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent style={{ backgroundColor: "var(--roost-surface)" }}>
          <DialogHeader>
            <DialogTitle
              style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}
            >
              Delete chore?
            </DialogTitle>
          </DialogHeader>
          <DialogDescription
            className="text-sm"
            style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}
          >
            This will remove the chore for everyone in the household. It cannot be undone.
          </DialogDescription>
          <DialogFooter className="mt-2 flex gap-2">
            <motion.button
              type="button"
              onClick={() => setConfirmDelete(false)}
              whileTap={{ y: 1 }}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm"
              style={{
                backgroundColor: "var(--roost-bg)",
                border: "1.5px solid var(--roost-border)",
                borderBottom: "3px solid #E5E7EB",
                color: "var(--roost-text-secondary)",
                fontWeight: 700,
              }}
            >
              Cancel
            </motion.button>
            <motion.button
              type="button"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              whileTap={{ y: 1 }}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm text-white disabled:opacity-50"
              style={{
                backgroundColor: "#EF4444",
                border: "1.5px solid #EF4444",
                borderBottom: "3px solid rgba(0,0,0,0.2)",
                fontWeight: 800,
              }}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </motion.button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
