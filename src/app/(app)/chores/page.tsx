"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/auth/client";
import { toast } from "sonner";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Pencil,
  Plus,
  Trophy,
} from "lucide-react";
import { formatDistanceToNow, isPast } from "date-fns";
import ChoreSheet, { type ChoreData } from "@/components/chores/ChoreSheet";
import LeaderboardSheet from "@/components/chores/LeaderboardSheet";
import { SECTION_COLORS } from "@/lib/constants/colors";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

// ---- Types ------------------------------------------------------------------

interface ChoreRow {
  id: string;
  title: string;
  description: string | null;
  frequency: string;
  custom_days: string | null;
  next_due_at: string | null;
  last_completed_at: string | null;
  assigned_to: string | null;
  assignee_name: string | null;
  assignee_avatar: string | null;
  created_by: string;
  household_id: string;
  is_complete_today: boolean;
  completed_today_by_me: boolean;
  latest_completion: { completedAt: string | null; completedBy: string } | null;
}

interface ChoresResponse {
  chores: ChoreRow[];
  householdId: string;
}

interface Member {
  userId: string;
  name: string;
  avatarColor: string | null;
  role: string;
}

interface MembersResponse {
  household: { id: string; name: string };
  members: Member[];
}

// ---- Helpers ----------------------------------------------------------------

const COLOR = SECTION_COLORS.chores;

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

function frequencyLabel(freq: string): string {
  switch (freq) {
    case "daily":   return "Daily";
    case "weekly":  return "Weekly";
    case "monthly": return "Monthly";
    case "custom":  return "Custom";
    default:        return freq;
  }
}

// ---- Page -------------------------------------------------------------------

