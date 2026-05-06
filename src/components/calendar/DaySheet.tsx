"use client";

import { motion } from "framer-motion";
import { MapPin, Plus, Repeat } from "lucide-react";
import { format } from "date-fns";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import DraggableSheet from "@/components/shared/DraggableSheet";
import MemberAvatar from "@/components/shared/MemberAvatar";
import { getCategoryColor } from "@/lib/constants/calendarCategories";
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
  currentUserId: string;
}

export default function DaySheet({
  open,
  onClose,
  day,
  events,
  onAddEvent,
  onViewEvent,
  currentUserId,
}: DaySheetProps) {
  const queryClient = useQueryClient();

  const rsvpMutation = useMutation({
    mutationFn: async ({ eventId, status }: { eventId: string; status: string }) => {
      const r = await fetch(`/api/calendar/${eventId}/rsvp`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rsvp_status: status }),
      });
      if (!r.ok) throw new Error("Failed to update RSVP");
      return r.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["calendar"] }),
    onError: () => toast.error("Could not save RSVP", { description: "Please try again." }),
  });

  if (!day) return null;

  const dateLabel = format(day, "EEEE, MMMM d");

  return (
    <DraggableSheet open={open} onOpenChange={(v) => !v && onClose()} featureColor="#3B82F6">
      <div className="px-4 pb-8" style={{ maxHeight: "calc(80dvh - 60px)" }}>
        <p className="mb-4 text-lg" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
          {dateLabel}
        </p>

        <div className="space-y-2">
          {events.length === 0 ? (
            <motion.button
              type="button"
              onClick={() => { onClose(); onAddEvent(day); }}
              whileTap={{ y: 1 }}
              className="flex w-full flex-col items-center gap-2 rounded-2xl px-6 py-8 text-center"
              style={{
                border: "2px dashed rgba(59,130,246,0.4)",
                color: "var(--roost-text-muted)",
              }}
            >
              <p className="text-sm" style={{ fontWeight: 700 }}>Nothing on this day.</p>
              <p className="text-sm" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                Add something?
              </p>
            </motion.button>
          ) : (
            events.map((event, i) => {
              const categoryColor = event.category
                ? getCategoryColor(event.category)
                : COLOR_DARK;

              return (
                <motion.button
                  key={`${event.id}-${event.start_time}`}
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
                    borderBottom: `4px solid ${categoryColor}`,
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
                    {/* Title row with category dot and repeat icon */}
                    <div className="flex items-center gap-1.5">
                      {event.category && (
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: getCategoryColor(event.category),
                            flexShrink: 0,
                            display: "inline-block",
                          }}
                        />
                      )}
                      {event.isRecurring && (
                        <Repeat className="size-3 shrink-0" style={{ color: "var(--roost-text-muted)" }} />
                      )}
                      <p className="text-sm leading-tight" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
                        {event.title}
                      </p>
                    </div>

                    {/* Time */}
                    <p className="mt-1 text-xs" style={{ color: COLOR, fontWeight: 600 }}>
                      {formatEventTime(event)}
                    </p>

                    {/* Location */}
                    {event.location && (
                      <div className="mt-0.5 flex items-center gap-1">
                        <MapPin className="size-3 shrink-0" style={{ color: "var(--roost-text-muted)" }} />
                        <span className="text-xs font-semibold" style={{ color: "var(--roost-text-muted)" }}>
                          {event.location}
                        </span>
                      </div>
                    )}

                    {/* Creator */}
                    {event.creator_name && (
                      <div className="mt-1.5 flex items-center gap-1">
                        <MemberAvatar name={event.creator_name} avatarColor={event.creator_avatar} size="sm" />
                        <span className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                          {firstName(event.creator_name)}
                        </span>
                      </div>
                    )}

                    {/* Attendee avatars */}
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

                    {/* RSVP chips — shown when event has RSVP enabled and current user is an attendee */}
                    {event.rsvp_enabled &&
                      event.attendees.some((a) => a.userId === currentUserId) && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {(["attending", "maybe", "not_attending"] as const).map((status) => {
                            const myRsvp = event.attendees.find((a) => a.userId === currentUserId)?.rsvpStatus;
                            const labels: Record<string, string> = {
                              attending: "Going",
                              maybe: "Maybe",
                              not_attending: "Can't make it",
                            };
                            const colors: Record<string, string> = {
                              attending: "#22C55E",
                              maybe: "#F59E0B",
                              not_attending: "#EF4444",
                            };
                            const active = myRsvp === status;
                            return (
                              <button
                                key={status}
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  rsvpMutation.mutate({ eventId: event.id, status });
                                }}
                                className="rounded-full px-2.5 py-1 text-[11px]"
                                style={{
                                  fontWeight: 700,
                                  background: active ? colors[status] : "var(--roost-bg)",
                                  color: active ? "#fff" : colors[status],
                                  border: `1.5px solid ${colors[status]}`,
                                }}
                              >
                                {labels[status]}
                              </button>
                            );
                          })}
                        </div>
                      )}

                    {/* RSVP summary — shown to the event creator */}
                    {event.rsvp_enabled &&
                      event.created_by === currentUserId &&
                      event.attendees.length > 0 && (
                        <p className="mt-1.5 text-[11px] font-semibold" style={{ color: "var(--roost-text-muted)" }}>
                          {event.attendees
                            .filter((a) => a.rsvpStatus)
                            .map((a) => {
                              const label =
                                a.rsvpStatus === "attending"
                                  ? "Going"
                                  : a.rsvpStatus === "maybe"
                                    ? "Maybe"
                                    : "No";
                              return `${(a.name ?? "?").split(" ")[0]}: ${label}`;
                            })
                            .join(" · ") || "No responses yet"}
                        </p>
                      )}
                  </div>
                </motion.button>
              );
            })
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
      </div>
    </DraggableSheet>
  );
}
