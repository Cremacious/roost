'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSession } from '@/lib/auth/client';
import { useHousehold } from '@/lib/hooks/useHousehold';
import { toast } from 'sonner';
import {
  AlertCircle,
  Bell,
  Check,
  ChevronDown,
  Clock,
  Home,
  MoreHorizontal,
  Plus,
  RefreshCw,
  RotateCcw,
  User,
  Users,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  isToday,
  isTomorrow,
  isPast,
  format,
  differenceInCalendarDays,
  addDays,
  addMonths,
} from 'date-fns';
import PageHeader from '@/components/shared/PageHeader';
import StatCard from '@/components/shared/StatCard';
import SectionColorBadge from '@/components/shared/SectionColorBadge';
import EmptyState from '@/components/shared/EmptyState';
import ErrorState from '@/components/shared/ErrorState';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import ReminderSheet, {
  type ReminderData,
  type Member,
} from '@/components/reminders/ReminderSheet';
import PremiumGate from '@/components/shared/PremiumGate';
import { SECTION_COLORS } from '@/lib/constants/colors';
import { PageContainer } from '@/components/layout/PageContainer';

const COLOR = SECTION_COLORS.reminders; // #06B6D4
const COLOR_DARK = '#0891B2';

// ---- Types ------------------------------------------------------------------

interface ReminderRow extends ReminderData {
  creator_name: string | null;
  creator_avatar: string | null;
  created_at: string | null;
}

interface RemindersResponse {
  reminders: ReminderRow[];
}

interface MembersResponse {
  household: { id: string; name: string };
  members: Member[];
}

type FilterKey = 'all' | 'mine' | 'household' | 'completed';

// ---- Helpers ----------------------------------------------------------------

function isSnoozed(r: ReminderRow): boolean {
  return (
    !r.completed && !!r.snoozed_until && new Date(r.snoozed_until) > new Date()
  );
}

function formatRemindAt(dateStr: string): { label: string; overdue: boolean } {
  const d = new Date(dateStr);
  const overdue = isPast(d) && !isToday(d);
  if (overdue) return { label: 'Overdue', overdue: true };
  if (isToday(d))
    return { label: `Today at ${format(d, 'h:mm a')}`, overdue: false };
  if (isTomorrow(d))
    return { label: `Tomorrow at ${format(d, 'h:mm a')}`, overdue: false };
  return { label: format(d, "EEE MMM d 'at' h:mm a"), overdue: false };
}

function formatResetsIn(snoozedUntil: string): string {
  const d = new Date(snoozedUntil);
  if (isToday(d)) return 'Resets today';
  if (isTomorrow(d)) return 'Resets tomorrow';
  const days = differenceInCalendarDays(d, new Date());
  if (days <= 6) return `Resets in ${days} day${days === 1 ? '' : 's'}`;
  return `Resets ${format(d, 'EEE MMM d')}`;
}

function calcNextSnoozeDate(r: ReminderRow): Date {
  // Use Math.max(next_remind_at, now) so overdue reminders always produce a future date
  const raw = r.next_remind_at ? new Date(r.next_remind_at) : new Date();
  const base = new Date(Math.max(raw.getTime(), Date.now()));
  switch (r.frequency) {
    case 'daily':
      return addDays(base, 1);
    case 'weekly':
      return addDays(base, 7);
    case 'monthly':
      return addMonths(base, 1);
    case 'custom': {
      let customDays: number[] = [];
      try {
        customDays = r.custom_days
          ? (JSON.parse(r.custom_days) as number[])
          : [];
      } catch {
        /* */
      }
      for (let i = 1; i <= 7; i++) {
        const candidate = addDays(base, i);
        if (customDays.includes(candidate.getDay())) return candidate;
      }
      return addDays(base, 1);
    }
    default:
      return addDays(base, 1);
  }
}

function calcNextOccurrenceLabel(r: ReminderRow): string {
  return format(calcNextSnoozeDate(r), 'EEEE, MMMM d');
}

function freqLabel(freq: string): string {
  switch (freq) {
    case 'once':
      return 'Once';
    case 'daily':
      return 'Daily';
    case 'weekly':
      return 'Weekly';
    case 'monthly':
      return 'Monthly';
    case 'custom':
      return 'Custom';
    default:
      return freq;
  }
}

// ---- Loading skeleton -------------------------------------------------------

