"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/auth/client";
import { toast } from "sonner";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ClipboardList,
  Filter,
  MoreHorizontal,
  Plus,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { isToday, isTomorrow, isPast, format, differenceInCalendarDays } from "date-fns";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import SectionColorBadge from "@/components/shared/SectionColorBadge";
import MemberAvatar from "@/components/shared/MemberAvatar";
import EmptyState from "@/components/shared/EmptyState";
import ErrorState from "@/components/shared/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import TaskSheet, { type TaskData, type Member } from "@/components/tasks/TaskSheet";
import { SECTION_COLORS } from "@/lib/constants/colors";
import { PageContainer } from "@/components/layout/PageContainer";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import UpgradePrompt from "@/components/shared/UpgradePrompt";

const COLOR = SECTION_COLORS.tasks; // #EC4899

// ---- Types ------------------------------------------------------------------

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  assignee_name: string | null;
  assignee_avatar: string | null;
  due_date: string | null;
  priority: string;
  completed: boolean;
  completed_by: string | null;
  completed_at: string | null;
  created_by: string;
  created_at: string | null;
}

interface TasksResponse {
  tasks: TaskRow[];
}

interface MembersResponse {
  household: { id: string; name: string };
  members: Member[];
}

type FilterKey = "all" | "mine" | "assigned" | "completed";

// ---- Helpers ----------------------------------------------------------------

function formatDueDate(dateStr: string): { label: string; overdue: boolean } {
  const d = new Date(dateStr);
  if (isPast(d) && !isToday(d)) {
    const days = Math.abs(differenceInCalendarDays(d, new Date()));
    return {
      label: days === 1 ? "Yesterday" : `${days}d overdue`,
      overdue: true,
    };
  }
  if (isToday(d)) return { label: "Today", overdue: false };
  if (isTomorrow(d)) return { label: "Tomorrow", overdue: false };
  const days = differenceInCalendarDays(d, new Date());
  if (days <= 6) return { label: `In ${days} days`, overdue: false };
  return { label: format(d, "EEE MMM d"), overdue: false };
}

function priorityColor(priority: string): string {
  if (priority === "high") return "#EF4444";
  if (priority === "medium") return "#F59E0B";
  return "var(--roost-text-muted)";
}

function firstName(name: string | null): string {
  if (!name) return "Unassigned";
  return name.split(" ")[0];
}

// ---- More menu --------------------------------------------------------------

