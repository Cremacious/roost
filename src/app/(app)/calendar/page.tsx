"use client";

import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/lib/auth/client";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isToday,
  isSameDay,
  isSameMonth,
  isPast,
  startOfDay,
  startOfMonth,
  startOfWeek,
  subMonths,
  addDays,
} from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { CalendarDays, CalendarX, ChevronLeft, ChevronRight, MapPin, MoreHorizontal, Plus, Repeat } from "lucide-react";
import { CALENDAR_CATEGORIES, getCategoryColor } from "@/lib/constants/calendarCategories";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import EmptyState from "@/components/shared/EmptyState";
import ErrorState from "@/components/shared/ErrorState";
import { Skeleton } from "@/components/ui/skeleton";
import MemberAvatar from "@/components/shared/MemberAvatar";
import EventSheet, { type CalendarEventFull, type Member } from "@/components/calendar/EventSheet";
import DaySheet from "@/components/calendar/DaySheet";
import PremiumGate from "@/components/shared/PremiumGate";

const COLOR = "#3B82F6";
const COLOR_DARK = "#1A5CB5";

// ---- Types ------------------------------------------------------------------

interface CalendarResponse {
  events: CalendarEventFull[];
}

interface MembersResponse {
  household: { id: string; name: string };
  members: Member[];
}

type ViewMode = "month" | "agenda";

// ---- Helpers ----------------------------------------------------------------

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

function agendaDateHeader(date: Date, today: Date): string {
  if (isSameDay(date, today)) return "Today";
  if (isSameDay(date, addDays(today, 1))) return "Tomorrow";
  return format(date, "EEEE, MMM d");
}

// ---- Agenda event more menu -------------------------------------------------

function AgendaMoreMenu({
  event,
  canEdit,
  onEdit,
  onDelete,
}: {
  event: CalendarEventFull;
  canEdit: boolean;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  if (!canEdit) return null;
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-12 w-12 items-center justify-center rounded-xl"
        style={{ color: "var(--roost-text-muted)" }}
      >
        <MoreHorizontal className="size-5" />
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.1 }}
              className="absolute right-0 top-full z-50 mt-1 min-w-36 overflow-hidden rounded-2xl py-1"
              style={{
                backgroundColor: "var(--roost-surface)",
                border: "1.5px solid var(--roost-border)",
                boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              }}
            >
              <button type="button" onClick={() => { setOpen(false); onEdit(); }}
                className="flex h-11 w-full items-center px-4 text-sm"
                style={{ color: "var(--roost-text-primary)", fontWeight: 600 }}>Edit</button>
              <button type="button" onClick={() => { setOpen(false); onDelete(); }}
                className="flex h-11 w-full items-center px-4 text-sm"
                style={{ color: "#EF4444", fontWeight: 600 }}>Delete</button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

// ---- Page -------------------------------------------------------------------

