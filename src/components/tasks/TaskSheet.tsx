"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import DraggableSheet from "@/components/shared/DraggableSheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Loader2, Trash2 } from "lucide-react";
import { SECTION_COLORS } from "@/lib/constants/colors";

const COLOR = SECTION_COLORS.tasks; // #EC4899

// ---- Types ------------------------------------------------------------------

export interface TaskData {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  due_date: string | null;
  priority: string;
  created_by: string;
}

export interface Member {
  userId: string;
  name: string;
  avatarColor: string | null;
  role: string;
}

interface TaskSheetProps {
  open: boolean;
  onClose: () => void;
  task?: TaskData | null;
  householdMembers: Member[];
  currentUserId: string;
  isAdmin: boolean;
  onUpgradeRequired?: (code: string) => void;
}

// ---- Shared input style -----------------------------------------------------

const inputStyle: React.CSSProperties = {
  backgroundColor: "var(--roost-surface)",
  border: "1.5px solid #E5E7EB",
  borderBottom: "3px solid #E5E7EB",
  color: "var(--roost-text-primary)",
  fontWeight: 600,
};

// ---- Priority config --------------------------------------------------------

const PRIORITIES = [
  { value: "low",    label: "Low",    color: "var(--roost-text-muted)" },
  { value: "medium", label: "Medium", color: "#F59E0B" },
  { value: "high",   label: "High",   color: "#EF4444" },
] as const;

// ---- Component --------------------------------------------------------------