function TaskMoreMenu({
  task,
  canDelete,
  onEdit,
  onDelete,
}: {
  task: TaskRow;
  canDelete: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  function action(fn: () => void) {
    setOpen(false);
    fn();
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ color: "var(--roost-text-muted)" }}
        aria-label="More options"
      >
        <MoreHorizontal className="size-5" />
      </button>

      <AnimatePresence>
        {open && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.1 }}
              className="absolute right-0 top-full z-50 mt-1 min-w-40 overflow-hidden rounded-2xl py-1"
              style={{
                backgroundColor: "var(--roost-surface)",
                border: "1.5px solid var(--roost-border)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              }}
            >
              <button
                type="button"
                onClick={() => action(onEdit)}
                className="flex h-11 w-full items-center px-4 text-sm"
                style={{ color: "var(--roost-text-primary)", fontWeight: 600 }}
              >
                Edit
              </button>
              {canDelete && (
                <button
                  type="button"
                  onClick={() => action(onDelete)}
                  className="flex h-11 w-full items-center px-4 text-sm"
                  style={{ color: "#EF4444", fontWeight: 600 }}
                >
                  Delete
                </button>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---- Task row ---------------------------------------------------------------

function TaskRow({
  task,
  currentUserId,
  isAdmin,
  onComplete,
  onUncheck,
  onEdit,
  onDelete,
  completing,
}: {
  task: TaskRow;
  currentUserId: string;
  isAdmin: boolean;
  onComplete: (id: string) => void;
  onUncheck: (id: string) => void;
  onEdit: () => void;
  onDelete: () => void;
  completing: boolean;
}) {
  const canDelete = isAdmin || task.created_by === currentUserId;

  return (
    <div
      className="flex min-h-16 items-center gap-2 rounded-2xl px-3 py-2"
      style={{
        backgroundColor: "var(--roost-surface)",
        border: "1.5px solid var(--roost-border)",
        borderBottom: "4px solid var(--roost-border-bottom)",
        opacity: task.completed ? 0.65 : 1,
        transition: "opacity 0.15s",
      }}
    >
      {/* Complete circle (48px touch target) */}
      <button
        type="button"
        onClick={() => task.completed ? onUncheck(task.id) : onComplete(task.id)}
        disabled={completing}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full"
        aria-label={task.completed ? "Unmark complete" : "Mark complete"}
      >
        <motion.div
          animate={task.completed ? { scale: [0.8, 1.1, 1] } : { scale: 1 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
        >
          {task.completed ? (
            <div
              className="flex h-7 w-7 items-center justify-center rounded-full"
              style={{ backgroundColor: COLOR }}
            >
              <Check className="size-4 text-white" strokeWidth={3} />
            </div>
          ) : (
            <div
              className="h-7 w-7 rounded-full border-2"
              style={{ borderColor: COLOR + "60" }}
            />
          )}
        </motion.div>
      </button>

      {/* Content */}
      <div className="min-w-0 flex-1 py-1">
        <p
          className="text-sm leading-tight"
          style={{
            color: task.completed ? "var(--roost-text-muted)" : "var(--roost-text-primary)",
            fontWeight: 700,
            textDecoration: task.completed ? "line-through" : undefined,
          }}
        >
          {task.title}
        </p>

        {/* Meta row */}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {/* Priority badge */}
          <SectionColorBadge
            label={task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
            color={priorityColor(task.priority)}
          />

          {/* Due date */}
          {task.due_date && (() => {
            const { label, overdue } = formatDueDate(task.due_date);
            return (
              <span
                className="flex items-center gap-0.5 text-xs"
                style={{
                  color: overdue ? "#EF4444" : "var(--roost-text-muted)",
                  fontWeight: 600,
                }}
              >
                {overdue && <AlertCircle className="size-3" />}
                {label}
              </span>
            );
          })()}

          {/* Assignee */}
          {task.assignee_name ? (
            <div className="flex items-center gap-1">
              <MemberAvatar
                name={task.assignee_name}
                avatarColor={task.assignee_avatar}
                size="sm"
              />
              <span className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                {firstName(task.assignee_name)}
              </span>
            </div>
          ) : (
            <span className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
              Unassigned
            </span>
          )}
        </div>
      </div>

      {/* More menu */}
      <TaskMoreMenu
        task={task}
        canDelete={canDelete}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </div>
  );
}

// ---- Section header ---------------------------------------------------------

function SectionHeader({
  label,
  count,
  expanded,
  onToggle,
  labelColor,
}: {
  label: string;
  count: number;
  expanded: boolean;
  onToggle: () => void;
  labelColor?: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full items-center justify-between py-2"
    >
      <span
        className="text-sm"
        style={{
          color: labelColor ?? "var(--roost-text-muted)",
          fontWeight: 700,
        }}
      >
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <span
          className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] text-white"
          style={{ backgroundColor: labelColor ?? "var(--roost-text-muted)", fontWeight: 700 }}
        >
          {count}
        </span>
        <ChevronDown
          className="size-4 transition-transform"
          style={{
            color: "var(--roost-text-muted)",
            transform: expanded ? "rotate(0deg)" : "rotate(-90deg)",
          }}
        />
      </div>
    </button>
  );
}

// ---- Page -------------------------------------------------------------------

export default function TasksPage() {
  const { data: sessionData } = useSession();
  const currentUserId = sessionData?.user?.id ?? "";
  const queryClient = useQueryClient();

  const [filter, setFilter] = useState<FilterKey>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskData | null>(null);
  const [pendingCompleteId, setPendingCompleteId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [upgradeCode, setUpgradeCode] = useState<string | null>(null);

  // Section collapse state
  const [overdueExpanded, setOverdueExpanded] = useState(true);
  const [todayExpanded, setTodayExpanded] = useState(true);
  const [upcomingExpanded, setUpcomingExpanded] = useState(true);
  const [noDueDateExpanded, setNoDueDateExpanded] = useState(true);
  const [completedExpanded, setCompletedExpanded] = useState(false);

  // ---- Queries ---------------------------------------------------------------

  const {
    data: tasksData,
    isLoading: tasksLoading,
    isError: tasksError,
    refetch: refetchTasks,
  } = useQuery<TasksResponse>({
    queryKey: ["tasks"],
    queryFn: async () => {
      const r = await fetch("/api/tasks");
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to load tasks");
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
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to load members");
      }
      return r.json();
    },
    staleTime: 10_000,
    retry: 2,
  });

  // ---- Mutations -------------------------------------------------------------

  const completeMutation = useMutation({
    mutationFn: (taskId: string) =>
      fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: true }),
      }).then(async (r) => {
        if (!r.ok) throw new Error("Failed to complete task");
        return r.json();
      }),
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const previous = queryClient.getQueryData<TasksResponse>(["tasks"]);
      queryClient.setQueryData<TasksResponse>(["tasks"], (old) =>
        old
          ? {
              ...old,
              tasks: old.tasks.map((t) =>
                t.id === taskId
                  ? { ...t, completed: true, completed_at: new Date().toISOString() }
                  : t
              ),
            }
          : old
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["tasks"], ctx.previous);
      toast.error("Could not complete task", { description: "Something went wrong. Try again." });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const uncheckMutation = useMutation({
    mutationFn: (taskId: string) =>
      fetch(`/api/tasks/${taskId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed: false }),
      }).then(async (r) => {
        if (!r.ok) throw new Error("Failed to uncheck task");
        return r.json();
      }),
    onMutate: async (taskId) => {
      await queryClient.cancelQueries({ queryKey: ["tasks"] });
      const previous = queryClient.getQueryData<TasksResponse>(["tasks"]);
      queryClient.setQueryData<TasksResponse>(["tasks"], (old) =>
        old
          ? {
              ...old,
              tasks: old.tasks.map((t) =>
                t.id === taskId
                  ? { ...t, completed: false, completed_at: null }
                  : t
              ),
            }
          : old
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(["tasks"], ctx.previous);
      toast.error("Could not uncheck task", { description: "Something went wrong. Try again." });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["tasks"] }),
    onSuccess: (_data, taskId) => {
      toast("Task unmarked", {
        action: { label: "Undo", onClick: () => completeMutation.mutate(taskId) },
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (taskId: string) =>
      fetch(`/api/tasks/${taskId}`, { method: "DELETE" }).then(async (r) => {
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error ?? "Failed to delete task");
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
      toast.success("Task deleted");
      setPendingDeleteId(null);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ---- Derived data ----------------------------------------------------------

  const allTasks = tasksData?.tasks ?? [];
  const members = membersData?.members ?? [];
  const currentMember = members.find((m) => m.userId === currentUserId);
  const isAdmin = currentMember?.role === "admin";

  const incompleteTasks = allTasks.filter((t) => !t.completed);
  const completedTasks = allTasks.filter((t) => t.completed);

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const todayEnd = new Date(todayStart.getTime() + 86_400_000);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 86_400_000);

  // Stats
  const overdueCount = incompleteTasks.filter(
    (t) => t.due_date && new Date(t.due_date) < todayStart
  ).length;
  const dueTodayCount = incompleteTasks.filter(
    (t) => t.due_date && isToday(new Date(t.due_date))
  ).length;
  const completedThisWeekCount = completedTasks.filter(
    (t) => t.completed_at && new Date(t.completed_at) >= sevenDaysAgo
  ).length;

  // Filter
  const filterIsActive = filter !== "all";

  let visibleTasks: TaskRow[];
  if (filter === "completed") {
    visibleTasks = completedTasks;
  } else {
    let base = incompleteTasks;
    if (filter === "mine") {
      base = base.filter((t) => t.assigned_to === currentUserId);
    } else if (filter === "assigned") {
      base = base.filter(
        (t) => t.assigned_to && t.assigned_to !== currentUserId && t.created_by === currentUserId
      );
    }
    visibleTasks = base;
  }

  // Group incomplete into sections (for all/mine/assigned filters)
  const showGroups = filter !== "completed";
  const groupedTasks = showGroups
    ? {
        overdue: visibleTasks.filter(
          (t) => t.due_date && new Date(t.due_date) < todayStart
        ),
        today: visibleTasks.filter(
          (t) => t.due_date && isToday(new Date(t.due_date))
        ),
        upcoming: visibleTasks.filter(
          (t) => t.due_date && new Date(t.due_date) >= todayEnd
        ),
        noDueDate: visibleTasks.filter((t) => !t.due_date),
      }
    : null;

  // Handlers
  function openCreate() {
    setEditingTask(null);
    setSheetOpen(true);
  }

  function openEdit(task: TaskRow) {
    setEditingTask({
      id: task.id,
      title: task.title,
      description: task.description,
      assigned_to: task.assigned_to,
      due_date: task.due_date,
      priority: task.priority,
      created_by: task.created_by,
    });
    setSheetOpen(true);
  }

  function renderTaskList(taskList: TaskRow[]) {
    return (
      <div className="space-y-2">
        {taskList.map((task, i) => (
          <motion.div
            key={task.id}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.04, 0.2), duration: 0.15 }}
          >
            <TaskRow
              task={task}
              currentUserId={currentUserId}
              isAdmin={isAdmin}
              onComplete={(id) => setPendingCompleteId(id)}
              onUncheck={(id) => uncheckMutation.mutate(id)}
              onEdit={() => openEdit(task)}
              onDelete={() => setPendingDeleteId(task.id)}
              completing={
                completeMutation.isPending && completeMutation.variables === task.id
              }
            />
          </motion.div>
        ))}
      </div>
    );
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
        title="Tasks"
        badge={incompleteTasks.length}
        action={
          <motion.button
            type="button"
            onClick={openCreate}
            whileTap={{ y: 1 }}
            className="flex h-10 w-10 items-center justify-center rounded-xl"
            style={{
              backgroundColor: COLOR,
              border: `1.5px solid ${COLOR}`,
              borderBottom: "3px solid #B02878",
            }}
            aria-label="Add task"
          >
            <Plus className="size-4 text-white" />
          </motion.button>
        }
      />

      {/* Filter row */}
      <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-none">
        {(["all", "mine", "assigned", "completed"] as FilterKey[]).map((f) => {
          const active = filter === f;
          const labels: Record<FilterKey, string> = {
            all: "All",
            mine: "Mine",
            assigned: "Assigned",
            completed: "Completed",
          };
          return (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className="flex h-9 shrink-0 items-center rounded-xl px-4 text-sm"
              style={{
                backgroundColor: active ? "var(--roost-text-primary)" : "var(--roost-surface)",
                border: "1.5px solid var(--roost-border)",
                borderBottom: "3px solid var(--roost-border-bottom)",
                color: active ? "var(--roost-bg)" : "var(--roost-text-secondary)",
                fontWeight: active ? 800 : 600,
              }}
            >
              {labels[f]}
            </button>
          );
        })}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2">
        <StatCard value={overdueCount} label="Overdue" color={overdueCount > 0 ? "#EF4444" : undefined} />
        <StatCard value={dueTodayCount} label="Due today" color={dueTodayCount > 0 ? COLOR : undefined} />
        <StatCard value={completedThisWeekCount} label="Done this week" />
      </div>

      {/* Loading */}
      {tasksLoading && (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 rounded-2xl" />
          ))}
        </div>
      )}

      {/* Error */}
      {tasksError && !tasksLoading && (
        <ErrorState onRetry={refetchTasks} />
      )}

      {/* Empty: no tasks at all */}
      {!tasksLoading && !tasksError && allTasks.length === 0 && (
        <EmptyState
          icon={ClipboardList}
          title="Nothing on your plate."
          body="Enjoy it while it lasts. Add a task when something comes up."
          buttonLabel="Add a task"
          onButtonClick={openCreate}
          color={COLOR}
        />
      )}

      {/* Empty: filter has no results */}
      {!tasksLoading && !tasksError && allTasks.length > 0 && visibleTasks.length === 0 && (
        <EmptyState
          icon={Filter}
          title="No tasks here."
          body="Try a different filter."
          color="#94A3B8"
        />
      )}

      {/* Task groups (all/mine/assigned filters) */}
      {!tasksLoading && !tasksError && showGroups && groupedTasks && visibleTasks.length > 0 && (
        <div className="space-y-1">
          {/* Overdue */}
          {groupedTasks.overdue.length > 0 && (
            <div>
              <SectionHeader
                label="Overdue"
                count={groupedTasks.overdue.length}
                expanded={overdueExpanded}
                onToggle={() => setOverdueExpanded((v) => !v)}
                labelColor="#EF4444"
              />
              <AnimatePresence initial={false}>
                {overdueExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="pb-2">
                      {renderTaskList(groupedTasks.overdue)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Today */}
          {groupedTasks.today.length > 0 && (
            <div>
              <SectionHeader
                label="Due today"
                count={groupedTasks.today.length}
                expanded={todayExpanded}
                onToggle={() => setTodayExpanded((v) => !v)}
                labelColor={COLOR}
              />
              <AnimatePresence initial={false}>
                {todayExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="pb-2">
                      {renderTaskList(groupedTasks.today)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Upcoming */}
          {groupedTasks.upcoming.length > 0 && (
            <div>
              <SectionHeader
                label="Upcoming"
                count={groupedTasks.upcoming.length}
                expanded={upcomingExpanded}
                onToggle={() => setUpcomingExpanded((v) => !v)}
              />
              <AnimatePresence initial={false}>
                {upcomingExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="pb-2">
                      {renderTaskList(groupedTasks.upcoming)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* No due date */}
          {groupedTasks.noDueDate.length > 0 && (
            <div>
              <SectionHeader
                label="No due date"
                count={groupedTasks.noDueDate.length}
                expanded={noDueDateExpanded}
                onToggle={() => setNoDueDateExpanded((v) => !v)}
              />
              <AnimatePresence initial={false}>
                {noDueDateExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="pb-2">
                      {renderTaskList(groupedTasks.noDueDate)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Completed (collapsed by default) */}
          {completedTasks.length > 0 && (
            <div>
              <SectionHeader
                label="Completed"
                count={completedTasks.length}
                expanded={completedExpanded}
                onToggle={() => setCompletedExpanded((v) => !v)}
              />
              <AnimatePresence initial={false}>
                {completedExpanded && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.15 }}
                    className="overflow-hidden"
                  >
                    <div className="pb-2">
                      {renderTaskList(completedTasks)}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      )}

      {/* Completed filter view */}
      {!tasksLoading && !tasksError && filter === "completed" && visibleTasks.length > 0 && (
        renderTaskList(visibleTasks)
      )}

      {/* Confirm complete dialog */}
      <Dialog open={!!pendingCompleteId} onOpenChange={(v) => !v && setPendingCompleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
              Mark as complete?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
            {allTasks.find((t) => t.id === pendingCompleteId)?.title}
          </p>
          <DialogFooter className="mt-2 gap-2">
            <button
              type="button"
              onClick={() => setPendingCompleteId(null)}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm"
              style={{
                border: "1.5px solid var(--roost-border)",
                borderBottom: "3px solid var(--roost-border-bottom)",
                color: "var(--roost-text-primary)",
                fontWeight: 700,
              }}
            >
              Cancel
            </button>
            <motion.button
              type="button"
              whileTap={{ y: 1 }}
              onClick={() => {
                if (pendingCompleteId) {
                  completeMutation.mutate(pendingCompleteId);
                  setPendingCompleteId(null);
                }
              }}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm text-white"
              style={{
                backgroundColor: COLOR,
                border: `1.5px solid ${COLOR}`,
                borderBottom: "3px solid #B02878",
                fontWeight: 800,
              }}
            >
              Mark complete
            </motion.button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirm delete dialog */}
      <Dialog open={!!pendingDeleteId} onOpenChange={(v) => !v && setPendingDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
              Delete task?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
            {allTasks.find((t) => t.id === pendingDeleteId)?.title}
          </p>
          <DialogFooter className="mt-2 gap-2">
            <button
              type="button"
              onClick={() => setPendingDeleteId(null)}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm"
              style={{
                border: "1.5px solid var(--roost-border)",
                borderBottom: "3px solid var(--roost-border-bottom)",
                color: "var(--roost-text-primary)",
                fontWeight: 700,
              }}
            >
              Cancel
            </button>
            <motion.button
              type="button"
              whileTap={{ y: 1 }}
              onClick={() => {
                if (pendingDeleteId) deleteMutation.mutate(pendingDeleteId);
              }}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm text-white"
              style={{
                backgroundColor: "#EF4444",
                border: "1.5px solid #C93B3B",
                borderBottom: "3px solid #A63030",
                fontWeight: 800,
              }}
            >
              Delete
            </motion.button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Task sheet */}
      <TaskSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditingTask(null); }}
        task={editingTask}
        householdMembers={members}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        onUpgradeRequired={(code) => { setSheetOpen(false); setUpgradeCode(code); }}
      />

      {/* Upgrade prompt sheet */}
      <Sheet open={!!upgradeCode} onOpenChange={(v) => !v && setUpgradeCode(null)}>
        <SheetContent side="bottom" className="rounded-t-2xl px-4 pb-10 pt-6" style={{ backgroundColor: "var(--roost-bg)" }}>
          <div className="mx-auto mb-6 h-1 w-10 rounded-full" style={{ backgroundColor: "#EC4899" }} />
          <UpgradePrompt code={upgradeCode ?? ""} onDismiss={() => setUpgradeCode(null)} />
        </SheetContent>
      </Sheet>
      </PageContainer>
    </motion.div>
  );
}
