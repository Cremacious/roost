"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import { Loader2, Pencil, Sparkles, Trash2 } from "lucide-react";
import { format } from "date-fns";
import MemberAvatar from "@/components/shared/MemberAvatar";
import { useHousehold } from "@/lib/hooks/useHousehold";
import RichTextEditor from "@/components/notes/RichTextEditor";

const COLOR = "#A855F7";
const COLOR_DARK = "#7C28C8";
const UPGRADE_COLOR = "#6366F1";

// ---- Types ------------------------------------------------------------------

export interface NoteData {
  id: string;
  title: string | null;
  content: string;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
  creator_name: string | null;
  creator_avatar: string | null;
}

interface NoteSheetProps {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit" | "view";
  note?: NoteData | null;
  currentUserId: string;
  isAdmin: boolean;
  onUpgradeRequired?: (code: string) => void;
}

// ---- Helpers ----------------------------------------------------------------

const inputStyle: React.CSSProperties = {
  backgroundColor: "var(--roost-surface)",
  border: "1.5px solid #E5E7EB",
  borderBottom: "3px solid #E5E7EB",
  color: "var(--roost-text-primary)",
  fontWeight: 600,
};

function isNoteEmpty(content: string): boolean {
  if (!content) return true;
  if (content.trim() === "") return true;
  if (content === "<p></p>") return true;
  return false;
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}

// ---- Component --------------------------------------------------------------