function RemindersSkeleton() {
  return (
    <div className="space-y-2">
      {[72, 72, 64, 72, 64].map((h, i) => (
        <Skeleton
          key={i}
          className="w-full rounded-2xl"
          style={{ height: h }}
        />
      ))}
    </div>
  );
}

// ---- More menu --------------------------------------------------------------

function ReminderMoreMenu({
  canManage,
  onEdit,
  onDelete,
}: {
  canManage: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);

  if (!canManage) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="flex h-12 w-12 items-center justify-center rounded-xl shrink-0"
        style={{ color: 'var(--roost-text-muted)' }}
        aria-label="More options"
      >
        <MoreHorizontal className="size-5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-xl py-1"
            style={{
              backgroundColor: 'var(--roost-surface)',
              border: '1.5px solid var(--roost-border)',
              borderBottom: '3px solid #E5E7EB',
              boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
            }}
          >
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onEdit();
              }}
              className="flex w-full items-center px-4 py-2.5 text-sm"
              style={{ color: 'var(--roost-text-primary)', fontWeight: 700 }}
            >
              Edit
            </button>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                onDelete();
              }}
              className="flex w-full items-center px-4 py-2.5 text-sm"
              style={{ color: '#EF4444', fontWeight: 700 }}
            >
              Delete
            </button>
          </div>
        </>
      )}
    </div>
  );
}

// ---- Reminder row -----------------------------------------------------------

