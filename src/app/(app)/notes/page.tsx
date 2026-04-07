"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/auth/client";
import { toast } from "sonner";
import { motion } from "framer-motion";
import { Loader2, Plus, StickyNote } from "lucide-react";
import { relativeTime } from "@/lib/utils/time";
import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";
import ErrorState from "@/components/shared/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import MemberAvatar from "@/components/shared/MemberAvatar";
import NoteSheet, { type NoteData } from "@/components/notes/NoteSheet";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import UpgradePrompt from "@/components/shared/UpgradePrompt";
import { SECTION_COLORS } from "@/lib/constants/colors";
import { PageContainer } from "@/components/layout/PageContainer";

const COLOR = SECTION_COLORS.notes; // #A855F7
const COLOR_DARK = "#7C28C8";

// ---- Types ------------------------------------------------------------------

interface NoteRow {
  id: string;
  title: string | null;
  content: string;
  created_by: string;
  created_at: string | null;
  updated_at: string | null;
  creator_name: string | null;
  creator_avatar: string | null;
}

interface NotesResponse {
  notes: NoteRow[];
}

interface MembersResponse {
  household: { id: string; name: string };
  members: { userId: string; name: string; avatarColor: string | null; role: string }[];
}

// ---- Note card --------------------------------------------------------------

function NoteCard({
  note,
  index,
  onOpen,
}: {
  note: NoteRow;
  index: number;
  onOpen: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const CHAR_LIMIT = 200;
  const isLong = note.content.length > CHAR_LIMIT;
  const displayContent = expanded || !isLong ? note.content : note.content.slice(0, CHAR_LIMIT) + "…";
  const borderColor = COLOR_DARK;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.04, 0.2), duration: 0.15 }}
      className="flex flex-col gap-3 rounded-2xl p-4"
      style={{
        backgroundColor: "var(--roost-surface)",
        border: "1.5px solid var(--roost-border)",
        borderBottom: `4px solid ${borderColor}`,
        cursor: "pointer",
      }}
      onClick={onOpen}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === "Enter" && onOpen()}
    >
      {/* Title */}
      {note.title && (
        <p className="text-[15px] leading-snug" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
          {note.title}
        </p>
      )}

      {/* Content */}
      <p
        className="text-sm leading-relaxed whitespace-pre-wrap"
        style={{ color: "var(--roost-text-primary)", fontWeight: 600 }}
        onClick={(e) => e.stopPropagation()}
      >
        {displayContent}
      </p>

      {/* Read more */}
      {isLong && !expanded && (
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
          className="self-start text-xs"
          style={{ color: COLOR, fontWeight: 700 }}
        >
          Read more
        </button>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {note.creator_name && (
            <MemberAvatar name={note.creator_name} avatarColor={note.creator_avatar} size="sm" />
          )}
          <span className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
            {note.creator_name?.split(" ")[0] ?? "Someone"}
          </span>
        </div>
        <span className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
          {note.created_at ? relativeTime(note.created_at) : ""}
        </span>
      </div>
    </motion.div>
  );
}

// ---- Loading skeleton -------------------------------------------------------

function NotesSkeleton() {
  // Heights: [120, 80, 60, 120, 60, 80] — gives variety
  const heights = [120, 80, 60, 120, 60, 80];
  return (
    <div className="columns-1 gap-3 md:columns-3">
      {heights.map((h, i) => (
        <div key={i} className="mb-3 break-inside-avoid">
          <Skeleton className="w-full rounded-2xl" style={{ height: h }} />
        </div>
      ))}
    </div>
  );
}

// ---- Page -------------------------------------------------------------------

