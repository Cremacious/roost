"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { format } from "date-fns";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import MemberAvatar from "@/components/shared/MemberAvatar";
import type { CalendarEventFull } from "./EventSheet";

const COLOR = "#3B82F6";
const COLOR_DARK = "#1A5CB5";

function formatEventTime(event: CalendarEventFull): string {
  if (event.all_day) return "All day";
  const start = format(new Date(event.start_time), "h:mm a");
  if (!event.end_time) return start;
  return `${start} - ${format(new Date(event.end_time), "h:mm a")}`;
}

function firstName(name: string | null): string {
  if (!name) return "Someone";
  return name.split(" ")[0];
}

interface DaySheetProps {
  open: boolean;
  onClose: () => void;
  day: Date | null;
  events: CalendarEventFull[];
  onAddEvent: (day: Date) => void;
  onViewEvent: (event: CalendarEventFull) => void;
}

export default function DaySheet({
  open,
  onClose,
  day,
  events,
  onAddEvent,
  onViewEvent,
}: DaySheetProps) {
  if (!day) return null;

  const dateLabel = format(day, "EEEE, MMMM d");

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl px-4 pb-8 pt-2"
        style={{ backgroundColor: "var(--roost-surface)", maxHeight: "80dvh", overflowY: "auto" }}
      >
        <div className="mx-auto mb-4 h-1 w-10 rounded-full" style={{ backgroundColor: "var(--roost-border)" }} />
        <SheetHeader className="mb-4 text-left">
          <SheetTitle style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
            {dateLabel}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-2">
          {events.length === 0 ? (
            <motion.button
              type="button"
              onClick={() => { onClose(); onAddEvent(day); }}
              whileTap={{ y: 1 }}
              className="flex w-full flex-col items-center gap-2 rounded-2xl px-6 py-8 text-center"
              style={{
                border: "1.5px dashed #E5E7EB",
                borderBottom: "3px dashed #1A5CB5",
                color: "var(--roost-text-muted)",
              }}
            >
              <p className="text-sm" style={{ fontWeight: 700 }}>Nothing on this day.</p>
              <p className="text-sm" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                Add something?
              </p>
            </motion.button>
          ) : (
            events.map((event, i) => (
              <motion.button
                key={event.id}
                type="button"
                onClick={() => { onClose(); onViewEvent(event); }}
                whileTap={{ y: 1 }}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04, duration: 0.15 }}
                className="flex w-full items-start gap-3 rounded-2xl p-4 text-left"
                style={{
                  backgroundColor: "var(--roost-bg)",
                  border: "1.5px solid var(--roost-border)",
                  borderBottom: `4px solid ${COLOR_DARK}`,
                }}
              >
                {/* Date block */}
                <div
                  className="flex w-12 shrink-0 flex-col items-center rounded-xl py-2"
                  style={{
                    backgroundColor: COLOR + "18",
                    border: `1px solid ${COLOR}30`,
                    borderBottom: `3px solid ${COLOR_DARK}40`,
                  }}
                >
                  <span className="text-xl leading-none" style={{ color: COLOR, fontWeight: 900 }}>
                    {format(new Date(event.start_time), "d")}
                  </span>
                  <span className="text-[10px] uppercase" style={{ color: COLOR + "AA", fontWeight: 700 }}>
                    {format(new Date(event.start_time), "MMM")}
                  </span>
                </div>

                {/* Content */}
                <div className="min-w-0 flex-1">
                  <p className="text-sm leading-tight" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
                    {event.title}
                  </p>
                  <p className="mt-1 text-xs" style={{ color: COLOR, fontWeight: 600 }}>
                    {formatEventTime(event)}
                  </p>
                  {event.creator_name && (
                    <div className="mt-1.5 flex items-center gap-1">
                      <MemberAvatar name={event.creator_name} avatarColor={event.creator_avatar} size="sm" />
                      <span className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                        {firstName(event.creator_name)}
                      </span>
                    </div>
                  )}
                  {event.attendees.length > 0 && (
                    <div className="mt-1.5 flex items-center gap-1">
                      {event.attendees.slice(0, 4).map((a) => (
                        <MemberAvatar key={a.userId} name={a.name ?? "?"} avatarColor={a.avatarColor} size="sm" />
                      ))}
                      {event.attendees.length > 4 && (
                        <span className="text-[10px]" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                          +{event.attendees.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </motion.button>
            ))
          )}
        </div>

        {/* Add event button */}
        <motion.button
          type="button"
          onClick={() => { onClose(); onAddEvent(day); }}
          whileTap={{ y: 1 }}
          className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm text-white"
          style={{
            backgroundColor: COLOR,
            border: `1.5px solid ${COLOR}`,
            borderBottom: `3px solid ${COLOR_DARK}`,
            fontWeight: 800,
          }}
        >
          <Plus className="size-4" />
          Add event
        </motion.button>
      </SheetContent>
    </Sheet>
  );
}