function ReminderRow({
  reminder,
  index,
  currentUserId,
  isAdmin,
  onEdit,
  onDelete,
  onComplete,
  onUnsnooze,
}: {
  reminder: ReminderRow;
  index: number;
  currentUserId: string;
  isAdmin: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onComplete: () => void;
  onUnsnooze: () => void;
}) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const snoozed = isSnoozed(reminder);
  const { label: dateLabel, overdue } = formatRemindAt(
    reminder.next_remind_at ?? reminder.remind_at,
  );
  const canManage = reminder.created_by === currentUserId || isAdmin;
  const isRecurring = reminder.frequency !== 'once';

  function handleCircleClick(e: React.MouseEvent) {
    e.stopPropagation();
    if (reminder.completed || snoozed) return; // snoozed rows use Undo button instead
    setConfirmOpen(true);
  }

  // ---- Snoozed (recurring, waiting for next occurrence) ---------------------
  if (snoozed) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.04, 0.2), duration: 0.15 }}
        className="flex items-center gap-3 rounded-2xl px-3 py-3"
        style={{
          backgroundColor: 'var(--roost-bg)',
          border: '1.5px solid var(--roost-border)',
          borderBottom: '4px solid #0891B2',
          minHeight: 64,
        }}
      >
        {/* Clock circle */}
        <div className="flex h-12 w-12 shrink-0 items-center justify-center">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full"
            style={{ backgroundColor: COLOR, border: `2px solid ${COLOR}` }}
          >
            <Clock className="size-3.5 text-white" strokeWidth={2.5} />
          </div>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p
            className="text-sm leading-snug"
            style={{ color: 'var(--roost-text-secondary)', fontWeight: 700 }}
          >
            {reminder.title}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <SectionColorBadge
              label={freqLabel(reminder.frequency)}
              color={COLOR}
            />
            {reminder.snoozed_until && (
              <span
                className="flex items-center gap-1 text-xs"
                style={{ color: 'var(--roost-text-muted)', fontWeight: 600 }}
              >
                <RotateCcw className="size-3" />
                {formatResetsIn(reminder.snoozed_until)}
              </span>
            )}
          </div>
        </div>

        {/* Undo button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onUnsnooze();
          }}
          className="shrink-0 text-sm px-2 py-1"
          style={{ color: COLOR, fontWeight: 700 }}
        >
          Undo
        </button>
      </motion.div>
    );
  }

  // ---- Normal active / completed row ----------------------------------------
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(index * 0.04, 0.2), duration: 0.15 }}
        className="flex items-center gap-3 rounded-2xl px-3 py-3"
        style={{
          backgroundColor: 'var(--roost-surface)',
          border: '1.5px solid var(--roost-border)',
          borderBottom: overdue
            ? '4px solid #EF444460'
            : `4px solid ${COLOR}30`,
          minHeight: 64,
          opacity: reminder.completed ? 0.65 : 1,
        }}
      >
        {/* Completion circle */}
        <button
          type="button"
          onClick={handleCircleClick}
          className="flex h-12 w-12 shrink-0 items-center justify-center"
          aria-label={reminder.completed ? 'Done' : 'Mark done'}
        >
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full transition-colors"
            style={{
              backgroundColor: reminder.completed ? COLOR : 'transparent',
              border: `2px solid ${reminder.completed ? COLOR : overdue ? '#EF4444' : COLOR}`,
            }}
          >
            {reminder.completed && (
              <Check className="size-3.5 text-white" strokeWidth={3} />
            )}
          </div>
        </button>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <p
            className="text-sm leading-snug"
            style={{
              color: 'var(--roost-text-primary)',
              fontWeight: 700,
              textDecoration: reminder.completed ? 'line-through' : 'none',
            }}
          >
            {reminder.title}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <SectionColorBadge
              label={freqLabel(reminder.frequency)}
              color={COLOR}
            />
            {isRecurring && (
              <RefreshCw className="size-3" style={{ color: COLOR }} />
            )}
            <span
              className="flex items-center gap-1 text-xs"
              style={{
                color: overdue ? '#EF4444' : 'var(--roost-text-muted)',
                fontWeight: 600,
              }}
            >
              {overdue && <AlertCircle className="size-3" />}
              {dateLabel}
            </span>
            {reminder.notify_type === 'self' && (
              <User
                className="size-3"
                style={{ color: 'var(--roost-text-muted)' }}
              />
            )}
            {reminder.notify_type === 'specific' && (
              <Users
                className="size-3"
                style={{ color: 'var(--roost-text-muted)' }}
              />
            )}
            {reminder.notify_type === 'household' && (
              <Home
                className="size-3"
                style={{ color: 'var(--roost-text-muted)' }}
              />
            )}
          </div>
        </div>

        {/* Right side: more menu (active) or nothing (completed) */}
        {!reminder.completed && (
          <ReminderMoreMenu
            canManage={canManage}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )}
      </motion.div>

      {/* Confirmation dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle
              style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}
            >
              {isRecurring ? 'Done for now?' : 'Mark as done?'}
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="sr-only">
            {isRecurring
              ? 'Confirm that this recurring reminder should be marked done for now.'
              : 'Confirm that this reminder should be marked done.'}
          </DialogDescription>
          {isRecurring ? (
            <div className="space-y-2">
              <p
                className="text-sm"
                style={{
                  color: 'var(--roost-text-secondary)',
                  fontWeight: 600,
                }}
              >
                This is a recurring reminder. Marking it complete will snooze it
                until the next occurrence.
              </p>
              <p
                className="text-sm"
                style={{ color: 'var(--roost-text-muted)', fontWeight: 600 }}
              >
                It will return on {calcNextOccurrenceLabel(reminder)}.
              </p>
            </div>
          ) : (
            <p
              className="text-sm"
              style={{ color: 'var(--roost-text-secondary)', fontWeight: 600 }}
            >
              {reminder.title}
            </p>
          )}
          <DialogFooter className="mt-2 gap-2">
            <button
              type="button"
              onClick={() => setConfirmOpen(false)}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm"
              style={{
                border: '1.5px solid #E5E7EB',
                borderBottom: '3px solid #E5E7EB',
                color: 'var(--roost-text-primary)',
                fontWeight: 700,
              }}
            >
              Cancel
            </button>
            <motion.button
              type="button"
              whileTap={{ y: 1 }}
              onClick={() => {
                setConfirmOpen(false);
                onComplete();
              }}
              className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm text-white"
              style={{
                backgroundColor: COLOR,
                border: `1.5px solid ${COLOR}`,
                borderBottom: `3px solid ${COLOR_DARK}`,
                fontWeight: 800,
              }}
            >
              {isRecurring ? 'Got it, mark done' : 'Done'}
            </motion.button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ---- Section ----------------------------------------------------------------

function Section({
  title,
  subtitle,
  color,
  count,
  collapsed,
  onToggle,
  children,
}: {
  title: string;
  subtitle?: string;
  color: string;
  count: number;
  collapsed?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
}) {
  if (count === 0) return null;

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-2"
        disabled={!onToggle}
      >
        <div className="flex flex-col items-start gap-0.5">
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color, fontWeight: 800 }}>
              {title}
            </span>
            <span
              className="rounded-full px-2 py-0.5 text-[10px]"
              style={{ backgroundColor: color + '18', color, fontWeight: 700 }}
            >
              {count}
            </span>
          </div>
          {subtitle && (
            <span
              className="text-[11px]"
              style={{ color: 'var(--roost-text-muted)', fontWeight: 600 }}
            >
              {subtitle}
            </span>
          )}
        </div>
        {onToggle && (
          <ChevronDown
            className="size-3.5 ml-auto mt-0.5 transition-transform"
            style={{
              color: 'var(--roost-text-muted)',
              transform: collapsed ? 'rotate(-90deg)' : 'rotate(0deg)',
            }}
          />
        )}
      </button>
      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---- Page -------------------------------------------------------------------

export default function RemindersPage() {
  const { data: sessionData } = useSession();
  const currentUserId = sessionData?.user?.id ?? '';
  const queryClient = useQueryClient();
  const { isPremium } = useHousehold();

  const [filter, setFilter] = useState<FilterKey>('all');
  const [upgradeCode, setUpgradeCode] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetMode, setSheetMode] = useState<'create' | 'edit'>('create');
  const [selectedReminder, setSelectedReminder] = useState<ReminderRow | null>(
    null,
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [reminderToDelete, setReminderToDelete] = useState<ReminderRow | null>(
    null,
  );
  const [snoozedCollapsed, setSnoozedCollapsed] = useState(true);
  const [completedCollapsed, setCompletedCollapsed] = useState(true);

  // ---- Queries ---------------------------------------------------------------

  const {
    data: remindersData,
    isLoading,
    isError,
    refetch,
  } = useQuery<RemindersResponse>({
    queryKey: ['reminders'],
    queryFn: async () => {
      const r = await fetch('/api/reminders');
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? 'Failed to load reminders');
      }
      return r.json();
    },
    staleTime: 10_000,
    retry: 2,
  });

  const { data: membersData } = useQuery<MembersResponse>({
    queryKey: ['household-members'],
    queryFn: async () => {
      const r = await fetch('/api/household/members');
      if (!r.ok) return { household: null, members: [] };
      return r.json();
    },
    staleTime: 10_000,
    retry: 2,
  });

  // ---- Mutations -------------------------------------------------------------

  const completeMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/reminders/${id}/complete`, {
        method: 'POST',
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? 'Failed to complete reminder');
      }
      return r.json();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['reminders'] });
      const previous = queryClient.getQueryData<RemindersResponse>([
        'reminders',
      ]);
      queryClient.setQueryData<RemindersResponse>(['reminders'], (old) => {
        if (!old) return old;
        return {
          ...old,
          reminders: old.reminders.map((r) => {
            if (r.id !== id) return r;
            if (r.frequency === 'once') {
              return {
                ...r,
                completed: true,
                completed_at: new Date().toISOString(),
              };
            }
            // Recurring: optimistic snooze using the same Math.max(next_remind_at, now) base
            // so overdue reminders always produce a future snoozed_until
            const snoozeUntil = calcNextSnoozeDate(r).toISOString();
            return { ...r, snoozed_until: snoozeUntil };
          }),
        };
      });
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['reminders'], ctx.previous);
      toast.error('Could not complete reminder', {
        description: 'Something went wrong. Try again.',
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  });

  const unsnoozeMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/reminders/${id}/complete`, {
        method: 'DELETE',
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? 'Failed to undo');
      }
      return r.json();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['reminders'] });
      const previous = queryClient.getQueryData<RemindersResponse>([
        'reminders',
      ]);
      queryClient.setQueryData<RemindersResponse>(['reminders'], (old) =>
        old
          ? {
              ...old,
              reminders: old.reminders.map((r) =>
                r.id === id
                  ? {
                      ...r,
                      completed: false,
                      completed_at: null,
                      snoozed_until: null,
                    }
                  : r,
              ),
            }
          : old,
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(['reminders'], ctx.previous);
      toast.error('Could not undo reminder', {
        description: 'Something went wrong. Try again.',
      });
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['reminders'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/reminders/${id}`, { method: 'DELETE' });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? 'Failed to delete reminder');
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reminders'] });
      toast.success('Reminder deleted');
      setDeleteDialogOpen(false);
      setReminderToDelete(null);
    },
    onError: (err: Error) =>
      toast.error(err.message, {
        description: 'Could not delete the reminder. Try again.',
      }),
  });

  // ---- Derived ---------------------------------------------------------------

  const allReminders = remindersData?.reminders ?? [];
  const members = membersData?.members ?? [];
  const currentMember = members.find((m) => m.userId === currentUserId);
  const isAdmin = currentMember?.role === 'admin';
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  // Apply filter
  const filtered = allReminders.filter((r) => {
    if (filter === 'mine') return r.created_by === currentUserId;
    if (filter === 'household') return r.notify_type === 'household';
    if (filter === 'completed') return r.completed;
    return true;
  });

  // Active: not completed, not snoozed
  const active = filtered.filter((r) => !r.completed && !isSnoozed(r));
  const snoozedList = filtered.filter((r) => isSnoozed(r));
  const completedList = filtered.filter((r) => r.completed);

  // Group active into sections
  const overdue = active.filter(
    (r) =>
      r.next_remind_at &&
      isPast(new Date(r.next_remind_at)) &&
      !isToday(new Date(r.next_remind_at)),
  );
  const today = active.filter(
    (r) => r.next_remind_at && isToday(new Date(r.next_remind_at)),
  );
  const thisWeek = active.filter(
    (r) =>
      r.next_remind_at &&
      !isToday(new Date(r.next_remind_at)) &&
      new Date(r.next_remind_at) <= in7Days &&
      !isPast(new Date(r.next_remind_at)),
  );
  const later = active.filter(
    (r) => r.next_remind_at && new Date(r.next_remind_at) > in7Days,
  );

  // Stats — exclude snoozed from "due today"
  const activeDueTodayCount = allReminders.filter(
    (r) =>
      !r.completed &&
      !isSnoozed(r) &&
      r.next_remind_at &&
      isToday(new Date(r.next_remind_at)),
  ).length;
  const activeIn7DaysCount = allReminders.filter(
    (r) =>
      !r.completed &&
      !isSnoozed(r) &&
      r.next_remind_at &&
      new Date(r.next_remind_at) <= in7Days,
  ).length;
  const recurringCount = allReminders.filter(
    (r) => !r.completed && r.frequency !== 'once',
  ).length;
  const incompleteCount = allReminders.filter(
    (r) => !r.completed && !isSnoozed(r),
  ).length;

  function openCreate() {
    setSelectedReminder(null);
    setSheetMode('create');
    setSheetOpen(true);
  }

  function openEdit(r: ReminderRow) {
    setSelectedReminder(r);
    setSheetMode('edit');
    setSheetOpen(true);
  }

  function openDelete(r: ReminderRow) {
    setReminderToDelete(r);
    setDeleteDialogOpen(true);
  }

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'mine', label: 'Mine' },
    { key: 'household', label: 'Household' },
    { key: 'completed', label: 'Completed' },
  ];

  function renderRow(r: ReminderRow, i: number) {
    return (
      <ReminderRow
        key={r.id}
        reminder={r}
        index={i}
        currentUserId={currentUserId}
        isAdmin={isAdmin ?? false}
        onEdit={() => openEdit(r)}
        onDelete={() => openDelete(r)}
        onComplete={() => completeMutation.mutate(r.id)}
        onUnsnooze={() => unsnoozeMutation.mutate(r.id)}
      />
    );
  }

  const hasAnyContent =
    overdue.length +
      today.length +
      thisWeek.length +
      later.length +
      snoozedList.length +
      completedList.length >
    0;

  // ---- Render ----------------------------------------------------------------

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: 'easeOut' }}
      className="py-4 pb-24 md:py-6"
      style={{ backgroundColor: 'var(--roost-bg)' }}
    >
      <PageContainer className="flex flex-col gap-4">
        {/* Header */}
        <PageHeader
          title="Reminders"
          badge={incompleteCount}
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
              aria-label="New reminder"
            >
              <Plus className="size-4 text-white" />
            </motion.button>
          }
        />

        {/* Filter row */}
        <div className="flex gap-2 overflow-x-auto pb-0.5">
          {FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className="h-9 shrink-0 rounded-xl px-4 text-sm"
                style={{
                  backgroundColor: active ? COLOR : 'var(--roost-surface)',
                  border: active
                    ? `1.5px solid ${COLOR}`
                    : '1.5px solid var(--roost-border)',
                  borderBottom: active
                    ? `3px solid ${COLOR_DARK}`
                    : '3px solid #E5E7EB',
                  color: active ? 'white' : 'var(--roost-text-secondary)',
                  fontWeight: 700,
                }}
              >
                {f.label}
              </button>
            );
          })}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard
            value={activeDueTodayCount}
            label="Due today"
            color={activeDueTodayCount > 0 ? COLOR : undefined}
            borderColor="#0891B2"
          />
          <StatCard
            value={activeIn7DaysCount}
            label="This week"
            borderColor="#0891B2"
          />
          <StatCard
            value={recurringCount}
            label="Recurring"
            color={recurringCount > 0 ? COLOR : undefined}
            borderColor="#0891B2"
          />
        </div>

        {/* Loading */}
        {isLoading && <RemindersSkeleton />}

        {/* Error */}
        {isError && !isLoading && <ErrorState onRetry={refetch} />}

        {/* Empty state */}
        {!isLoading && !isError && allReminders.length === 0 && (
          <EmptyState
            icon={Bell}
            title="Nothing pending."
            body="Set a reminder for anything the household needs to remember. Bills, appointments, the dog's flea treatment."
            color={COLOR}
            buttonLabel="Set a reminder"
            onButtonClick={openCreate}
          />
        )}

        {/* Lists */}
        {!isLoading && !isError && allReminders.length > 0 && (
          <div className="space-y-5">
            <Section title="Overdue" color="#EF4444" count={overdue.length}>
              {overdue.map((r, i) => renderRow(r, i))}
            </Section>
            <Section title="Today" color={COLOR} count={today.length}>
              {today.map((r, i) => renderRow(r, i))}
            </Section>
            <Section title="This week" color={COLOR} count={thisWeek.length}>
              {thisWeek.map((r, i) => renderRow(r, i))}
            </Section>
            <Section
              title="Later"
              color="var(--roost-text-muted)"
              count={later.length}
            >
              {later.map((r, i) => renderRow(r, i))}
            </Section>
            <Section
              title="Snoozed"
              subtitle="These will reactivate automatically"
              color="var(--roost-text-muted)"
              count={snoozedList.length}
              collapsed={snoozedCollapsed}
              onToggle={() => setSnoozedCollapsed((v) => !v)}
            >
              {snoozedList.map((r, i) => renderRow(r, i))}
            </Section>
            <Section
              title="Completed"
              color="var(--roost-text-muted)"
              count={completedList.length}
              collapsed={completedCollapsed}
              onToggle={() => setCompletedCollapsed((v) => !v)}
            >
              {completedList.map((r, i) => renderRow(r, i))}
            </Section>

            {/* Filter empty state */}
            {filter !== 'all' && !hasAnyContent && (
              <div
                className="flex flex-col items-center gap-2 rounded-2xl px-6 py-10 text-center"
                style={{
                  backgroundColor: 'var(--roost-surface)',
                  border: '1.5px dashed var(--roost-border)',
                }}
              >
                <p
                  className="text-sm"
                  style={{
                    color: 'var(--roost-text-secondary)',
                    fontWeight: 700,
                  }}
                >
                  Nothing here.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Reminder sheet */}
        <ReminderSheet
          open={sheetOpen}
          onClose={() => {
            setSheetOpen(false);
            setSelectedReminder(null);
          }}
          mode={sheetMode}
          reminder={selectedReminder}
          householdMembers={members}
          isPremium={isPremium}
          onUpgradeRequired={(code) => {
            setSheetOpen(false);
            setUpgradeCode(code);
          }}
        />

        {/* Upgrade prompt */}
        {!!upgradeCode && (
          <PremiumGate
            feature="reminders"
            trigger="sheet"
            onClose={() => setUpgradeCode(null)}
          />
        )}

        {/* Delete confirm */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle
                style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}
              >
                Delete reminder?
              </DialogTitle>
            </DialogHeader>
            <DialogDescription
              className="text-sm"
              style={{ color: 'var(--roost-text-secondary)', fontWeight: 600 }}
            >
              {reminderToDelete?.title}
            </DialogDescription>
            <DialogFooter className="mt-2 gap-2">
              <button
                type="button"
                onClick={() => setDeleteDialogOpen(false)}
                className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm"
                style={{
                  border: '1.5px solid #E5E7EB',
                  borderBottom: '3px solid #E5E7EB',
                  color: 'var(--roost-text-primary)',
                  fontWeight: 700,
                }}
              >
                Cancel
              </button>
              <motion.button
                type="button"
                whileTap={{ y: 1 }}
                onClick={() =>
                  reminderToDelete && deleteMutation.mutate(reminderToDelete.id)
                }
                disabled={deleteMutation.isPending}
                className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm text-white"
                style={{
                  backgroundColor: '#EF4444',
                  border: '1.5px solid #C93B3B',
                  borderBottom: '3px solid #A63030',
                  fontWeight: 800,
                }}
              >
                Delete
              </motion.button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </PageContainer>
    </motion.div>
  );
}
