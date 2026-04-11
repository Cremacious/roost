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
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, Lock, Pencil, Repeat, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import MemberAvatar from "@/components/shared/MemberAvatar";
import { useHousehold } from "@/lib/hooks/useHousehold";

const COLOR = "#3B82F6";
const COLOR_DARK = "#1A5CB5";

// ---- Types ------------------------------------------------------------------

export interface Attendee {
  userId: string;
  name: string | null;
  avatarColor: string | null;
}

export interface CalendarEventFull {
  id: string;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  all_day: boolean;
  created_by: string;
  creator_name: string | null;
  creator_avatar: string | null;
  attendees: Attendee[];
  // Recurrence fields
  recurring?: boolean;
  frequency?: string | null;
  repeat_end_type?: string | null;
  repeat_until?: string | null;
  repeat_occurrences?: number | null;
  // Set to true on expanded instances; false/undefined for one-off events
  isRecurring?: boolean;
  // Original template start_time — used in edit mode so editing always targets
  // the template anchor date rather than the specific instance occurrence date
  template_start_time?: string | null;
}

export interface Member {
  userId: string;
  name: string;
  avatarColor: string | null;
  role: string;
}

interface EventSheetProps {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit" | "view";
  event?: CalendarEventFull | null;
  initialDate?: Date;
  householdMembers: Member[];
  currentUserId: string;
  isAdmin: boolean;
  queryKeys: (string | number)[][];
  onUpgradeRequired?: (code: string) => void;
}

// ---- Constants --------------------------------------------------------------

const FREQUENCIES = [
  { value: "daily",    label: "Daily" },
  { value: "weekly",   label: "Weekly" },
  { value: "biweekly", label: "Biweekly" },
  { value: "monthly",  label: "Monthly" },
  { value: "yearly",   label: "Yearly" },
] as const;

const END_TYPES = [
  { value: "forever",           label: "Never" },
  { value: "until_date",        label: "On date" },
  { value: "after_occurrences", label: "After" },
] as const;

// ---- Input style ------------------------------------------------------------

const inputStyle: React.CSSProperties = {
  backgroundColor: "var(--roost-surface)",
  border: "1.5px solid #E5E7EB",
  borderBottom: "3px solid #E5E7EB",
  color: "var(--roost-text-primary)",
  fontWeight: 600,
};

// ---- Time formatting --------------------------------------------------------

function formatEventTime(event: CalendarEventFull): string {
  if (event.all_day) return "All day";
  const start = format(new Date(event.start_time), "h:mm a");
  if (!event.end_time) return start;
  const end = format(new Date(event.end_time), "h:mm a");
  return `${start} - ${end}`;
}

function firstName(name: string | null): string {
  if (!name) return "Someone";
  return name.split(" ")[0];
}

function frequencyLabel(frequency: string | null | undefined): string {
  if (!frequency) return "";
  return FREQUENCIES.find((f) => f.value === frequency)?.label ?? frequency;
}

// ---- RecurringFields sub-component ------------------------------------------

interface RecurringFieldsProps {
  recurring: boolean;
  frequency: string;
  repeatEndType: string;
  repeatUntil: Date | null;
  repeatOccurrences: number | null;
  isPremium: boolean | undefined;
  onChange: (update: {
    recurring?: boolean;
    frequency?: string;
    repeatEndType?: string;
    repeatUntil?: Date | null;
    repeatOccurrences?: number | null;
  }) => void;
  onUpgradeRequired?: (code: string) => void;
}