export default function TaskSheet({
  open,
  onClose,
  task,
  householdMembers,
  currentUserId,
  isAdmin,
  onUpgradeRequired,
}: TaskSheetProps) {
  const queryClient = useQueryClient();
  const titleRef = useRef<HTMLInputElement>(null);
  const mode = task ? "edit" : "create";

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assignedTo, setAssignedTo] = useState<string>("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Sync fields when task changes or sheet opens
  useEffect(() => {
    if (open) {
      if (task) {
        setTitle(task.title);
        setDescription(task.description ?? "");
        setAssignedTo(task.assigned_to ?? "");
        setDueDate(
          task.due_date
            ? new Date(task.due_date).toISOString().split("T")[0]
            : ""
        );
        setPriority((task.priority as "low" | "medium" | "high") ?? "medium");
      } else {
        setTitle("");
        setDescription("");
        setAssignedTo("");
        setDueDate("");
        setPriority("medium");
      }
      // Autofocus title
      setTimeout(() => titleRef.current?.focus(), 100);
    }
  }, [open, task]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        assigned_to: assignedTo || null,
        due_date: dueDate || null,
        priority,
      };
      if (mode === "create") {
        const r = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          const err = new Error(d.error ?? "Failed to create task") as Error & { code?: string };
          err.code = d.code;
          throw err;
        }
        return r.json();
      } else {
        const r = await fetch(`/api/tasks/${task!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error ?? "Failed to update task");
        }
        return r.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success(mode === "create" ? "Task added" : "Task updated");
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
      const r = await fetch(`/api/tasks/${task!.id}`, { method: "DELETE" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to delete task");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted");
      setDeleteDialogOpen(false);
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const canDelete =
    mode === "edit" && task &&
    (task.created_by === currentUserId || isAdmin);

  function handleSave() {
    if (!title.trim()) {
      toast.error("Title is required");
      titleRef.current?.focus();
      return;
    }
    saveMutation.mutate();
  }

  return (
    <>
      <DraggableSheet open={open} onOpenChange={(v) => !v && onClose()} featureColor="#EC4899">
        <div
          className="px-4 pb-8"
          style={{ maxHeight: "calc(92dvh - 60px)" }}
        >
          <p className="mb-5 text-lg" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
            {mode === "create" ? "New Task" : "Edit Task"}
          </p>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="mb-1.5 block text-xs" style={{ color: "#374151", fontWeight: 700 }}>
                Title
              </label>
              <input
                ref={titleRef}
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
                placeholder="e.g. Call the landlord (again)"
                className="h-12 w-full rounded-xl px-4 text-sm focus:outline-none"
                style={inputStyle}
              />
            </div>

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-xs" style={{ color: "#374151", fontWeight: 700 }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Any details worth knowing..."
                rows={3}
                className="w-full resize-none rounded-xl px-4 py-3 text-sm focus:outline-none"
                style={inputStyle}
              />
            </div>

            {/* Assign to */}
            <div>
              <label className="mb-1.5 block text-xs" style={{ color: "#374151", fontWeight: 700 }}>
                Assign to
              </label>
              <select
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="h-12 w-full rounded-xl px-4 text-sm focus:outline-none"
                style={inputStyle}
              >
                <option value="">Unassigned</option>
                {householdMembers.map((m) => (
                  <option key={m.userId} value={m.userId}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Due date */}
            <div>
              <label className="mb-1.5 block text-xs" style={{ color: "#374151", fontWeight: 700 }}>
                Due date
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="h-12 flex-1 rounded-xl px-4 text-sm focus:outline-none"
                  style={inputStyle}
                />
                {dueDate && (
                  <button
                    type="button"
                    onClick={() => setDueDate("")}
                    className="h-12 rounded-xl px-4 text-sm"
                    style={{
                      border: "1.5px solid #E5E7EB",
                      borderBottom: "3px solid #E5E7EB",
                      color: "var(--roost-text-muted)",
                      fontWeight: 700,
                    }}
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            {/* Priority */}
            <div>
              <label className="mb-1.5 block text-xs" style={{ color: "#374151", fontWeight: 700 }}>
                Priority
              </label>
              <div className="flex gap-2">
                {PRIORITIES.map((p) => {
                  const active = priority === p.value;
                  const isHigh = p.value === "high";
                  const isMedium = p.value === "medium";
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => setPriority(p.value)}
                      className="flex h-10 flex-1 items-center justify-center rounded-xl text-sm"
                      style={{
                        backgroundColor: active
                          ? (isHigh ? "#EF4444" : isMedium ? "#F59E0B" : "#E5E7EB")
                          : "var(--roost-surface)",
                        border: active
                          ? `1.5px solid ${isHigh ? "#C93B3B" : isMedium ? "#C87D00" : "#E5E7EB"}`
                          : "1.5px solid #E5E7EB",
                        borderBottom: active
                          ? `3px solid ${isHigh ? "#A63030" : isMedium ? "#A66A00" : "#C5C9CD"}`
                          : "3px solid #E5E7EB",
                        color: active
                          ? (isHigh || isMedium ? "white" : "var(--roost-text-primary)")
                          : p.color,
                        fontWeight: active ? 800 : 700,
                      }}
                    >
                      {p.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Save */}
            <motion.button
              type="button"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              whileTap={{ y: 2 }}
              className="mt-2 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm text-white"
              style={{
                backgroundColor: COLOR,
                border: `1.5px solid ${COLOR}`,
                borderBottom: "3px solid #B02878",
                fontWeight: 800,
                opacity: saveMutation.isPending ? 0.7 : 1,
              }}
            >
              {saveMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                mode === "create" ? "Add Task" : "Save Changes"
              )}
            </motion.button>

            {/* Delete (edit mode only) */}
            {canDelete && (
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(true)}
                className="flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm"
                style={{ color: "#EF4444", fontWeight: 700 }}
              >
                <Trash2 className="size-4" />
                Delete task
              </button>
            )}
          </div>
        </div>
      </DraggableSheet>

      {/* Delete confirmation */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
              Delete task?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
            {task?.title}
          </p>
          <DialogFooter className="mt-2 gap-2">
            <button
              type="button"
              onClick={() => setDeleteDialogOpen(false)}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm"
              style={{
                border: "1.5px solid #E5E7EB",
                borderBottom: "3px solid #E5E7EB",
                color: "var(--roost-text-primary)",
                fontWeight: 700,
              }}
            >
              Cancel
            </button>
            <motion.button
              type="button"
              whileTap={{ y: 1 }}
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm text-white"
              style={{
                backgroundColor: "#EF4444",
                border: "1.5px solid #C93B3B",
                borderBottom: "3px solid #A63030",
                fontWeight: 800,
                opacity: deleteMutation.isPending ? 0.7 : 1,
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