export default function NoteSheet({
  open,
  onClose,
  mode: initialMode,
  note,
  currentUserId,
  isAdmin,
  onUpgradeRequired,
}: NoteSheetProps) {
  const queryClient = useQueryClient();
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { isPremium } = useHousehold();
  const isRich = isPremium === true;

  const [mode, setMode] = useState(initialMode);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [charCount, setCharCount] = useState(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const canEdit = note && (note.created_by === currentUserId || isAdmin);

  useEffect(() => {
    if (!open) return;
    setMode(initialMode);
    if (initialMode === "create") {
      setTitle("");
      setContent("");
      setCharCount(0);
      if (!isRich) setTimeout(() => contentRef.current?.focus(), 100);
    } else if (note) {
      setTitle(note.title ?? "");
      setContent(note.content);
      setCharCount(note.content.length);
    }
  }, [open, initialMode, note, isRich]);

  function handleContentChange(val: string) {
    if (val.length > 1000) return;
    setContent(val);
    setCharCount(val.length);
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["notes"] });
  }

  // ---- Save mutation (create / edit) ----------------------------------------

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (isNoteEmpty(content)) throw new Error("Content is required");
      const payload = {
        title: title.trim() || undefined,
        content: isRich ? content : content.trim(),
      };

      if (mode === "create") {
        const r = await fetch("/api/notes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          const err = new Error(d.error ?? "Failed to save note") as Error & { code?: string };
          err.code = d.code;
          throw err;
        }
        return r.json();
      } else {
        const r = await fetch(`/api/notes/${note!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error ?? "Failed to save note");
        }
        return r.json();
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success(mode === "create" ? "Note saved" : "Note updated");
      onClose();
    },
    onError: (err: Error & { code?: string }) => {
      if (err.code && onUpgradeRequired) { onUpgradeRequired(err.code); return; }
      toast.error("Could not save note", { description: err.message });
    },
  });

  // ---- Auto-save mutation (view mode checkbox changes) ----------------------

  const autoSaveMutation = useMutation({
    mutationFn: async (html: string) => {
      const r = await fetch(`/api/notes/${note!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: html }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to save");
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
    },
    onError: () => {
      // Silent — auto-save failures don't need a toast
    },
  });

  const handleViewModeChange = useCallback(
    (html: string) => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = setTimeout(() => {
        autoSaveMutation.mutate(html);
      }, 500);
    },
    [autoSaveMutation]
  );

  // ---- Delete mutation -------------------------------------------------------

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const r = await fetch(`/api/notes/${note!.id}`, { method: "DELETE" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to delete note");
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success("Note deleted");
      setDeleteDialogOpen(false);
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ---- Note preview for delete dialog (strip HTML if rich) ------------------

  const notePreviewText = note
    ? isRich
      ? stripHtml(note.content).slice(0, 60)
      : note.content.slice(0, 60)
    : "";

  // ---- View mode (premium: rich text with interactive checkboxes) -----------

  if (mode === "view" && note) {
    const timestamp = note.created_at
      ? format(new Date(note.created_at), "EEEE MMMM d 'at' h:mm a")
      : null;
    const contentIsHtml =
      note.content.startsWith("<") ||
      note.content.includes("<p>") ||
      note.content.includes("<h");

    return (
      <>
        <DraggableSheet open={open} onOpenChange={(v) => !v && onClose()} featureColor={COLOR}>
          <div
            className="overflow-y-auto px-4 pb-8"
            style={{ maxHeight: "calc(88dvh - 60px)" }}
          >
              {/* Header with edit button */}
              <div className="mb-4 flex items-start justify-between gap-3">
                {note.title ? (
                  <h2 className="text-xl leading-tight" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
                    {note.title}
                  </h2>
                ) : (
                  <div />
                )}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() => setMode("edit")}
                    className="flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-3 text-sm"
                    style={{
                      border: "1.5px solid #E5E7EB",
                      borderBottom: "3px solid #E5E7EB",
                      color: "var(--roost-text-secondary)",
                      fontWeight: 700,
                    }}
                  >
                    <Pencil className="size-3.5" />
                    Edit
                  </button>
                )}
              </div>

              {/* Content */}
              {isRich && contentIsHtml ? (
                <RichTextEditor
                  content={note.content}
                  onChange={handleViewModeChange}
                  editable={true}
                  hideToolbar={true}
                />
              ) : (
                <p
                  className="text-sm leading-relaxed whitespace-pre-wrap"
                  style={{ color: "var(--roost-text-primary)", fontWeight: 600 }}
                >
                  {note.content}
                </p>
              )}

              {/* Footer: author + timestamp */}
              <div className="mt-5 flex items-center gap-2">
                {note.creator_name && (
                  <MemberAvatar name={note.creator_name} avatarColor={note.creator_avatar} size="sm" />
                )}
                <span className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                  {note.creator_name?.split(" ")[0] ?? "Someone"}
                  {timestamp && ` · ${timestamp}`}
                </span>
              </div>

              {/* Delete */}
              {canEdit && (
                <button
                  type="button"
                  onClick={() => setDeleteDialogOpen(true)}
                  className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl text-sm"
                  style={{ color: "#EF4444", fontWeight: 700 }}
                >
                  <Trash2 className="size-4" />
                  Delete note
                </button>
              )}
            </div>
          </DraggableSheet>

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
                Delete note?
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
              {note.title ?? notePreviewText}
            </p>
            <DialogFooter className="mt-2 gap-2">
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(false)}
                className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm"
                style={{ border: "1.5px solid #E5E7EB", borderBottom: "3px solid #E5E7EB", color: "var(--roost-text-primary)", fontWeight: 700 }}
              >
                Cancel
              </button>
              <motion.button
                type="button"
                whileTap={{ y: 1 }}
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm text-white"
                style={{ backgroundColor: "#EF4444", border: "1.5px solid #C93B3B", borderBottom: "3px solid #A63030", fontWeight: 800, opacity: deleteMutation.isPending ? 0.7 : 1 }}
              >
                {deleteMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
              </motion.button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // ---- Create / Edit mode ----------------------------------------------------

  return (
    <DraggableSheet open={open} onOpenChange={(v) => !v && onClose()} featureColor={COLOR}>
      <div
        className="overflow-y-auto px-4 pb-8"
        style={{ maxHeight: "calc(88dvh - 60px)" }}
      >
          <p className="mb-5 text-lg" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
            {mode === "create" ? "New Note" : "Edit Note"}
          </p>

          <div className="space-y-4">
            {/* Title (optional) */}
            <div>
              <label className="mb-1.5 block text-xs" style={{ color: "#374151", fontWeight: 700 }}>
                Title (optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give it a name"
                className="h-12 w-full rounded-xl px-4 text-sm focus:outline-none"
                style={inputStyle}
              />
            </div>

            {/* Content — premium: RichTextEditor, free: textarea */}
            <div>
              <div className="mb-1.5 flex items-center justify-between">
                <label className="block text-xs" style={{ color: "#374151", fontWeight: 700 }}>
                  Note
                </label>
                {isRich && (
                  <span
                    className="flex items-center gap-1 text-xs"
                    style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
                  >
                    <Sparkles className="size-3" style={{ color: UPGRADE_COLOR }} />
                    Rich text
                  </span>
                )}
              </div>

              {isRich ? (
                <RichTextEditor
                  content={content}
                  onChange={setContent}
                  placeholder="Write whatever you want. Nobody is grading this."
                  editable={true}
                />
              ) : (
                <>
                  <textarea
                    ref={contentRef}
                    value={content}
                    onChange={(e) => handleContentChange(e.target.value)}
                    placeholder="Write whatever you want. Nobody is grading this."
                    rows={6}
                    className="w-full resize-none rounded-xl px-4 py-3 text-sm focus:outline-none"
                    style={inputStyle}
                  />
                  <p
                    className="mt-1 text-right text-xs"
                    style={{ color: charCount > 900 ? "#EF4444" : "var(--roost-text-muted)", fontWeight: 600 }}
                  >
                    {charCount}/1000
                  </p>

                  {/* Upgrade nudge for free users */}
                  <div
                    className="mt-3 flex items-center gap-3 rounded-xl px-4 py-3"
                    style={{
                      backgroundColor: "var(--roost-bg)",
                      border: "1px solid var(--roost-border)",
                    }}
                  >
                    <Sparkles className="size-4 shrink-0" style={{ color: UPGRADE_COLOR }} />
                    <p className="flex-1 text-xs leading-relaxed" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
                      Premium notes support headings, checklists, bold, links, and more.
                    </p>
                    <button
                      type="button"
                      onClick={() => onUpgradeRequired?.("RICH_TEXT_NOTES_PREMIUM")}
                      className="shrink-0 text-xs"
                      style={{ color: UPGRADE_COLOR, fontWeight: 800 }}
                    >
                      Upgrade
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Save */}
            <motion.button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending || isNoteEmpty(content)}
              whileTap={{ y: 2 }}
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm text-white"
              style={{
                backgroundColor: COLOR,
                border: `1.5px solid ${COLOR}`,
                borderBottom: `3px solid ${COLOR_DARK}`,
                fontWeight: 800,
                opacity: (saveMutation.isPending || isNoteEmpty(content)) ? 0.6 : 1,
              }}
            >
              {saveMutation.isPending
                ? <Loader2 className="size-4 animate-spin" />
                : mode === "create" ? "Save Note" : "Save Changes"}
            </motion.button>

            {/* Cancel */}
            <button
              type="button"
              onClick={onClose}
              className="flex h-11 w-full items-center justify-center rounded-xl text-sm"
              style={{ color: "#374151", fontWeight: 700 }}
            >
              Cancel
            </button>
          </div>
        </div>
    </DraggableSheet>
  );
}