export default function ChoresPage() {
  const { data: sessionData } = useSession();
  const currentUserId = sessionData?.user.id ?? "";

  const queryClient = useQueryClient();
  const [view, setView] = useState<"mine" | "all">("mine");
  const [completedExpanded, setCompletedExpanded] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingChore, setEditingChore] = useState<ChoreData | null>(null);
  const [leaderboardOpen, setLeaderboardOpen] = useState(false);
  const [pendingCompleteId, setPendingCompleteId] = useState<string | null>(null);

  // ---- Data fetching --------------------------------------------------------

  const { data: choresData, isLoading: choresLoading } = useQuery<ChoresResponse>({
    queryKey: ["chores"],
    queryFn: () => fetch("/api/chores").then((r) => r.json()),
    staleTime: 10_000,
    refetchInterval: 10_000,
  });

  const { data: membersData } = useQuery<MembersResponse>({
    queryKey: ["household-members"],
    queryFn: () => fetch("/api/household/members").then((r) => r.json()),
    staleTime: 60_000,
  });

  // ---- Complete mutation with optimistic UI --------------------------------

  const completeMutation = useMutation({
    mutationFn: (choreId: string) =>
      fetch(`/api/chores/${choreId}/complete`, { method: "POST" }).then((r) => {
        if (!r.ok) throw new Error("Failed to complete chore");
        return r.json();
      }),
    onMutate: async (choreId) => {
      await queryClient.cancelQueries({ queryKey: ["chores"] });
      const previous = queryClient.getQueryData<ChoresResponse>(["chores"]);

      queryClient.setQueryData<ChoresResponse>(["chores"], (old) => {
        if (!old) return old;
        return {
          ...old,
          chores: old.chores.map((c) =>
            c.id === choreId
              ? { ...c, is_complete_today: true, completed_today_by_me: true }
              : c
          ),
        };
      });

      return { previous };
    },
    onError: (_err, _choreId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["chores"], context.previous);
      }
      toast.error("Failed to complete chore");
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["chores"] });
    },
  });

  const uncheckMutation = useMutation({
    mutationFn: (choreId: string) =>
      fetch(`/api/chores/${choreId}/complete`, { method: "DELETE" }).then((r) => {
        if (!r.ok) throw new Error("Failed to uncheck chore");
        return r.json();
      }),
    onMutate: async (choreId) => {
      await queryClient.cancelQueries({ queryKey: ["chores"] });
      const previous = queryClient.getQueryData<ChoresResponse>(["chores"]);
      queryClient.setQueryData<ChoresResponse>(["chores"], (old) => {
        if (!old) return old;
        return {
          ...old,
          chores: old.chores.map((c) =>
            c.id === choreId
              ? { ...c, is_complete_today: false, completed_today_by_me: false }
              : c
          ),
        };
      });
      return { previous };
    },
    onError: (_err, _choreId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["chores"], context.previous);
      }
      toast.error("Failed to uncheck chore");
    },
    onSuccess: (_data, choreId) => {
      toast("Chore unmarked", {
        action: {
          label: "Undo",
          onClick: () => completeMutation.mutate(choreId),
        },
      });
      queryClient.invalidateQueries({ queryKey: ["chores"] });
    },
  });

  // ---- Derived data ---------------------------------------------------------

  const allChores = choresData?.chores ?? [];
  const members = membersData?.members ?? [];

  const currentMember = members.find((m) => m.userId === currentUserId);
  const isAdmin = currentMember?.role === "admin";

  const filtered =
    view === "mine"
      ? allChores.filter(
          (c) => c.assigned_to === currentUserId || !c.assigned_to
        )
      : allChores;

  const incomplete = filtered.filter((c) => !c.is_complete_today);
  const complete = filtered.filter((c) => c.is_complete_today);

  const doneToday = allChores.filter((c) => c.completed_today_by_me).length;
  const remaining = allChores.filter(
    (c) =>
      !c.is_complete_today &&
      (c.assigned_to === currentUserId || !c.assigned_to)
  ).length;

  // Streak: from the leaderboard cache, or show 0
  const streakData = queryClient.getQueryData<{ leaderboard: { userId: string; currentStreak: number }[] }>(
    ["chores-leaderboard"]
  );
  const myStreak =
    streakData?.leaderboard.find((e) => e.userId === currentUserId)
      ?.currentStreak ?? 0;

  // ---- Handlers -------------------------------------------------------------

  function openCreate() {
    setEditingChore(null);
    setSheetOpen(true);
  }

  function openEdit(chore: ChoreRow) {
    setEditingChore({
      id: chore.id,
      title: chore.title,
      description: chore.description,
      frequency: chore.frequency,
      custom_days: chore.custom_days,
      assigned_to: chore.assigned_to,
    });
    setSheetOpen(true);
  }

  // ---- Render ---------------------------------------------------------------

  return (
    <div className="flex flex-col gap-4 p-4 pb-24 md:p-6">

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Chores</h1>
        <button
          type="button"
          onClick={() => setLeaderboardOpen(true)}
          className="flex h-10 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-muted-foreground hover:bg-accent transition-colors"
        >
          <Trophy className="size-4" />
          Leaderboard
        </button>
      </div>

      {/* Summary bar */}
      <div className="grid grid-cols-3 gap-2">
        {[
          { label: "Done today", value: doneToday },
          { label: "Remaining", value: remaining },
          { label: "Streak", value: `${myStreak}d` },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-xl border border-border bg-card px-3 py-2.5 text-center"
          >
            <p
              className="text-xl font-bold tabular-nums"
              style={{ color: COLOR }}
            >
              {stat.value}
            </p>
            <p className="mt-0.5 text-[11px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* View toggle */}
      <div className="flex rounded-lg border border-border overflow-hidden">
        {(["mine", "all"] as const).map((v, i) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`flex-1 h-10 text-sm font-medium transition-colors ${
              i > 0 ? "border-l border-border" : ""
            } ${
              view === v
                ? "text-white"
                : "bg-background text-muted-foreground hover:bg-accent"
            }`}
            style={view === v ? { backgroundColor: COLOR } : undefined}
          >
            {v === "mine" ? "My Chores" : "All Chores"}
          </button>
        ))}
      </div>

      {/* Loading */}
      {choresLoading && (
        <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
          Loading chores...
        </div>
      )}

      {/* Empty state */}
      {!choresLoading && allChores.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <ClipboardList className="size-12 text-muted-foreground/40" />
          <div>
            <p className="font-medium">No chores yet</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Add your first chore to get started
            </p>
          </div>
          <button
            type="button"
            onClick={openCreate}
            className="mt-2 flex h-10 items-center gap-1.5 rounded-lg px-4 text-sm font-medium text-white"
            style={{ backgroundColor: COLOR }}
          >
            <Plus className="size-4" />
            Add chore
          </button>
        </div>
      )}

      {/* Incomplete chores */}
      {incomplete.length > 0 && (
        <div className="space-y-2">
          {incomplete.map((chore) => (
            <ChoreRow
              key={chore.id}
              chore={chore}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onComplete={() => setPendingCompleteId(chore.id)}
              onEdit={() => openEdit(chore)}
              completing={completeMutation.isPending && completeMutation.variables === chore.id}
            />
          ))}
        </div>
      )}

      {/* Completed section */}
      {complete.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setCompletedExpanded((v) => !v)}
            className="flex w-full items-center justify-between py-2 text-sm font-medium text-muted-foreground"
          >
            <span>Completed today ({complete.length})</span>
            {completedExpanded ? (
              <ChevronUp className="size-4" />
            ) : (
              <ChevronDown className="size-4" />
            )}
          </button>

          {completedExpanded && (
            <div className="mt-1 space-y-2">
              {complete.map((chore) => (
                <ChoreRow
                  key={chore.id}
                  chore={chore}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                  onComplete={() => uncheckMutation.mutate(chore.id)}
                  onEdit={() => openEdit(chore)}
                  completing={uncheckMutation.isPending && uncheckMutation.variables === chore.id}
                  done
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* FAB */}
      {allChores.length > 0 && (
        <button
          type="button"
          onClick={openCreate}
          className="fixed bottom-20 right-4 z-30 flex h-14 w-14 items-center justify-center rounded-2xl shadow-lg md:bottom-6"
          style={{ backgroundColor: COLOR }}
          aria-label="Add chore"
        >
          <Plus className="size-6 text-white" />
        </button>
      )}

      {/* Complete confirmation dialog */}
      <Dialog
        open={!!pendingCompleteId}
        onOpenChange={(v) => !v && setPendingCompleteId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark chore complete?</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            {allChores.find((c) => c.id === pendingCompleteId)?.title}
          </p>
          <DialogFooter className="mt-2 gap-2">
            <button
              type="button"
              onClick={() => setPendingCompleteId(null)}
              className="flex h-11 flex-1 items-center justify-center rounded-lg border border-border text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                if (pendingCompleteId) {
                  completeMutation.mutate(pendingCompleteId);
                  setPendingCompleteId(null);
                }
              }}
              className="flex h-11 flex-1 items-center justify-center rounded-lg text-sm font-semibold text-white"
              style={{ backgroundColor: COLOR }}
            >
              Mark complete
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sheets */}
      <ChoreSheet
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        chore={editingChore}
        members={members}
        isAdmin={isAdmin}
      />
      <LeaderboardSheet
        open={leaderboardOpen}
        onClose={() => setLeaderboardOpen(false)}
      />
    </div>
  );
}