export default function NotesPage() {
  const { data: sessionData } = useSession();
  const currentUserId = sessionData?.user?.id ?? "";
  const queryClient = useQueryClient();
  const quickAddRef = useRef<HTMLInputElement>(null);

  const [quickText, setQuickText] = useState("");
  const [placeholderIdx, setPlaceholderIdx] = useState(0);
  const [upgradeCode, setUpgradeCode] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<"create" | "edit" | "view">("create");
  const [selectedNote, setSelectedNote] = useState<NoteData | null>(null);

  const PLACEHOLDERS = [
    "Leave a note for the household...",
    "Plumber coming Tuesday...",
    "Someone ate my leftovers again...",
    "Dog needs a walk at 5pm...",
  ];

  useEffect(() => {
    const id = setInterval(() => {
      setPlaceholderIdx((i) => (i + 1) % PLACEHOLDERS.length);
    }, 3000);
    return () => clearInterval(id);
  }, []);

  // ---- Queries ---------------------------------------------------------------

  const {
    data: notesData,
    isLoading,
    isError,
    refetch,
  } = useQuery<NotesResponse>({
    queryKey: ["notes"],
    queryFn: async () => {
      const r = await fetch("/api/notes");
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to load notes");
      }
      return r.json();
    },
    staleTime: 10_000,
    refetchInterval: 10_000,
    retry: 2,
  });

  const { data: membersData } = useQuery<MembersResponse>({
    queryKey: ["household-members"],
    queryFn: async () => {
      const r = await fetch("/api/household/members");
      if (!r.ok) return { household: null, members: [] };
      return r.json();
    },
    staleTime: 10_000,
    retry: 2,
  });

  // ---- Quick add mutation ----------------------------------------------------

  const quickAddMutation = useMutation({
    mutationFn: async (content: string) => {
      const r = await fetch("/api/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        const err = new Error(d.error ?? "Failed to save note") as Error & { code?: string };
        err.code = d.code;
        throw err;
      }
      return r.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notes"] });
      toast.success("Note left");
      setQuickText("");
      quickAddRef.current?.focus();
    },
    onError: (err: Error & { code?: string }) => {
      if (err.code) { setUpgradeCode(err.code); return; }
      toast.error("Could not save note", { description: err.message });
    },
  });

  function handleQuickAdd() {
    if (!quickText.trim()) return;
    quickAddMutation.mutate(quickText.trim());
  }

  // ---- Derived ---------------------------------------------------------------

  const allNotes = notesData?.notes ?? [];
  const members = membersData?.members ?? [];
  const currentMember = members.find((m) => m.userId === currentUserId);
  const isAdmin = currentMember?.role === "admin";

  function openView(note: NoteRow) {
    setSelectedNote(note as NoteData);
    setSheetMode("view");
    setSheetOpen(true);
  }

  function openCreate() {
    setSelectedNote(null);
    setSheetMode("create");
    setSheetOpen(true);
  }

  // ---- Render ----------------------------------------------------------------

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="py-4 pb-24 md:py-6"
      style={{ backgroundColor: "var(--roost-bg)" }}
    >
      <PageContainer className="flex flex-col gap-4">
      {/* Header */}
      <PageHeader
        title="Notes"
        badge={allNotes.length}
        color={COLOR}
        action={
          <motion.button
            type="button"
            onClick={openCreate}
            whileTap={{ y: 1 }}
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              backgroundColor: COLOR,
              border: `1.5px solid ${COLOR}`,
              borderBottom: `3px solid ${COLOR_DARK}`,
            }}
            aria-label="New note"
          >
            <Plus className="size-4 text-white" />
          </motion.button>
        }
      />

      {/* Quick add bar */}
      <div
        className="flex h-14 items-center gap-2 overflow-hidden rounded-xl"
        onClick={() => quickAddRef.current?.focus()}
        style={{
          border: `1.5px solid ${COLOR}50`,
          borderBottom: `3px solid ${COLOR_DARK}50`,
          backgroundColor: "var(--roost-surface)",
          cursor: "text",
        }}
      >
        <input
          ref={quickAddRef}
          type="text"
          value={quickText}
          onChange={(e) => setQuickText(e.target.value.slice(0, 1000))}
          onKeyDown={(e) => e.key === "Enter" && handleQuickAdd()}
          placeholder={PLACEHOLDERS[placeholderIdx]}
          className="h-full flex-1 bg-transparent px-4 text-sm focus:outline-none"
          style={{ color: "var(--roost-text-primary)", fontWeight: 600 }}
        />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); handleQuickAdd(); }}
          disabled={!quickText.trim() || quickAddMutation.isPending}
          className="flex h-full w-14 shrink-0 items-center justify-center disabled:opacity-40"
          style={{ color: COLOR }}
        >
          {quickAddMutation.isPending
            ? <Loader2 className="size-4 animate-spin" />
            : <Plus className="size-5" strokeWidth={2.5} />}
        </button>
      </div>

      {/* Loading */}
      {isLoading && <NotesSkeleton />}

      {/* Error */}
      {isError && !isLoading && <ErrorState onRetry={refetch} />}

      {/* Empty state */}
      {!isLoading && !isError && allNotes.length === 0 && (
        <EmptyState
          icon={StickyNote}
          title="Quiet in here."
          body="No notes yet. Leave one for the household before something important gets forgotten."
          color={COLOR}
        />
      )}

      {/* Notes grid (masonry via CSS columns) */}
      {!isLoading && !isError && allNotes.length > 0 && (
        <div className="columns-1 gap-3 sm:columns-2 lg:columns-3">
          {allNotes.map((note, i) => (
            <div key={note.id} className="mb-3 break-inside-avoid">
              <NoteCard
                note={note}
                index={i}
                onOpen={() => openView(note)}
              />
            </div>
          ))}
        </div>
      )}

      {/* Note sheet */}
      <NoteSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setSelectedNote(null); }}
        mode={sheetMode}
        note={selectedNote}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        onUpgradeRequired={(code) => { setSheetOpen(false); setUpgradeCode(code); }}
      />

      {/* Upgrade prompt */}
      <Sheet open={!!upgradeCode} onOpenChange={(v) => !v && setUpgradeCode(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-8 pt-2" style={{ backgroundColor: "var(--roost-surface)" }}>
          <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ backgroundColor: COLOR }} />
          {upgradeCode && <UpgradePrompt code={upgradeCode} onDismiss={() => setUpgradeCode(null)} />}
        </SheetContent>
      </Sheet>
      </PageContainer>
    </motion.div>
  );
}
