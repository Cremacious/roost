"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
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
import { Switch } from "@/components/ui/switch";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, Pencil, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import MemberAvatar from "@/components/shared/MemberAvatar";

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
}

// ---- Input style ------------------------------------------------------------

const inputStyle: React.CSSProperties = {
  border: "1.5px solid var(--roost-border)",
  borderBottom: "3px solid var(--roost-border-bottom)",
  color: "var(--roost-text-primary)",
  fontWeight: 600,
  backgroundColor: "transparent",
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
}: EventSheetProps) {
  const queryClient = useQueryClient();
  const titleRef = useRef<HTMLInputElement>(null);

  const [mode, setMode] = useState(initialMode);
  const [title, setTitle] = useState("");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [allDay, setAllDay] = useState(false);
  const [startTime, setStartTime] = useState("09:00");
  const [endTime, setEndTime] = useState("");
  const [description, setDescription] = useState("");
  const [attendeeIds, setAttendeeIds] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const canEdit = mode === "view" && event &&
    (event.created_by === currentUserId || isAdmin);

  // Sync fields when sheet opens / event changes
  useEffect(() => {
    if (!open) return;
    setMode(initialMode);

    if (initialMode === "create") {
      setTitle("");
      setSelectedDate(initialDate ?? new Date());
      setAllDay(false);
      setStartTime("09:00");
      setEndTime("");
      setDescription("");
      setAttendeeIds(new Set());
    } else if (event) {
      setTitle(event.title);
      setSelectedDate(new Date(event.start_time));
      setAllDay(event.all_day);
      setStartTime(event.all_day ? "09:00" : format(new Date(event.start_time), "HH:mm"));
      setEndTime(event.end_time && !event.all_day ? format(new Date(event.end_time), "HH:mm") : "");
      setDescription(event.description ?? "");
      setAttendeeIds(new Set(event.attendees.map((a) => a.userId)));
    }

    if (initialMode !== "view") {
      setTimeout(() => titleRef.current?.focus(), 120);
    }
  }, [open, initialMode, event, initialDate]);

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

      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        start_time: startISO,
        end_time: endISO ?? null,
        all_day: allDay,
        attendee_ids: Array.from(attendeeIds),
      };

      if (mode === "create") {
        const r = await fetch("/api/calendar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error ?? "Failed to create event");
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
    onError: (err: Error) => toast.error(err.message),
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
        <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
          <SheetContent
            side="bottom"
            className="rounded-t-2xl px-4 pb-8 pt-2"
            style={{ backgroundColor: "var(--roost-surface)", maxHeight: "88dvh", overflowY: "auto" }}
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ backgroundColor: "var(--roost-border)" }} />
            <SheetHeader className="mb-4 text-left">
              <SheetTitle style={{ color: "var(--roost-text-primary)", fontWeight: 800, fontSize: 20 }}>
                {event.title}
              </SheetTitle>
            </SheetHeader>

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
                  <p className="mb-2 text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
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
                      border: "1.5px solid var(--roost-border)",
                      borderBottom: "3px solid var(--roost-border-bottom)",
                      color: "#EF4444",
                    }}
                  >
                    <Trash2 className="size-4" />
                  </motion.button>
                </div>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Delete confirmation */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
                Delete event?
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm" style={{ color: "var(--roost-text-secondary)", fontWeight: 600 }}>
              {event.title}
            </p>
            <DialogFooter className="mt-2 gap-2">
              <button type="button" onClick={() => setDeleteDialogOpen(false)}
                className="flex h-11 flex-1 items-center justify-center rounded-xl text-sm"
                style={{ border: "1.5px solid var(--roost-border)", borderBottom: "3px solid var(--roost-border-bottom)", color: "var(--roost-text-primary)", fontWeight: 700 }}>
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
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl px-4 pb-8 pt-2 "
        style={{ backgroundColor: "var(--roost-surface)", maxHeight: "96dvh", overflowY: "auto" }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ backgroundColor: "var(--roost-border)" }} />
        <SheetHeader className="mb-5 text-left">
          <SheetTitle style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
            {mode === "create" ? "New Event" : "Edit Event"}
          </SheetTitle>
        </SheetHeader>

        {/* Two-column on desktop, single column on mobile */}
        <div className="space-y-4 sm:grid sm:grid-cols-2 sm:items-start sm:gap-6 sm:space-y-0">

          {/* LEFT COLUMN — form fields */}
          <div className="space-y-4 sm:flex sm:flex-col">

            {/* Title */}
            <div>
              <label className="mb-1.5 block text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
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
              <label className="mb-1.5 block text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
                Date
              </label>
              <div
                className="overflow-hidden rounded-xl"
                style={{ border: "1.5px solid var(--roost-border)", borderBottom: "3px solid var(--roost-border-bottom)", "--primary": COLOR, "--primary-foreground": "#ffffff" } as React.CSSProperties}
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
              <Switch checked={allDay} onCheckedChange={setAllDay} />
            </div>

            {/* Time inputs */}
            {!allDay && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1.5 block text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
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
                  <label className="mb-1.5 block text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
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
              <label className="mb-1.5 block text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
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
                <label className="mb-2 block text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
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
                  : mode === "create" ? "Add Event" : "Save Changes"}
              </motion.button>

              <button
                type="button"
                onClick={onClose}
                className="flex h-11 w-full items-center justify-center rounded-xl text-sm"
                style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}
              >
                Cancel
              </button>
            </div>

          </div>

          {/* RIGHT COLUMN — calendar, desktop only */}
          <div className="hidden sm:flex sm:flex-col">
            <p className="mb-2 text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
              Date
            </p>
            <div
              className="overflow-hidden rounded-xl"
              style={{ border: "1.5px solid var(--roost-border)", borderBottom: `3px solid ${COLOR_DARK}40`, "--primary": COLOR, "--primary-foreground": "#ffffff" } as React.CSSProperties}
            >
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={(d) => d && setSelectedDate(d)}
                className="roost-calendar-compact w-full"
                classNames={{ root: "w-full" }}
              />
            </div>
          </div>

        </div>
      </SheetContent>
    </Sheet>
  );
}