// ---- ChoreRow sub-component -------------------------------------------------

function ChoreRow({
  chore,
  currentUserId,
  isAdmin,
  onComplete,
  onEdit,
  completing,
  done = false,
}: {
  chore: ChoreRow;
  currentUserId: string;
  isAdmin: boolean;
  onComplete: () => void;
  onEdit: () => void;
  completing: boolean;
  done?: boolean;
}) {
  const isOverdue =
    !done &&
    chore.next_due_at != null &&
    isPast(new Date(chore.next_due_at));

  const canEdit = isAdmin || chore.created_by === currentUserId;

  return (
    <div
      className={`flex min-h-16 items-center gap-3 rounded-xl border border-border bg-card px-3 py-2 transition-opacity ${
        done ? "opacity-60" : ""
      }`}
    >
      {/* Complete button */}
      <button
        type="button"
        onClick={onComplete}
        disabled={completing}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
        aria-label={done ? "Unmark complete" : "Mark complete"}
      >
        <CheckCircle2
          className="size-7 transition-colors"
          style={{ color: done ? COLOR : "var(--muted-foreground)" }}
          strokeWidth={done ? 2.5 : 1.5}
        />
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <p
          className={`text-[15px] font-medium leading-tight ${
            done ? "line-through text-muted-foreground" : ""
          }`}
        >
          {chore.title}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {/* Frequency badge */}
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-medium"
            style={{
              backgroundColor: COLOR + "18",
              color: COLOR,
            }}
          >
            {frequencyLabel(chore.frequency)}
          </span>

          {/* Assignee */}
          {chore.assignee_name && chore.assigned_to !== currentUserId && (
            <span className="text-xs text-muted-foreground">
              {chore.assignee_name}
            </span>
          )}

          {/* Overdue badge */}
          {isOverdue && (
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[11px] font-medium text-red-600 dark:bg-red-900/30 dark:text-red-400">
              Overdue
            </span>
          )}
        </div>
      </div>

      {/* Right side */}
      <div className="flex shrink-0 items-center gap-1">
        {/* Assignee avatar */}
        {chore.assignee_name && (
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-semibold text-white"
            style={{ background: chore.assignee_avatar ?? "#6366f1" }}
          >
            {initials(chore.assignee_name)}
          </div>
        )}

        {/* Edit button */}
        {canEdit && !done && (
          <button
            type="button"
            onClick={onEdit}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent transition-colors"
          >
            <Pencil className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
