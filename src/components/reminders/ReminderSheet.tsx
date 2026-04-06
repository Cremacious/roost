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
import { Loader2, Home, User, Users } from "lucide-react";
import { format } from "date-fns";
import MemberAvatar from "@/components/shared/MemberAvatar";

const COLOR = "#06B6D4";
const COLOR_DARK = "#0891B2";

// ---- Types ------------------------------------------------------------------

export interface ReminderData {
  id: string;
  title: string;
  note: string | null;
  remind_at: string;
  frequency: string;
  custom_days: string | null;
  notify_type: string;
  notify_user_ids: string | null;
  completed: boolean;
  next_remind_at: string | null;
  created_by: string;
}

export interface Member {
  userId: string;
  name: string;
  avatarColor: string | null;
  role: string;
}

interface ReminderSheetProps {
  open: boolean;
  onClose: () => void;
  mode: "create" | "edit";
  reminder?: ReminderData | null;
  householdMembers: Member[];
}

// ---- Constants --------------------------------------------------------------

const FREQUENCIES = [
  { value: "once", label: "Once" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "custom", label: "Custom" },
] as const;

const DAYS = [
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
  { value: 0, label: "Sun" },
];

// ---- Input style ------------------------------------------------------------

const inputStyle: React.CSSProperties = {
  border: "1.5px solid var(--roost-border)",
  borderBottom: "3px solid var(--roost-border-bottom)",
  color: "var(--roost-text-primary)",
  fontWeight: 600,
  backgroundColor: "transparent",
};

// ---- Component --------------------------------------------------------------