export default function CalendarPage() {
  const { data: sessionData } = useSession();
  const currentUserId = sessionData?.user?.id ?? "";
  const queryClient = useQueryClient();

  const [view, setView] = useState<ViewMode>("month");
  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()));

  // Sheet state
  const [daySheetOpen, setDaySheetOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [eventSheetOpen, setEventSheetOpen] = useState(false);
  const [upgradeCode, setUpgradeCode] = useState<string | null>(null);
  const [eventSheetMode, setEventSheetMode] = useState<"create" | "edit" | "view">("create");
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventFull | null>(null);
  const [initialDate, setInitialDate] = useState<Date | undefined>(undefined);

  // Category filter (desktop)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  // Mobile agenda-first date scroller state
  const [mobileSelectedDate, setMobileSelectedDate] = useState<Date>(() => startOfDay(new Date()));
  const agendaScrollRef = useRef<HTMLDivElement>(null);


  const month = currentMonth.getMonth() + 1;
  const year = currentMonth.getFullYear();

  // For agenda: always fetch today's context, not the navigated month
  const today = useMemo(() => startOfDay(new Date()), []);
  const agendaM0 = useMemo(() => startOfMonth(today), [today]);
  const agendaM1 = useMemo(() => addMonths(agendaM0, 1), [agendaM0]);
  const agendaM2 = useMemo(() => addMonths(agendaM0, 2), [agendaM0]);

  // ---- Queries ---------------------------------------------------------------

  const mainQuery = useQuery<CalendarResponse>({
    queryKey: ["calendar-events", year, month],
    queryFn: async () => {
      const r = await fetch(`/api/calendar?month=${month}&year=${year}`);
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to load events");
      }
      return r.json();
    },
    staleTime: 10_000,
    retry: 2,
  });

  // Agenda queries (today + 2 months ahead) — always enabled for mobile date scroller
  const agendaQ1 = useQuery<CalendarResponse>({
    queryKey: ["calendar-events", agendaM1.getFullYear(), agendaM1.getMonth() + 1],
    queryFn: async () => {
      const r = await fetch(`/api/calendar?month=${agendaM1.getMonth() + 1}&year=${agendaM1.getFullYear()}`);
      if (!r.ok) return { events: [] };
      return r.json();
    },
    staleTime: 10_000,
    retry: 2,
  });

  const agendaQ2 = useQuery<CalendarResponse>({
    queryKey: ["calendar-events", agendaM2.getFullYear(), agendaM2.getMonth() + 1],
    queryFn: async () => {
      const r = await fetch(`/api/calendar?month=${agendaM2.getMonth() + 1}&year=${agendaM2.getFullYear()}`);
      if (!r.ok) return { events: [] };
      return r.json();
    },
    staleTime: 10_000,
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

  // ---- Delete mutation -------------------------------------------------------

  const deleteMutation = useMutation({
    mutationFn: async (eventId: string) => {
      const r = await fetch(`/api/calendar/${eventId}`, { method: "DELETE" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        throw new Error(d.error ?? "Failed to delete event");
      }
    },
    onSuccess: () => {
      // Invalidate all cached calendar months
      queryClient.invalidateQueries({ queryKey: ["calendar-events"] });
      toast.success("Event deleted");
    },
    onError: (err: Error) => toast.error(err.message),
  });

  // ---- Derived data ----------------------------------------------------------

  const events = mainQuery.data?.events ?? [];
  const members = membersData?.members ?? [];
  const currentMember = members.find((m) => m.userId === currentUserId);
  const isAdmin = currentMember?.role === "admin";

  // All query keys for invalidation
  const allQueryKeys = [
    ["calendar-events", year, month],
    ["calendar-events", agendaM0.getFullYear(), agendaM0.getMonth() + 1],
    ["calendar-events", agendaM1.getFullYear(), agendaM1.getMonth() + 1],
    ["calendar-events", agendaM2.getFullYear(), agendaM2.getMonth() + 1],
  ];

  // Month grid
  const gridDays = useMemo(() => {
    const first = startOfMonth(currentMonth);
    const last = endOfMonth(currentMonth);
    return eachDayOfInterval({
      start: startOfWeek(first),
      end: endOfWeek(last),
    });
  }, [currentMonth]);

  const weeks = useMemo(() => {
    const result: Date[][] = [];
    for (let i = 0; i < gridDays.length; i += 7) result.push(gridDays.slice(i, i + 7));
    return result;
  }, [gridDays]);

  // Visible categories from current month events (for desktop filter pills)
  const visibleCategories = useMemo(() => {
    const slugs = new Set(
      (events ?? []).map((e: CalendarEventFull) => e.category).filter(Boolean) as string[]
    );
    return CALENDAR_CATEGORIES.filter((c) => slugs.has(c.slug));
  }, [events]);

  // Filtered events for desktop grid
  const filteredEvents = categoryFilter
    ? (events ?? []).filter((e: CalendarEventFull) => e.category === categoryFilter)
    : (events ?? []);

  // Events by date key (YYYY-MM-DD) — uses filteredEvents for desktop grid
  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEventFull[]>();
    for (const ev of filteredEvents) {
      const key = format(new Date(ev.start_time), "yyyy-MM-dd");
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [filteredEvents]);

  // Mobile date scroller: 7 days back + 60 days ahead
  const scrollDays = useMemo(() => {
    const base = startOfDay(new Date());
    return eachDayOfInterval({ start: addDays(base, -7), end: addDays(base, 60) });
  }, []);

  // Agenda events: today + 60 days — always computed for mobile date scroller
  const agendaEvents = useMemo(() => {
    const agendaStart = today;
    const agendaEnd = addDays(today, 60);
    const allEvents = [
      ...(mainQuery.data?.events ?? []),
      ...(agendaQ1.data?.events ?? []),
      ...(agendaQ2.data?.events ?? []),
    ];
    return allEvents
      .filter((ev) => {
        const d = new Date(ev.start_time);
        return d >= agendaStart && d <= agendaEnd;
      })
      .sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
  }, [today, mainQuery.data, agendaQ1.data, agendaQ2.data]);

  // Group agenda events by date
  const agendaGroups = useMemo(() => {
    const groups = new Map<string, { date: Date; events: CalendarEventFull[] }>();
    for (const ev of agendaEvents) {
      const d = startOfDay(new Date(ev.start_time));
      const key = format(d, "yyyy-MM-dd");
      if (!groups.has(key)) groups.set(key, { date: d, events: [] });
      groups.get(key)!.events.push(ev);
    }
    return Array.from(groups.values());
  }, [agendaEvents]);

  // ---- Handlers --------------------------------------------------------------

  function openCreate(date?: Date) {
    setSelectedEvent(null);
    setInitialDate(date);
    setEventSheetMode("create");
    setEventSheetOpen(true);
  }

  function openView(ev: CalendarEventFull) {
    setSelectedEvent(ev);
    setEventSheetMode("view");
    setEventSheetOpen(true);
  }

  function openEdit(ev: CalendarEventFull) {
    setSelectedEvent(ev);
    setEventSheetMode("edit");
    setEventSheetOpen(true);
  }

  function openDay(day: Date) {
    setSelectedDay(day);
    setDaySheetOpen(true);
  }

  function scrollToAgendaDate(date: Date) {
    setMobileSelectedDate(date);
    if (agendaScrollRef.current) {
      const el = agendaScrollRef.current.querySelector(
        `[data-agenda-date="${format(date, "yyyy-MM-dd")}"]`
      );
      if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  const dayEvents = useMemo(() => {
    if (!selectedDay) return [];
    const key = format(selectedDay, "yyyy-MM-dd");
    return eventsByDay.get(key) ?? [];
  }, [selectedDay, eventsByDay]);


  // ---- Render ----------------------------------------------------------------

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="py-4 pb-24 md:py-6"
      style={{ backgroundColor: "var(--roost-bg)" }}
    >
      <div className="w-full mx-auto px-4 sm:px-6 sm:max-w-5xl flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl" style={{ color: "var(--roost-text-primary)", fontWeight: 900 }}>
          Calendar
        </h1>
        <div className="flex items-center gap-2">
          {/* Add button */}
          <motion.button
            type="button"
            onClick={() => openCreate()}
            whileTap={{ y: 1 }}
            className="flex h-9 w-9 items-center justify-center rounded-xl"
            style={{
              backgroundColor: COLOR,
              border: `1.5px solid ${COLOR}`,
              borderBottom: `3px solid ${COLOR_DARK}`,
            }}
            aria-label="Add event"
          >
            <Plus className="size-4 text-white" />
          </motion.button>
          {/* View toggle (desktop only) */}
          <div
            className="hidden md:flex overflow-hidden rounded-xl"
            style={{
              border: "1.5px solid #BAD3F7",
              borderBottom: "3px solid #1A5CB5",
            }}
          >
            {(["month", "agenda"] as ViewMode[]).map((v, i) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                className="flex h-9 items-center px-3 text-sm"
                style={{
                  borderLeft: i > 0 ? "1px solid #BAD3F7" : undefined,
                  backgroundColor: view === v ? COLOR : "var(--roost-surface)",
                  color: view === v ? "white" : "#304050",
                  fontWeight: view === v ? 800 : 600,
                }}
              >
                {v === "month" ? "Month" : "Agenda"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading */}
      {mainQuery.isLoading && (
        <div className="space-y-2">
          <Skeleton className="h-8 w-48 rounded-xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      )}

      {/* Error */}
      {mainQuery.isError && !mainQuery.isLoading && (
        <ErrorState onRetry={() => mainQuery.refetch()} />
      )}

      {/* Month view */}
      {!mainQuery.isLoading && !mainQuery.isError && view === "month" && (
        <>
          {/* ── Mobile: agenda-first with date scroller ── */}
          <div className="block md:hidden">
            {/* Date scroller strip */}
            <div className="mb-3">
              <p className="mb-1.5 text-xs font-bold" style={{ color: "var(--roost-text-muted)" }}>
                {format(mobileSelectedDate, "MMMM yyyy")}
              </p>
              <div
                className="flex gap-2 overflow-x-auto pb-1"
                style={{ scrollbarWidth: "none" }}
              >
                {scrollDays.map((day) => {
                  const isTodayDay = isToday(day);
                  const isSelected = isSameDay(day, mobileSelectedDate);
                  const hasEvent = agendaEvents.some((e: CalendarEventFull) =>
                    isSameDay(new Date(e.start_time), day)
                  );
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => scrollToAgendaDate(day)}
                      className="flex shrink-0 flex-col items-center rounded-xl px-2.5 py-2 gap-0.5"
                      style={{
                        minWidth: 44,
                        background: isTodayDay
                          ? "#3B82F6"
                          : isSelected
                            ? "#DBEAFE"
                            : "var(--roost-surface)",
                        border: `1.5px solid ${isSelected || isTodayDay ? "#BAD3F7" : "var(--roost-border)"}`,
                      }}
                    >
                      <span
                        className="text-[10px] uppercase"
                        style={{
                          fontWeight: 700,
                          color: isTodayDay ? "rgba(255,255,255,0.8)" : "var(--roost-text-muted)",
                        }}
                      >
                        {format(day, "EEE")[0]}
                      </span>
                      <span
                        className="text-sm"
                        style={{
                          fontWeight: 800,
                          color: isTodayDay ? "#fff" : isSelected ? "#1D4ED8" : "var(--roost-text-primary)",
                        }}
                      >
                        {format(day, "d")}
                      </span>
                      {hasEvent && (
                        <span
                          style={{
                            width: 4,
                            height: 4,
                            borderRadius: "50%",
                            background: isTodayDay ? "rgba(255,255,255,0.7)" : "#3B82F6",
                            display: "block",
                          }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Agenda list */}
            <div ref={agendaScrollRef}>
              {agendaGroups.length === 0 ? (
                <EmptyState
                  color={COLOR}
                  icon={CalendarDays}
                  title="Wide open."
                  body="No events coming up. Either things are calm, or nobody told the app."
                  buttonLabel="Add an event"
                  onButtonClick={() => openCreate()}
                  containerBorderColor="rgba(59,130,246,0.4)"
                />
              ) : (
                agendaGroups.map(({ date, events: groupEvents }) => {
                  const label = agendaDateHeader(date, today);
                  return (
                    <div key={format(date, "yyyy-MM-dd")} data-agenda-date={format(date, "yyyy-MM-dd")} className="mb-4">
                      <p
                        className="mb-2 text-xs font-extrabold uppercase tracking-wide"
                        style={{ color: COLOR }}
                      >
                        {label}
                      </p>
                      <div className="space-y-2">
                        {groupEvents.map((event) => (
                          <motion.button
                            key={`${event.id}-${event.start_time}`}
                            type="button"
                            onClick={() => openView(event)}
                            whileTap={{ y: 1 }}
                            className="flex w-full items-start gap-3 rounded-2xl p-3 text-left"
                            style={{
                              backgroundColor: "var(--roost-surface)",
                              border: "1.5px solid var(--roost-border)",
                              borderLeft: `4px solid ${getCategoryColor(event.category)}`,
                            }}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                {event.isRecurring && (
                                  <Repeat className="size-3 shrink-0" style={{ color: "var(--roost-text-muted)" }} />
                                )}
                                <p
                                  className="text-sm"
                                  style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}
                                >
                                  {event.title}
                                </p>
                              </div>
                              <p
                                className="mt-0.5 text-xs"
                                style={{ color: getCategoryColor(event.category), fontWeight: 600 }}
                              >
                                {formatEventTime(event)}
                              </p>
                              {event.location && (
                                <div className="mt-0.5 flex items-center gap-1">
                                  <MapPin className="size-3" style={{ color: "var(--roost-text-muted)" }} />
                                  <span
                                    className="text-xs"
                                    style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}
                                  >
                                    {event.location}
                                  </span>
                                </div>
                              )}
                            </div>
                          </motion.button>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ── Desktop: full month grid + navigation (md: and above) ── */}
          <div className="hidden md:block">
            {/* Month navigation */}
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setCurrentMonth((m) => subMonths(m, 1))}
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{
                  backgroundColor: "var(--roost-surface)",
                  border: "1.5px solid var(--roost-border)",
                  color: "var(--roost-text-secondary)",
                }}
              >
                <ChevronLeft className="size-4" />
              </button>
              <div className="text-center">
                <p className="text-base" style={{ color: "var(--roost-text-primary)", fontWeight: 800 }}>
                  {format(currentMonth, "MMMM yyyy")}
                </p>
              </div>
              <div className="flex items-center gap-1">
                {!isSameMonth(currentMonth, new Date()) && (
                  <button
                    type="button"
                    onClick={() => setCurrentMonth(startOfMonth(new Date()))}
                    className="mr-1 flex h-7 items-center rounded-lg px-2.5 text-xs"
                    style={{
                      border: `1.5px solid ${COLOR}40`,
                      borderBottom: `2px solid ${COLOR_DARK}`,
                      color: COLOR,
                      fontWeight: 700,
                    }}
                  >
                    Today
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setCurrentMonth((m) => addMonths(m, 1))}
                  className="flex h-9 w-9 items-center justify-center rounded-full"
                  style={{
                    backgroundColor: "var(--roost-surface)",
                    border: "1.5px solid var(--roost-border)",
                    color: "var(--roost-text-secondary)",
                  }}
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>

            {/* Category filter pills */}
            {visibleCategories.length > 0 && (
              <div className="mb-3 hidden md:flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setCategoryFilter(null)}
                  className="rounded-full px-3 py-1 text-xs"
                  style={{
                    fontWeight: 700,
                    background: !categoryFilter ? "#0F172A" : "var(--roost-bg)",
                    color: !categoryFilter ? "#fff" : "var(--roost-text-secondary)",
                    border: `1.5px solid ${!categoryFilter ? "#0F172A" : "var(--roost-border)"}`,
                  }}
                >
                  All
                </button>
                {visibleCategories.map((cat) => (
                  <button
                    key={cat.slug}
                    type="button"
                    onClick={() => setCategoryFilter(categoryFilter === cat.slug ? null : cat.slug)}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
                    style={{
                      fontWeight: 700,
                      background: categoryFilter === cat.slug ? cat.color : "var(--roost-bg)",
                      color: categoryFilter === cat.slug ? "#fff" : "var(--roost-text-secondary)",
                      border: `1.5px solid ${categoryFilter === cat.slug ? cat.color : "var(--roost-border)"}`,
                    }}
                  >
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: categoryFilter === cat.slug ? "rgba(255,255,255,0.5)" : cat.color,
                        display: "inline-block",
                        flexShrink: 0,
                      }}
                    />
                    {cat.label}
                  </button>
                ))}
              </div>
            )}

            {/* Grid */}
            <div
              className="overflow-hidden rounded-2xl"
              style={{
                border: "1.5px solid #BAD3F7",
                borderBottom: `4px solid ${COLOR_DARK}`,
                backgroundColor: "var(--roost-surface)",
              }}
            >
              {/* Day headers */}
              <div className="grid grid-cols-7" style={{ borderBottom: "1px solid var(--roost-border)" }}>
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                  <div key={d} className="py-2 text-center text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 700 }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Weeks */}
              {weeks.map((week, wi) => (
                <div
                  key={wi}
                  className="grid grid-cols-7"
                  style={{ borderTop: wi > 0 ? "1px solid var(--roost-border)" : undefined }}
                >
                  {week.map((day) => {
                    const key = format(day, "yyyy-MM-dd");
                    const dayEvs = eventsByDay.get(key) ?? [];
                    const inMonth = isSameMonth(day, currentMonth);
                    const todayCell = isToday(day);
                    const pastDay = isPast(day) && !todayCell;

                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => openDay(day)}
                        className="flex min-h-12 flex-col gap-0.5 p-1 text-left md:min-h-20"
                        style={{
                          borderLeft: "1px solid var(--roost-border)",
                          backgroundColor: todayCell ? COLOR + "06" : undefined,
                        }}
                      >
                        <div className="flex h-6 w-6 items-center justify-center rounded-full text-xs"
                          style={{
                            backgroundColor: todayCell ? COLOR : undefined,
                            color: todayCell
                              ? "white"
                              : !inMonth || pastDay
                              ? "var(--roost-text-muted)"
                              : "var(--roost-text-primary)",
                            fontWeight: todayCell ? 900 : 700,
                          }}>
                          {format(day, "d")}
                        </div>
                        {dayEvs.slice(0, 2).map((ev) => (
                          <div
                            key={`${ev.id}-${ev.start_time}`}
                            className="flex w-full items-center gap-0.5 truncate rounded px-1 text-[11px] leading-5"
                            style={{
                              backgroundColor: getCategoryColor(ev.category) + "26",
                              color: getCategoryColor(ev.category),
                              fontWeight: 700,
                              borderBottom: `2px solid ${getCategoryColor(ev.category)}80`,
                            }}
                          >
                            {ev.isRecurring && <Repeat className="size-2.5 shrink-0" />}
                            <span className="truncate">{ev.title}</span>
                          </div>
                        ))}
                        {dayEvs.length > 2 && (
                          <span className="text-[10px]" style={{ color: COLOR, fontWeight: 700 }}>
                            +{dayEvs.length - 2} more
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* Agenda view */}
      {!mainQuery.isLoading && !mainQuery.isError && view === "agenda" && (
        <div className="space-y-4">
          {agendaGroups.length === 0 ? (
            <EmptyState
              icon={CalendarX}
              title="Wide open."
              body="No events today. Either life is calm or nobody told the calendar."
              buttonLabel="Add an event"
              onButtonClick={() => openCreate()}
              color={COLOR}
              containerBorderColor="rgba(59,130,246,0.4)"
            />
          ) : (
            agendaGroups.map((group) => {
              const headerLabel = agendaDateHeader(group.date, today);
              const isTodays = isSameDay(group.date, today);
              return (
                <div key={format(group.date, "yyyy-MM-dd")}>
                  {/* Date header */}
                  <p
                    className="mb-2 text-sm"
                    style={{
                      color: isTodays ? COLOR : "var(--roost-text-secondary)",
                      fontWeight: 800,
                    }}
                  >
                    {headerLabel}
                  </p>

                  {/* Events */}
                  <div className="space-y-2">
                    {group.events.map((ev, i) => {
                      const canEdit = ev.created_by === currentUserId || isAdmin;
                      return (
                        <motion.div
                          key={`${ev.id}-${ev.start_time}`}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(i * 0.04, 0.2), duration: 0.15 }}
                          className="flex min-h-16 items-center gap-3 rounded-2xl px-3 py-2"
                          style={{
                            backgroundColor: "var(--roost-surface)",
                            border: "1.5px solid var(--roost-border)",
                            borderBottom: `4px solid ${COLOR_DARK}`,
                          }}
                        >
                          {/* Date block */}
                          <button
                            type="button"
                            onClick={() => openView(ev)}
                            className="flex w-12 shrink-0 flex-col items-center rounded-xl py-2"
                            style={{
                              backgroundColor: COLOR + "18",
                              border: `1px solid ${COLOR}30`,
                              borderBottom: `3px solid ${COLOR_DARK}40`,
                            }}
                          >
                            <span className="text-xl leading-none" style={{ color: COLOR, fontWeight: 900 }}>
                              {format(new Date(ev.start_time), "d")}
                            </span>
                            <span className="text-[10px] uppercase" style={{ color: COLOR + "AA", fontWeight: 700 }}>
                              {format(new Date(ev.start_time), "MMM")}
                            </span>
                          </button>

                          {/* Content */}
                          <button
                            type="button"
                            onClick={() => openView(ev)}
                            className="min-w-0 flex-1 py-1 text-left"
                          >
                            <div className="flex items-center gap-1.5">
                              {ev.isRecurring && <Repeat className="size-3 shrink-0" style={{ color: "var(--roost-text-muted)" }} />}
                              <p className="text-sm leading-tight" style={{ color: "var(--roost-text-primary)", fontWeight: 700 }}>
                                {ev.title}
                              </p>
                            </div>
                            <p className="mt-0.5 text-xs" style={{ color: COLOR, fontWeight: 600 }}>
                              {formatEventTime(ev)}
                            </p>
                            {ev.creator_name && (
                              <div className="mt-1 flex items-center gap-1">
                                <MemberAvatar name={ev.creator_name} avatarColor={ev.creator_avatar} size="sm" />
                                <span className="text-xs" style={{ color: "var(--roost-text-muted)", fontWeight: 600 }}>
                                  {firstName(ev.creator_name)}
                                </span>
                                {ev.attendees.length > 0 && (
                                  <div className="ml-1 flex items-center gap-0.5">
                                    {ev.attendees.slice(0, 3).map((a) => (
                                      <MemberAvatar key={a.userId} name={a.name ?? "?"} avatarColor={a.avatarColor} size="sm" />
                                    ))}
                                    {ev.attendees.length > 3 && (
                                      <span className="text-[10px]" style={{ color: "var(--roost-text-muted)" }}>
                                        +{ev.attendees.length - 3}
                                      </span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </button>

                          {/* More menu */}
                          <AgendaMoreMenu
                            event={ev}
                            canEdit={canEdit}
                            onEdit={() => openEdit(ev)}
                            onDelete={() => deleteMutation.mutate(ev.id)}
                          />
                        </motion.div>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Day sheet */}
      <DaySheet
        open={daySheetOpen}
        onClose={() => setDaySheetOpen(false)}
        day={selectedDay}
        events={dayEvents}
        onAddEvent={(day) => openCreate(day)}
        onViewEvent={(ev) => openView(ev)}
        currentUserId={currentUserId}
      />

      {/* Event sheet */}
      <EventSheet
        open={eventSheetOpen}
        onClose={() => { setEventSheetOpen(false); setSelectedEvent(null); }}
        mode={eventSheetMode}
        event={selectedEvent}
        initialDate={initialDate}
        householdMembers={members}
        currentUserId={currentUserId}
        isAdmin={isAdmin}
        queryKeys={allQueryKeys}
        onUpgradeRequired={(code) => { setEventSheetOpen(false); setUpgradeCode(code); }}
      />

      {/* Upgrade prompt sheet */}
      {!!upgradeCode && (
        <PremiumGate feature="calendar" trigger="sheet" onClose={() => setUpgradeCode(null)} />
      )}
      </div>
    </motion.div>
  );
}