function RecurringFields({
  recurring,
  frequency,
  repeatEndType,
  repeatUntil,
  repeatOccurrences,
  isPremium,
  onChange,
  onUpgradeRequired,
}: RecurringFieldsProps) {
  return (
    <div
      className="rounded-2xl p-3 space-y-3"
      style={{
        backgroundColor: "var(--roost-bg)",
        border: "1.5px solid var(--roost-border)",
        borderBottom: "3px solid var(--roost-border-bottom)",
      }}
    >
      {/* Repeat toggle row */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Repeat className="size-4" style={{ color: recurring ? COLOR : "var(--roost-text-muted)" }} />
          <span className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
            Repeat
          </span>
          {isPremium === false && (
            <Lock className="size-3" style={{ color: "var(--roost-text-muted)" }} />
          )}
        </div>
        <div style={{ "--primary": COLOR, "--primary-foreground": "#ffffff" } as React.CSSProperties}>
          <Switch
            checked={recurring}
            onCheckedChange={(checked) => {
              if (checked && isPremium === false) {
                onUpgradeRequired?.("RECURRING_EVENTS_PREMIUM");
                return;
              }
              onChange({ recurring: checked });
            }}
          />
        </div>
      </div>

      {/* Expanded recurring options */}
      {recurring && (
        <>
          {/* Frequency pills */}
          <div>
            <p className="mb-2 text-xs" style={{ color: "#374151", fontWeight: 700 }}>Frequency</p>
            <div className="grid grid-cols-5 gap-1.5">
              {FREQUENCIES.map((f) => {
                const active = frequency === f.value;
                return (
                  <motion.button
                    key={f.value}
                    type="button"
                    whileTap={{ y: 1 }}
                    onClick={() => onChange({ frequency: f.value })}
                    className="flex h-9 items-center justify-center rounded-lg text-xs"
                    style={{
                      backgroundColor: active ? COLOR + "18" : "var(--roost-surface)",
                      border: active ? `1.5px solid ${COLOR}40` : "1.5px solid var(--roost-border)",
                      borderBottom: active ? `3px solid ${COLOR_DARK}60` : "3px solid var(--roost-border-bottom)",
                      color: active ? COLOR : "var(--roost-text-secondary)",
                      fontWeight: active ? 800 : 600,
                    }}
                  >
                    {f.label}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* End condition */}
          <div>
            <p className="mb-2 text-xs" style={{ color: "#374151", fontWeight: 700 }}>Ends</p>
            <div className="grid grid-cols-3 gap-1.5">
              {END_TYPES.map((et) => {
                const active = repeatEndType === et.value;
                return (
                  <motion.button
                    key={et.value}
                    type="button"
                    whileTap={{ y: 1 }}
                    onClick={() => onChange({ repeatEndType: et.value })}
                    className="flex h-9 items-center justify-center rounded-lg text-xs"
                    style={{
                      backgroundColor: active ? COLOR + "18" : "var(--roost-surface)",
                      border: active ? `1.5px solid ${COLOR}40` : "1.5px solid var(--roost-border)",
                      borderBottom: active ? `3px solid ${COLOR_DARK}60` : "3px solid var(--roost-border-bottom)",
                      color: active ? COLOR : "var(--roost-text-secondary)",
                      fontWeight: active ? 800 : 600,
                    }}
                  >
                    {et.label}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {/* Until date picker */}
          {repeatEndType === "until_date" && (
            <div>
              <label className="mb-1.5 block text-xs" style={{ color: "#374151", fontWeight: 700 }}>
                End date
              </label>
              <input
                type="date"
                value={repeatUntil ? format(repeatUntil, "yyyy-MM-dd") : ""}
                onChange={(e) =>
                  onChange({
                    repeatUntil: e.target.value
                      ? new Date(`${e.target.value}T00:00:00`)
                      : null,
                  })
                }
                className="h-12 w-full rounded-xl px-4 text-sm focus:outline-none"
                style={inputStyle}
              />
            </div>
          )}

          {/* After N occurrences */}
          {repeatEndType === "after_occurrences" && (
            <div>
              <label className="mb-1.5 block text-xs" style={{ color: "#374151", fontWeight: 700 }}>
                Number of times
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  value={repeatOccurrences ?? ""}
                  onChange={(e) =>
                    onChange({
                      repeatOccurrences: e.target.value ? parseInt(e.target.value, 10) : null,
                    })
                  }
                  placeholder="10"
                  min={1}
                  max={365}
                  className="h-12 w-28 rounded-xl px-4 text-sm focus:outline-none"
                  style={inputStyle}
                />
                <span className="text-sm" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                  occurrences total
                </span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---- Component --------------------------------------------------------------

export default function EventSheet({
  open,
  onClose,
  mode: initialMode,
  event,
  initialDate,
  householdMembers,
  currentUserId,
  isAdmin,
  queryKeys,
  onUpgradeRequired,
}: EventSheetProps) {
  const queryClient = useQueryClient();
  const titleRef = useRef<HTMLInputElement>(null);
  const { isPremium } = useHousehold();

  const [mode, setMode] = useState(initialMode);
  const [title, setTitle] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");
  const [attendeeIds, setAttendeeIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Recurring state
  const [recurring, setRecurring] = useState(false);
  const [frequency, setFrequency] = useState("weekly");
  const [repeatEndType, setRepeatEndType] = useState("forever");
  const [repeatUntil, setRepeatUntil] = useState<Date | null>(null);
  const [repeatOccurrences, setRepeatOccurrences] = useState<number | null>(null);

  const canEdit = mode === "view" && event &&
    (event.created_by === currentUserId || isAdmin);

  // Sync fields when sheet opens / event changes
  useEffect(() => {
    if (!open) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMode(initialMode);

    if (initialMode === "create") {
      setTitle("");
      setSelectedDate(initialDate ?? new Date());
      setAllDay(false);
      setStartTime("09:00");
      setEndTime("");
      setDescription("");
      setAttendeeIds(new Set());
      setRecurring(false);
      setFrequency("weekly");
      setRepeatEndType("forever");
      setRepeatUntil(null);
      setRepeatOccurrences(null);
    } else if (event) {
      setTitle(event.title);
      // In edit mode, use the template's original start_time as the date anchor
      // so the user edits the pattern start, not the specific instance occurrence.
      const editDate = event.template_start_time
        ? new Date(event.template_start_time)
        : new Date(event.start_time);
      setSelectedDate(editDate);
      setAllDay(event.all_day);
      setStartTime(event.all_day ? "09:00" : format(editDate, "HH:mm"));
      setEndTime(event.end_time && !event.all_day ? format(new Date(event.end_time), "HH:mm") : "");
      setDescription(event.description ?? "");
      setAttendeeIds(new Set(event.attendees.map((a) => a.userId)));
      setRecurring(event.recurring ?? false);
      setFrequency(event.frequency ?? "weekly");
      setRepeatEndType(event.repeat_end_type ?? "forever");
      setRepeatUntil(event.repeat_until ? new Date(event.repeat_until) : null);
      setRepeatOccurrences(event.repeat_occurrences ?? null);
    }

    if (initialMode !== "view") {
      setTimeout(() => titleRef.current?.focus(), 120);
    }
  }, [open, initialMode, event, initialDate]);

  function handleRecurringChange(update: {
    recurring?: boolean;
    frequency?: string;
    repeatEndType?: string;
    repeatUntil?: Date | null;
    repeatOccurrences?: number | null;
  }) {
    if (update.recurring !== undefined) setRecurring(update.recurring);
    if (update.frequency !== undefined) setFrequency(update.frequency);
    if (update.repeatEndType !== undefined) setRepeatEndType(update.repeatEndType);
    if (update.repeatUntil !== undefined) setRepeatUntil(update.repeatUntil);
    if (update.repeatOccurrences !== undefined) setRepeatOccurrences(update.repeatOccurrences);
  }

  function buildDatetime(date: Date, time: string): string {
    const [h, m] = time.split(":").map(Number);
    const d = new Date(date);
    d.setHours(h, m, 0, 0);
    return d.toISOString();
  }

  function invalidateCalendar() {
    for (const key of queryKeys) {
      queryClient.invalidateQueries({ queryKey: key });
    }
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Title is required");
      if (!selectedDate) throw new Error("Date is required");

      const startISO = allDay
        ? new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate(), 0, 0, 0).toISOString()
        : buildDatetime(selectedDate, startTime);

      const endISO = !allDay && endTime
        ? buildDatetime(selectedDate, endTime)
        : undefined;

      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || undefined,
        start_time: startISO,
        end_time: endISO ?? null,
        all_day: allDay,
        attendee_ids: Array.from(attendeeIds),
        recurring,
      };

      if (recurring) {
        payload.frequency = frequency;
        payload.repeat_end_type = repeatEndType;
        if (repeatEndType === "until_date" && repeatUntil) {
          payload.repeat_until = repeatUntil.toISOString();
        }
        if (repeatEndType === "after_occurrences" && repeatOccurrences) {
          payload.repeat_occurrences = repeatOccurrences;
        }
      }

      if (mode === "create") {
        const r = await fetch("/api/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          const err = new Error(d.error ?? "Failed to create event") as Error & { code?: string };
          err.code = d.code;
          throw err;
        }
        return r.json();
      } else {
        const r = await fetch(`/api/calendar/${event!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error ?? "Failed to update event");
        }
        return r.json();
      }
    },
    onSuccess: () => {
      invalidateCalendar();
      toast.success(mode === "create" ? "Event added" : "Event updated");
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
      const r = await fetch(`/api/calendar/${event!.id}`, { method: "DELETE" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to delete event");
      }
    },
    onSuccess: () => {
      invalidateCalendar();
      toast.success("Event deleted");
      setDeleteDialogOpen(false);
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  function toggleAttendee(userId: string) {
    setAttendeeIds((prev) => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  }

  // ---- View mode render -------------------------------------------------------

  if (mode === "view" && event) {
    return (
      <>
        <DraggableSheet open={open} onOpenChange={(v) => !v && onClose()} featureColor={COLOR}>
          <div className="overflow-x-hidden px-4 pb-8">
            <div className="mb-4 flex items-start gap-2">
              <p style={{ color: "var(--roost-text-primary)", fontWeight: 800, fontSize: 20, flex: 1 }}>
                {event.title}
              </p>
                {event.isRecurring && (
                  <span
                    className="mt-0.5 flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[11px]"
                    style={{ backgroundColor: COLOR + "18", color: COLOR, fontWeight: 700 }}
                  >
                    <Repeat className="size-3" />
                    Repeating
                  </span>
                )}
            </div>

            <div className="space-y-4">
              {/* Date + time */}
              <div
                className="rounded-xl px-4 py-3"
                style={{
                  backgroundColor: COLOR + "12",
                  border: `1.5px solid ${COLOR}30`,
                  borderBottom: `3px solid ${COLOR}50`,
                }}
              >
                <p className="text-sm" style={{ color: COLOR, fontWeight: 700 }}>
                  {format(new Date(event.start_time), "EEEE, MMMM d, yyyy")}
                </p>
                <p className="mt-0.5 text-sm" style={{ color: COLOR + "CC", fontWeight: 600 }}>
                  {formatEventTime(event)}
                </p>
                {event.isRecurring && event.frequency && (
                  <p className="mt-1 text-xs" style={{ color: COLOR + "99", fontWeight: 600 }}>
                    Repeats {frequencyLabel(event.frequency).toLowerCase()}
                  </p>
                )}
              </div>

              {/* Description */}
              {event.description && (
                <p className="text-sm leading-relaxed" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
                  {event.description}
                </p>
              )}

              {/* Created by */}
              <div className="flex items-center gap-2">
                {event.creator_name && (
                  <MemberAvatar name={event.creator_name} avatarColor={event.creator_avatar} size="sm" />
                )}
                <span className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                  Added by {firstName(event.creator_name)}
                </span>
              </div>

              {/* Attendees */}
              {event.attendees.length > 0 && (
                <div>
                  <p className="mb-2 text-xs" style={{ color: "#374151", fontWeight: 700 }}>
                    Attendees
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {event.attendees.map((a) => (
                      <div key={a.userId} className="flex items-center gap-1.5 rounded-full px-2.5 py-1"
                        style={{ backgroundColor: "var(--roost-bg)", border: "1.5px solid var(--roost-border)" }}>
                        <MemberAvatar name={a.name ?? "?"} avatarColor={a.avatarColor} size="sm" />
                        <span className="text-xs" style={{ color: "var(--roost-text-primary)", fontWeight: 600 }}>
                          {firstName(a.name)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Actions */}
              {canEdit && (
                <div className="flex gap-2 pt-2">
                  <motion.button
                    type="button"
                    whileTap={{ y: 1 }}
                    onClick={() => setMode("edit")}
                    className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl text-sm"
                    style={{
                      backgroundColor: COLOR,
                      border: `1.5px solid ${COLOR}`,
                      borderBottom: `3px solid ${COLOR_DARK}`,
                      color: "white",
                      fontWeight: 800,
                    }}
                  >
                    <Pencil className="size-4" />
                    Edit
                  </motion.button>
                  <motion.button
                    type="button"
                    whileTap={{ y: 1 }}
                    onClick={() => setDeleteDialogOpen(true)}
                    className="flex h-11 w-12 items-center justify-center rounded-xl"
                    style={{
                      border: "1.5px solid #E5E7EB",
                      borderBottom: "3px solid #E5E7EB",
                      color: "#EF4444",
                    }}
                  >
                    <Trash2 className="size-4" />
                  </motion.button>
                </div>
              )}
            </div>
          </div>
        </DraggableSheet>

        {/* Delete confirmation */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
                {event.isRecurring ? "Delete recurring event?" : "Delete event?"}
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
              {event.title}
              {event.isRecurring && (
                <span className="block mt-1" style={{ color: "var(--roost-text-muted)" }}>
                  All occurrences of this event will be removed.
                </span>
              )}
            </p>
            <DialogFooter className="mt-2 gap-2">
              <button type="button" onClick={() => setDeleteDialogOpen(false)}
                className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm"
                style={{ border: "1.5px solid #E5E7EB", borderBottom: "3px solid #E5E7EB", color: "var(--roost-text-primary)", fontWeight: 700 }}>
                Cancel
              </button>
              <motion.button type="button" whileTap={{ y: 1 }}
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm text-white"
                style={{ backgroundColor: "#EF4444", border: "1.5px solid #C93B3B", borderBottom: "3px solid #A63030", fontWeight: 800, opacity: deleteMutation.isPending ? 0.7 : 1 }}>
                {deleteMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Delete"}
              </motion.button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // ---- Create / Edit mode render ----------------------------------------------

  return (
    <DraggableSheet open={open} onOpenChange={(v) => !v && onClose()} featureColor={COLOR} desktopMaxWidth={860}>
      <div className="overflow-x-hidden px-4 pb-8">
        <p className="mb-5 text-lg" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
          {mode === "create" ? "New Event" : "Edit Event"}
        </p>

        {/* Edit recurring note */}
        {mode === "edit" && event?.isRecurring && (
          <div
            className="mb-4 flex items-center gap-2 rounded-xl px-3 py-2.5"
            style={{
              backgroundColor: COLOR + "0D",
              border: `1px solid ${COLOR}30`,
            }}
          >
            <Repeat className="size-3.5 shrink-0" style={{ color: COLOR }} />
            <p className="text-xs" style={{ color: COLOR, fontWeight: 600 }}>
              Editing this event will update all occurrences.
            </p>
          </div>
        )}

        {/* Two-column on desktop, single column on mobile */}
        <div className="space-y-4 sm:grid sm:grid-cols-[1fr_240px] sm:items-start sm:gap-6 sm:space-y-0">

          {/* LEFT COLUMN — form fields */}
          <div className="space-y-4 sm:flex sm:flex-col">

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
                placeholder="e.g. Family dinner, Rent due"
                className="h-12 w-full rounded-xl px-4 text-sm focus:outline-none"
                style={inputStyle}
              />
            </div>

            {/* Date — mobile only, hidden on desktop (calendar lives in right column there) */}
            <div className="sm:hidden">
              <label className="mb-1.5 block text-xs" style={{ color: "#374151", fontWeight: 700 }}>
                Date
              </label>
              <div
                className="overflow-hidden rounded-xl"
                style={{ border: "1.5px solid #E5E7EB", borderBottom: `3px solid ${COLOR_DARK}`, "--primary": COLOR, "--primary-foreground": "#ffffff" } as React.CSSProperties}
              >
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => d && setSelectedDate(d)}
                  className="w-full"
                />
              </div>
            </div>

            {/* All day toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
                All day
              </span>
              <div style={{ "--primary": COLOR, "--primary-foreground": "#ffffff" } as React.CSSProperties}>
                <Switch checked={allDay} onCheckedChange={setAllDay} />
              </div>
            </div>

            {/* Time inputs */}
            {!allDay && (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
                <div>
                  <label className="mb-1.5 block text-xs" style={{ color: "#374151", fontWeight: 700 }}>
                    Start time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="h-12 w-full rounded-xl px-4 text-sm focus:outline-none"
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs" style={{ color: "#374151", fontWeight: 700 }}>
                    End time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="h-12 w-full rounded-xl px-4 text-sm focus:outline-none"
                    style={inputStyle}
                  />
                </div>
              </div>
            )}

            {/* Description */}
            <div>
              <label className="mb-1.5 block text-xs" style={{ color: "#374151", fontWeight: 700 }}>
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Any details..."
                rows={2}
                className="w-full resize-none rounded-xl px-4 py-3 text-sm focus:outline-none"
                style={inputStyle}
              />
            </div>

            {/* Attendees */}
            {householdMembers.length > 0 && (
              <div>
                <label className="mb-2 block text-xs" style={{ color: "#374151", fontWeight: 700 }}>
                  Attendees
                </label>
                <div className="flex flex-wrap gap-2">
                  {householdMembers.map((m) => {
                    const selected = attendeeIds.has(m.userId);
                    return (
                      <button
                        key={m.userId}
                        type="button"
                        onClick={() => toggleAttendee(m.userId)}
                        className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs"
                        style={{
                          backgroundColor: selected ? COLOR + "18" : "var(--roost-bg)",
                          border: selected ? `1.5px solid ${COLOR}40` : "1.5px solid var(--roost-border)",
                          color: selected ? COLOR : "var(--roost-text-primary)",
                          fontWeight: selected ? 700 : 600,
                        }}
                      >
                        <MemberAvatar name={m.name} avatarColor={m.avatarColor} size="sm" />
                        {m.name.split(" ")[0]}
                        {selected && <X className="size-3" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Recurring fields */}
            <RecurringFields
              recurring={recurring}
              frequency={frequency}
              repeatEndType={repeatEndType}
              repeatUntil={repeatUntil}
              repeatOccurrences={repeatOccurrences}
              isPremium={isPremium}
              onChange={handleRecurringChange}
              onUpgradeRequired={onUpgradeRequired}
            />

            {/* Save + Cancel — pushed to bottom of left column on desktop */}
            <div className="space-y-2 sm:mt-auto sm:pt-4">
              <motion.button
                type="button"
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
                whileTap={{ y: 2 }}
                className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm text-white"
                style={{
                  backgroundColor: COLOR,
                  border: `1.5px solid ${COLOR}`,
                  borderBottom: `3px solid ${COLOR_DARK}`,
                  fontWeight: 800,
                  opacity: saveMutation.isPending ? 0.7 : 1,
                }}
              >
                {saveMutation.isPending
                  ? <Loader2 className="size-4 animate-spin" />
                  : mode === "create"
                    ? recurring ? "Add Recurring Event" : "Add Event"
                    : "Save Changes"}
              </motion.button>

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

          {/* RIGHT COLUMN — calendar, desktop only */}
          <div className="hidden sm:block sm:w-full sm:pt-6" style={{ "--primary": COLOR, "--primary-foreground": "#ffffff" } as React.CSSProperties}>
            <p className="mb-3 text-xs" style={{ color: "#374151", fontWeight: 700 }}>
              Date
            </p>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(d) => d && setSelectedDate(d)}
              className="roost-calendar-compact"
            />
          </div>

        </div>
      </div>
    </DraggableSheet>
  );
}