export default function ReminderSheet({
  open,
  onClose,
  mode,
  reminder,
  householdMembers,
}: ReminderSheetProps) {
  const queryClient = useQueryClient();
  const titleRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");
  const [dateStr, setDateStr] = useState(""); // YYYY-MM-DD
  const [timeStr, setTimeStr] = useState("09:00");
  const [frequency, setFrequency] = useState<string>("once");
  const [customDays, setCustomDays] = useState<number[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [notifyType, setNotifyType] = useState<"self" | "specific" | "household">("self");
  const [specificUserIds, setSpecificUserIds] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;

    if (mode === "create") {
      setTitle("");
      setNote("");
      // Default date: tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setDateStr(tomorrow.toISOString().slice(0, 10));
      setTimeStr("09:00");
      setFrequency("once");
      setCustomDays([]);
      setNotifyType("self");
      setSpecificUserIds([]);
      setTimeout(() => titleRef.current?.focus(), 100);
    } else if (reminder) {
      setTitle(reminder.title);
      setNote(reminder.note ?? "");
      const remindDate = new Date(reminder.remind_at);
      setDateStr(remindDate.toISOString().slice(0, 10));
      setTimeStr(
        `${String(remindDate.getHours()).padStart(2, "0")}:${String(remindDate.getMinutes()).padStart(2, "0")}`
      );
      setFrequency(reminder.frequency);
      try {
        setCustomDays(reminder.custom_days ? (JSON.parse(reminder.custom_days) as number[]) : []);
      } catch {
        setCustomDays([]);
      }
      setNotifyType((reminder.notify_type as "self" | "specific" | "household") ?? "self");
      try {
        setSpecificUserIds(reminder.notify_user_ids ? (JSON.parse(reminder.notify_user_ids) as string[]) : []);
      } catch {
        setSpecificUserIds([]);
      }
    }
  }, [open, mode, reminder]);

  function toggleDay(day: number) {
    setCustomDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day]
    );
  }

  function toggleSpecificUser(userId: string) {
    setSpecificUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  }

  function buildRemindAt(): Date {
    const [y, m, d] = dateStr.split("-").map(Number);
    const [h, min] = timeStr.split(":").map(Number);
    return new Date(y, m - 1, d, h, min);
  }

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["reminders"] });
    queryClient.invalidateQueries({ queryKey: ["reminders-due"] });
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!title.trim()) throw new Error("Title is required");
      if (!dateStr) throw new Error("Date is required");

      const remindAt = buildRemindAt();
      const payload = {
        title: title.trim(),
        note: note.trim() || undefined,
        remind_at: remindAt.toISOString(),
        frequency,
        custom_days: frequency === "custom" ? customDays : undefined,
        notify_type: notifyType,
        notify_user_ids: notifyType === "specific" ? specificUserIds : undefined,
      };

      if (mode === "create") {
        const r = await fetch("/api/reminders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error ?? "Failed to save reminder");
        }
        return r.json();
      } else {
        const r = await fetch(`/api/reminders/${reminder!.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          throw new Error(d.error ?? "Failed to update reminder");
        }
        return r.json();
      }
    },
    onSuccess: () => {
      invalidate();
      toast.success(mode === "create" ? "Reminder set" : "Reminder updated");
      onClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const displayDate = dateStr
    ? format(new Date(dateStr + "T12:00:00"), "EEE, MMM d")
    : "Pick a date";

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl px-4 pb-8 pt-2"
        style={{ backgroundColor: "var(--roost-surface)", maxHeight: "92dvh", overflowY: "auto" }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ backgroundColor: "var(--roost-border)" }} />
        <SheetHeader className="mb-5 text-left">
          <SheetTitle style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
            {mode === "create" ? "Set a Reminder" : "Edit Reminder"}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-5">
          {/* Title */}
          <div>
            <label className="mb-1.5 block text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
              What do you need to remember?
            </label>
            <input
              ref={titleRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Pay rent, call the vet, buy birthday card..."
              className="h-12 w-full rounded-xl px-4 text-sm focus:outline-none"
              style={inputStyle}
            />
          </div>

          {/* Note */}
          <div>
            <label className="mb-1.5 block text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
              Note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Any extra context..."
              rows={2}
              className="w-full resize-none rounded-xl px-4 py-3 text-sm focus:outline-none"
              style={inputStyle}
            />
          </div>

          {/* Date and time */}
          <div>
            <label className="mb-1.5 block text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
              When?
            </label>
            <div className="flex gap-2">
              {/* Date picker button */}
              <button
                type="button"
                onClick={() => setShowCalendar((v) => !v)}
                className="flex h-12 flex-1 items-center rounded-xl px-4 text-sm"
                style={{
                  ...inputStyle,
                  borderBottom: showCalendar ? `3px solid ${COLOR}` : inputStyle.borderBottom,
                  color: dateStr ? "var(--roost-text-primary)" : "var(--roost-text-muted)",
                }}
              >
                {displayDate}
              </button>

              {/* Time input */}
              <input
                type="time"
                value={timeStr}
                onChange={(e) => setTimeStr(e.target.value)}
                className="h-12 w-32 rounded-xl px-3 text-sm focus:outline-none"
                style={inputStyle}
              />
            </div>

            {/* Inline date input when calendar toggled */}
            {showCalendar && (
              <input
                type="date"
                value={dateStr}
                onChange={(e) => { setDateStr(e.target.value); setShowCalendar(false); }}
                className="mt-2 h-12 w-full rounded-xl px-4 text-sm focus:outline-none"
                style={inputStyle}
                autoFocus
              />
            )}
          </div>

          {/* Frequency */}
          <div>
            <label className="mb-1.5 block text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
              Repeat
            </label>
            <div className="flex gap-2 flex-wrap">
              {FREQUENCIES.map((f) => {
                const active = frequency === f.value;
                return (
                  <button
                    key={f.value}
                    type="button"
                    onClick={() => setFrequency(f.value)}
                    className="h-10 flex-1 rounded-xl text-sm"
                    style={{
                      border: active ? `1.5px solid ${COLOR}` : "1.5px solid var(--roost-border)",
                      borderBottom: active ? `3px solid ${COLOR_DARK}` : "3px solid var(--roost-border-bottom)",
                      backgroundColor: active ? `${COLOR}18` : "transparent",
                      color: active ? COLOR : "var(--roost-text-secondary)",
                      fontWeight: 700,
                    }}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>

            {/* Custom day toggles */}
            {frequency === "custom" && (
              <div className="mt-3 flex gap-2">
                {DAYS.map((d) => {
                  const active = customDays.includes(d.value);
                  return (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => toggleDay(d.value)}
                      className="flex h-9 flex-1 items-center justify-center rounded-xl text-xs"
                      style={{
                        border: active ? `1.5px solid ${COLOR}` : "1.5px solid var(--roost-border)",
                        borderBottom: active ? `3px solid ${COLOR_DARK}` : "3px solid var(--roost-border-bottom)",
                        backgroundColor: active ? `${COLOR}18` : "transparent",
                        color: active ? COLOR : "var(--roost-text-muted)",
                        fontWeight: 700,
                      }}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Who to remind */}
          <div>
            <label className="mb-1.5 block text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
              Who to remind
            </label>
            <div className="space-y-2">
              {(
                [
                  { value: "self" as const, icon: User, label: "Just me", desc: "Only you will be notified" },
                  { value: "specific" as const, icon: Users, label: "Specific people", desc: "Choose who gets notified" },
                  { value: "household" as const, icon: Home, label: "Whole household", desc: "Everyone gets notified" },
                ] as const
              ).map(({ value, icon: Icon, label, desc }) => {
                const active = notifyType === value;
                return (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setNotifyType(value)}
                    className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left"
                    style={{
                      border: active ? `1.5px solid ${COLOR}` : "1.5px solid var(--roost-border)",
                      borderBottom: active ? `3px solid ${COLOR_DARK}` : "3px solid var(--roost-border-bottom)",
                      backgroundColor: active ? `${COLOR}18` : "transparent",
                    }}
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: active ? `${COLOR}30` : "var(--roost-border)", }}
                    >
                      <Icon className="size-4" style={{ color: active ? COLOR : "var(--roost-text-muted)" }} />
                    </div>
                    <div>
                      <p className="text-sm" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
                        {label}
                      </p>
                      <p className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                        {desc}
                      </p>
                    </div>
                  </button>
                );
              })}

              {/* Specific people list */}
              {notifyType === "specific" && (
                <div className="mt-2 space-y-1 pl-1">
                  {householdMembers.map((m) => {
                    const checked = specificUserIds.includes(m.userId);
                    return (
                      <button
                        key={m.userId}
                        type="button"
                        onClick={() => toggleSpecificUser(m.userId)}
                        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5"
                        style={{
                          border: checked ? `1.5px solid ${COLOR}40` : "1.5px solid var(--roost-border)",
                          borderBottom: checked ? `3px solid ${COLOR_DARK}40` : "3px solid var(--roost-border-bottom)",
                          backgroundColor: checked ? `${COLOR}10` : "transparent",
                        }}
                      >
                        <MemberAvatar name={m.name} avatarColor={m.avatarColor} size="sm" />
                        <span className="flex-1 text-sm text-left" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
                          {m.name}
                        </span>
                        <div
                          className="flex h-5 w-5 items-center justify-center rounded"
                          style={{
                            backgroundColor: checked ? COLOR : "transparent",
                            border: checked ? `1.5px solid ${COLOR}` : "1.5px solid var(--roost-border)",
                          }}
                        >
                          {checked && <span className="text-[10px] text-white font-bold">✓</span>}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Save */}
          <motion.button
            type="button"
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending || !title.trim() || !dateStr}
            whileTap={{ y: 2 }}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm text-white"
            style={{
              backgroundColor: COLOR,
              border: `1.5px solid ${COLOR}`,
              borderBottom: `3px solid ${COLOR_DARK}`,
              fontWeight: 800,
              opacity: (saveMutation.isPending || !title.trim() || !dateStr) ? 0.6 : 1,
            }}
          >
            {saveMutation.isPending
              ? <Loader2 className="size-4 animate-spin" />
              : mode === "create" ? "Set Reminder" : "Save Changes"}
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
      </SheetContent>
    </Sheet>
  );
}
