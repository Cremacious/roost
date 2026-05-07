'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  List,
  Grid3x3,
} from 'lucide-react'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameDay,
  isSameMonth,
  addMonths,
  subMonths,
  isToday,
  parseISO,
  startOfDay,
  addDays,
  addWeeks,
  subWeeks,
} from 'date-fns'
import { useSession } from '@/lib/auth/client'
import { SECTION_COLORS } from '@/lib/constants/colors'
import { getCategoryColor } from '@/lib/constants/calendarCategories'
import EventSheet, { type CalendarEventFull, type Member } from '@/components/calendar/EventSheet'
import DaySheet from '@/components/calendar/DaySheet'

const COLOR = SECTION_COLORS.calendar.base
const COLOR_DARK = SECTION_COLORS.calendar.dark

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getEventsForDay(events: CalendarEventFull[], day: Date): CalendarEventFull[] {
  return events.filter(e => isSameDay(parseISO(e.startTime), day))
}

function groupEventsByDate(events: CalendarEventFull[]): Map<string, CalendarEventFull[]> {
  const map = new Map<string, CalendarEventFull[]>()
  for (const e of events) {
    const key = e.startTime.slice(0, 10)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(e)
  }
  return map
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CalendarPage() {
  const { data: sessionData } = useSession()
  const currentUserId = sessionData?.user?.id ?? ''

  const [currentMonth, setCurrentMonth] = useState(() => startOfMonth(new Date()))
  const [view, setView] = useState<'month' | 'agenda'>('month')
  const [selectedDay, setSelectedDay] = useState<Date | null>(null)
  const [editingEvent, setEditingEvent] = useState<CalendarEventFull | null>(null)
  const [addingWithDate, setAddingWithDate] = useState<Date | null>(null)
  const [showEventSheet, setShowEventSheet] = useState(false)

  // Mobile week state
  const [mobileWeekStart, setMobileWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 0 }))
  const [mobileSelectedDay, setMobileSelectedDay] = useState(() => startOfDay(new Date()))

  const year = currentMonth.getFullYear()
  const month = currentMonth.getMonth() + 1

  // Fetch events for current month + prev + next (for agenda coverage)
  const { data: eventsData, isLoading } = useQuery({
    queryKey: ['calendar', year, month],
    queryFn: async () => {
      const res = await fetch(`/api/calendar?year=${year}&month=${month}`)
      if (!res.ok) throw new Error('Failed to fetch events')
      return res.json() as Promise<{ events: CalendarEventFull[] }>
    },
    staleTime: 30_000,
  })

  // Also fetch adjacent months for agenda
  const prevMonth = subMonths(currentMonth, 1)
  const nextMonth = addMonths(currentMonth, 1)
  const { data: prevData } = useQuery({
    queryKey: ['calendar', prevMonth.getFullYear(), prevMonth.getMonth() + 1],
    queryFn: async () => {
      const res = await fetch(`/api/calendar?year=${prevMonth.getFullYear()}&month=${prevMonth.getMonth() + 1}`)
      if (!res.ok) throw new Error('Failed to fetch events')
      return res.json() as Promise<{ events: CalendarEventFull[] }>
    },
    staleTime: 30_000,
  })
  const { data: nextData } = useQuery({
    queryKey: ['calendar', nextMonth.getFullYear(), nextMonth.getMonth() + 1],
    queryFn: async () => {
      const res = await fetch(`/api/calendar?year=${nextMonth.getFullYear()}&month=${nextMonth.getMonth() + 1}`)
      if (!res.ok) throw new Error('Failed to fetch events')
      return res.json() as Promise<{ events: CalendarEventFull[] }>
    },
    staleTime: 30_000,
  })

  // Fetch members
  const { data: householdData } = useQuery({
    queryKey: ['household-me'],
    queryFn: async () => {
      const res = await fetch('/api/household/me')
      if (!res.ok) throw new Error('Failed to fetch household')
      return res.json() as Promise<{ members: Member[]; role: string }>
    },
    staleTime: 60_000,
  })

  const members: Member[] = householdData?.members ?? []

  const events: CalendarEventFull[] = eventsData?.events ?? []

  // All events across 3 months for agenda view
  const allAgendaEvents = useMemo(() => {
    const combined = [
      ...(prevData?.events ?? []),
      ...(eventsData?.events ?? []),
      ...(nextData?.events ?? []),
    ]
    // deduplicate by id+startTime
    const seen = new Set<string>()
    return combined
      .filter(e => {
        const key = `${e.id}:${e.startTime}`
        if (seen.has(key)) return false
        seen.add(key)
        return true
      })
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
      .filter(e => new Date(e.startTime) >= startOfDay(new Date()))
      .slice(0, 200)
  }, [prevData, eventsData, nextData])

  // Month grid days
  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  // Mobile week days
  const mobileWeekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => addDays(mobileWeekStart, i))
  }, [mobileWeekStart])

  const goMobileWeek = (dir: 1 | -1) => {
    const next = dir === 1 ? addWeeks(mobileWeekStart, 1) : subWeeks(mobileWeekStart, 1)
    setMobileWeekStart(next)
    // Sync month if we cross a boundary
    setCurrentMonth(startOfMonth(next))
  }

  const openEventSheet = (event?: CalendarEventFull | null, date?: Date) => {
    setEditingEvent(event ?? null)
    setAddingWithDate(date ?? null)
    setShowEventSheet(true)
  }

  const closeEventSheet = () => {
    setShowEventSheet(false)
    setEditingEvent(null)
    setAddingWithDate(null)
  }

  const openDaySheet = (day: Date) => {
    setSelectedDay(day)
  }

  // ─── Agenda groups ─────────────────────────────────────────────────────────
  const agendaGroups = useMemo(() => {
    const grouped = groupEventsByDate(allAgendaEvents)
    const today = startOfDay(new Date())
    const tomorrow = addDays(today, 1)
    return Array.from(grouped.entries()).map(([key, evs]) => {
      const date = parseISO(key)
      let label: string
      if (isSameDay(date, today)) label = 'Today'
      else if (isSameDay(date, tomorrow)) label = 'Tomorrow'
      else label = format(date, 'EEE, MMM d')
      return { key, date, label, events: evs }
    })
  }, [allAgendaEvents])

  // ─── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ padding: '16px 0' }}>
      {/* Header */}
      <div
        className="px-4"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <p style={{ color: 'var(--roost-text-primary)', fontWeight: 900, fontSize: 22 }}>
            Calendar
          </p>
          {/* Month/Agenda toggle (desktop) */}
          <div
            className="hidden md:flex"
            style={{
              border: '1.5px solid #BAD3F7',
              borderBottom: '3px solid #1A5CB5',
              borderRadius: 10,
              overflow: 'hidden',
              flexShrink: 0,
            }}
          >
            {(['month', 'agenda'] as const).map((v, i) => (
              <button
                key={v}
                type="button"
                onClick={() => setView(v)}
                style={{
                  padding: '6px 14px',
                  fontSize: 12,
                  fontWeight: 700,
                  border: 'none',
                  borderRight: i === 0 ? '1px solid #BAD3F7' : 'none',
                  backgroundColor: view === v ? COLOR + '18' : 'var(--roost-surface)',
                  color: view === v ? COLOR : '#304050',
                  cursor: 'pointer',
                }}
              >
                {v === 'month' ? 'Month' : 'Agenda'}
              </button>
            ))}
          </div>
        </div>

        {/* Add button */}
        <motion.button
          type="button"
          whileTap={{ y: 1 }}
          onClick={() => openEventSheet(null, undefined)}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            border: 'none',
            borderBottom: `3px solid ${COLOR_DARK}`,
            backgroundColor: COLOR,
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Plus size={20} />
        </motion.button>
      </div>

      {/* ── Desktop: Month Grid ── */}
      <div className="hidden md:block px-4">
        {view === 'month' ? (
          <div>
            {/* Month nav */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <button
                type="button"
                onClick={() => setCurrentMonth(m => subMonths(m, 1))}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: '1.5px solid var(--roost-border)',
                  backgroundColor: 'var(--roost-surface)',
                  color: 'var(--roost-text-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ChevronLeft size={16} />
              </button>
              <p style={{ color: 'var(--roost-text-primary)', fontWeight: 800, fontSize: 16, minWidth: 140, textAlign: 'center' }}>
                {format(currentMonth, 'MMMM yyyy')}
              </p>
              <button
                type="button"
                onClick={() => setCurrentMonth(m => addMonths(m, 1))}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  border: '1.5px solid var(--roost-border)',
                  backgroundColor: 'var(--roost-surface)',
                  color: 'var(--roost-text-primary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Month grid */}
            <div
              style={{
                border: '1.5px solid #BAD3F7',
                borderBottom: '4px solid #1A5CB5',
                borderRadius: 16,
                overflow: 'hidden',
              }}
            >
              {/* Weekday headers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', backgroundColor: '#EFF6FF' }}>
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                  <div key={d} style={{ padding: '8px 0', textAlign: 'center', fontSize: 11, fontWeight: 800, color: COLOR, letterSpacing: '0.05em' }}>
                    {d}
                  </div>
                ))}
              </div>

              {/* Day cells */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)' }}>
                {monthDays.map(day => {
                  const dayEvents = getEventsForDay(events, day)
                  const inMonth = isSameMonth(day, currentMonth)
                  const todayDay = isToday(day)
                  return (
                    <button
                      key={day.toISOString()}
                      type="button"
                      onClick={() => openDaySheet(day)}
                      style={{
                        minHeight: 80,
                        padding: '6px 4px',
                        borderTop: '1px solid #BAD3F7',
                        borderRight: '1px solid #BAD3F7',
                        backgroundColor: 'var(--roost-surface)',
                        textAlign: 'left',
                        verticalAlign: 'top',
                        cursor: 'pointer',
                        position: 'relative',
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          fontSize: 12,
                          fontWeight: todayDay ? 900 : 700,
                          color: todayDay ? '#fff' : inMonth ? 'var(--roost-text-primary)' : 'var(--roost-text-muted)',
                          backgroundColor: todayDay ? COLOR : 'transparent',
                          marginBottom: 2,
                        }}
                      >
                        {format(day, 'd')}
                      </span>
                      {/* Event pills */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {dayEvents.slice(0, 3).map(e => {
                          const catColor = getCategoryColor(e.category)
                          return (
                            <div
                              key={`${e.id}-${e.startTime}`}
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                color: catColor,
                                backgroundColor: catColor + '20',
                                borderRadius: 4,
                                borderBottom: `2px solid ${catColor}`,
                                padding: '1px 5px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                              }}
                            >
                              {e.title}
                            </div>
                          )
                        })}
                        {dayEvents.length > 3 && (
                          <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--roost-text-muted)', paddingLeft: 5 }}>
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        ) : (
          // Agenda view (desktop)
          <AgendaList groups={agendaGroups} onEditEvent={e => openEventSheet(e)} />
        )}
      </div>

      {/* ── Mobile Layout ── */}
      <div className="block md:hidden">
        {/* Week strip */}
        <div className="px-4" style={{ marginBottom: 12 }}>
          <div
            style={{
              border: '1.5px solid #BAD3F7',
              borderBottom: '4px solid #1A5CB5',
              borderRadius: 14,
              padding: '8px 4px',
              backgroundColor: 'var(--roost-surface)',
            }}
          >
            {/* Month nav header */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingLeft: 8, paddingRight: 8, marginBottom: 8 }}>
              <button
                type="button"
                onClick={() => goMobileWeek(-1)}
                style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', backgroundColor: 'transparent', color: 'var(--roost-text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <ChevronLeft size={16} />
              </button>
              <p style={{ fontSize: 13, fontWeight: 800, color: 'var(--roost-text-primary)' }}>
                {format(mobileWeekStart, 'MMMM yyyy')}
              </p>
              <button
                type="button"
                onClick={() => goMobileWeek(1)}
                style={{ width: 28, height: 28, borderRadius: '50%', border: 'none', backgroundColor: 'transparent', color: 'var(--roost-text-primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* 7-day strip */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
              {mobileWeekDays.map(day => {
                const selected = isSameDay(day, mobileSelectedDay)
                const todayDay = isToday(day)
                const dayEvents = getEventsForDay(events, day)
                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => {
                      setMobileSelectedDay(startOfDay(day))
                      setCurrentMonth(startOfMonth(day))
                    }}
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 2,
                      padding: '4px 2px',
                      borderRadius: 10,
                      border: 'none',
                      backgroundColor: selected ? '#DBEAFE' : 'transparent',
                      cursor: 'pointer',
                    }}
                  >
                    <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--roost-text-muted)' }}>
                      {format(day, 'EEEEE')}
                    </span>
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: selected ? 900 : todayDay ? 800 : 700,
                        color: todayDay ? '#fff' : selected ? '#1D4ED8' : 'var(--roost-text-primary)',
                        backgroundColor: todayDay ? COLOR : 'transparent',
                      }}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayEvents.length > 0 && (
                      <span style={{ width: 4, height: 4, borderRadius: '50%', backgroundColor: COLOR }} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Mobile day event list */}
        <div className="px-4">
          <MobileDayList
            day={mobileSelectedDay}
            events={getEventsForDay(events, mobileSelectedDay)}
            onAddEvent={d => openEventSheet(null, d)}
            onEditEvent={e => openEventSheet(e)}
          />
        </div>

        {/* FAB */}
        <motion.button
          type="button"
          whileTap={{ y: 2 }}
          onClick={() => openEventSheet(null, mobileSelectedDay)}
          style={{
            position: 'fixed',
            bottom: 80,
            right: 20,
            width: 56,
            height: 56,
            borderRadius: 18,
            border: 'none',
            borderBottom: `4px solid ${COLOR_DARK}`,
            backgroundColor: COLOR,
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(59,130,246,0.3)',
            zIndex: 40,
          }}
        >
          <Plus size={24} />
        </motion.button>
      </div>

      {/* DaySheet (desktop) */}
      <DaySheet
        open={Boolean(selectedDay)}
        onClose={() => setSelectedDay(null)}
        date={selectedDay}
        events={selectedDay ? getEventsForDay(events, selectedDay) : []}
        currentUserId={currentUserId}
        members={members}
        onAddEvent={d => openEventSheet(null, d)}
        onEditEvent={e => openEventSheet(e)}
      />

      {/* EventSheet */}
      <EventSheet
        open={showEventSheet}
        onClose={closeEventSheet}
        event={editingEvent}
        members={members}
        defaultDate={addingWithDate ?? undefined}
        currentUserId={currentUserId}
      />
    </div>
  )
}

// ─── Mobile Day List ───────────────────────────────────────────────────────────

function MobileDayList({
  day,
  events,
  onAddEvent,
  onEditEvent,
}: {
  day: Date
  events: CalendarEventFull[]
  onAddEvent: (d: Date) => void
  onEditEvent: (e: CalendarEventFull) => void
}) {
  const sorted = [...events].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <p style={{ color: 'var(--roost-text-primary)', fontWeight: 800, fontSize: 15 }}>
          {format(day, 'EEEE MMM d')}
        </p>
        {events.length > 0 && (
          <span
            style={{
              padding: '2px 8px',
              borderRadius: 20,
              backgroundColor: COLOR + '18',
              color: COLOR,
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            {events.length}
          </span>
        )}
      </div>

      {sorted.length === 0 ? (
        <div
          style={{
            padding: '20px 16px',
            textAlign: 'center',
            borderRadius: 14,
            border: '2px dashed rgba(59,130,246,0.4)',
          }}
        >
          <p style={{ color: 'var(--roost-text-muted)', fontSize: 13, fontWeight: 600 }}>
            Nothing scheduled
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {sorted.map(e => {
            const catColor = getCategoryColor(e.category)
            const startDt = new Date(e.startTime)
            return (
              <motion.button
                key={`${e.id}-${e.startTime}`}
                type="button"
                whileTap={{ y: 1 }}
                onClick={() => onEditEvent(e)}
                style={{
                  textAlign: 'left',
                  padding: '10px 14px',
                  borderRadius: 12,
                  border: '1.5px solid var(--roost-border)',
                  borderLeft: `4px solid ${catColor}`,
                  borderBottom: '3px solid var(--roost-border-bottom)',
                  backgroundColor: 'var(--roost-surface)',
                  cursor: 'pointer',
                }}
              >
                <p style={{ color: 'var(--roost-text-primary)', fontWeight: 800, fontSize: 13 }}>
                  {e.title}
                </p>
                <p style={{ color: 'var(--roost-text-muted)', fontSize: 11, fontWeight: 600, marginTop: 2 }}>
                  {e.allDay ? 'All day' : format(startDt, 'h:mm a')}
                  {e.creatorName && ` · ${e.creatorName}`}
                </p>
              </motion.button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Agenda List ───────────────────────────────────────────────────────────────

function AgendaList({
  groups,
  onEditEvent,
}: {
  groups: Array<{ key: string; date: Date; label: string; events: CalendarEventFull[] }>
  onEditEvent: (e: CalendarEventFull) => void
}) {
  if (groups.length === 0) {
    return (
      <div
        style={{
          padding: '40px 16px',
          textAlign: 'center',
          borderRadius: 16,
          border: '2px dashed rgba(59,130,246,0.4)',
          backgroundColor: 'var(--roost-surface)',
        }}
      >
        <p style={{ color: 'var(--roost-text-primary)', fontWeight: 800, fontSize: 16, marginBottom: 8 }}>
          Wide open.
        </p>
        <p style={{ color: 'var(--roost-text-muted)', fontSize: 14, fontWeight: 600 }}>
          No events coming up. Either things are calm, or nobody told the app.
        </p>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {groups.map(group => (
        <div key={group.key}>
          <p
            style={{
              fontSize: 12,
              fontWeight: 800,
              color: COLOR,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              marginBottom: 8,
            }}
          >
            {group.label}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {group.events.map(e => {
              const catColor = getCategoryColor(e.category)
              const startDt = new Date(e.startTime)
              const endDt = new Date(e.endTime)
              return (
                <motion.button
                  key={`${e.id}-${e.startTime}`}
                  type="button"
                  whileTap={{ y: 1 }}
                  onClick={() => onEditEvent(e)}
                  style={{
                    textAlign: 'left',
                    padding: '12px 14px',
                    borderRadius: 14,
                    border: '1.5px solid var(--roost-border)',
                    borderLeft: `4px solid ${catColor}`,
                    borderBottom: '3px solid var(--roost-border-bottom)',
                    backgroundColor: 'var(--roost-surface)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 10,
                  }}
                >
                  <div
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      backgroundColor: catColor,
                      flexShrink: 0,
                      marginTop: 5,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <p style={{ color: 'var(--roost-text-primary)', fontWeight: 800, fontSize: 14 }}>
                      {e.title}
                    </p>
                    <p style={{ color: 'var(--roost-text-muted)', fontSize: 12, fontWeight: 600, marginTop: 2 }}>
                      {e.allDay ? 'All day' : `${format(startDt, 'h:mm a')} - ${format(endDt, 'h:mm a')}`}
                    </p>
                    {e.location && (
                      <p style={{ color: 'var(--roost-text-muted)', fontSize: 12, fontWeight: 600, marginTop: 1 }}>
                        {e.location}
                      </p>
                    )}
                  </div>
                </motion.button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
