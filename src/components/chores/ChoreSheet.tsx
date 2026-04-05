"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Trash2 } from "lucide-react";

// ---- Types ------------------------------------------------------------------

export interface ChoreData {
  id: string;
  title: string;
  description: string | null;
  frequency: string;
  custom_days: string | null;
  assigned_to: string | null;
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
}

// ---- Constants --------------------------------------------------------------

const FREQUENCIES = [
  { value: "daily",   label: "Daily" },
  { value: "weekly",  label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "custom",  label: "Custom" },
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

// ---- Component --------------------------------------------------------------

export default function ChoreSheet({
  open,
  onClose,
  chore,
  members,
  isAdmin,
}: ChoreSheetProps) {
  const queryClient = useQueryClient();
  const isEdit = !!chore;

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Populate form when editing
  useEffect(() => {
    if (chore) {
      setTitle(chore.title);
      setDescription(chore.description ?? "");
      setAssignedTo(chore.assigned_to ?? "");
      setFrequency(chore.frequency);
      setCustomDays(
        chore.custom_days ? (JSON.parse(chore.custom_days) as number[]) : []
      );
    } else {
      setTitle("");
      setDescription("");
      setAssignedTo("");
      setFrequency("daily");
      setCustomDays([]);
    }
  }, [chore, open]);

  function toggleDay(day: number) {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
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
        throw new Error(data.error ?? "Failed to save chore");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["chores"] });
      toast.success(isEdit ? "Chore updated" : "Chore created");
      onClose();
    },
    onError: (err: Error) => {
      toast.error(err.message);
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
      <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
        <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto rounded-t-2xl px-4 pb-8 pt-4">
          <SheetHeader className="mb-4">
            <SheetTitle>{isEdit ? "Edit chore" : "Add chore"}</SheetTitle>
          </SheetHeader>

          <div className="space-y-5">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Vacuum living room"
                className="flex h-12 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Description (optional)</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Any extra details..."
                rows={2}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring resize-none"
              />
            </div>

            {/* Assign to */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Assign to</label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="flex h-12 w-full rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                <option value="">Unassigned</option>
                {members.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Frequency */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">Frequency</label>
              <div className="flex rounded-md border border-input overflow-hidden">
                {FREQUENCIES.map((f, i) => (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFrequency(f.value)}
                    className={`flex-1 h-12 text-sm font-medium transition-colors ${
                      i > 0 ? "border-l border-input" : ""
                    } ${
                      frequency === f.value
                        ? "bg-[#EF4444] text-white"
                        : "bg-background text-foreground hover:bg-accent"
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom days picker */}
            {frequency === "custom" && (
              <div className="space-y-1.5">
                <label className="text-sm font-medium">Days</label>
                <div className="flex gap-1.5">
                  {DAYS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleDay(d.value)}
                      className={`flex-1 h-10 rounded-lg text-xs font-medium transition-colors ${
                        customDays.includes(d.value)
                          ? "bg-[#EF4444] text-white"
                          : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Save button */}
            <button
              type="button"
              disabled={!canSubmit}
              onClick={() => saveMutation.mutate()}
              className="flex h-12 w-full items-center justify-center rounded-xl text-sm font-semibold text-white transition-opacity disabled:opacity-50"
              style={{ backgroundColor: "#EF4444" }}
            >
              {saveMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : isEdit ? (
                "Save changes"
              ) : (
                "Add chore"
              )}
            </button>

            {/* Delete button — edit mode, admins only */}
            {isEdit && isAdmin && (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-destructive text-sm font-medium text-destructive hover:bg-destructive/5 transition-colors"
              >
                <Trash2 className="size-4" />
                Delete chore
              </button>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete confirmation dialog */}
      <Dialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete chore?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            This will remove the chore for everyone in the household. This cannot be undone.
          </p>
          <DialogFooter className="mt-2 gap-2">
            <button
              type="button"
              onClick={() => setConfirmDelete(false)}
              className="flex h-11 flex-1 items-center justify-center rounded-lg border border-border text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="flex h-11 flex-1 items-center justify-center rounded-lg bg-destructive text-sm font-semibold text-white disabled:opacity-50"
            >
              {deleteMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
