'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { DraggableSheet } from '@/components/shared/DraggableSheet'
import { SECTION_COLORS } from '@/lib/constants/colors'
import { getCategoryColor } from '@/lib/constants/calendarCategories'
import type { CalendarEventFull, Member } from './EventSheet'

const COLOR = SECTION_COLORS.calendar.base
const COLOR_DARK = SECTION_COLORS.calendar.dark

interface DaySheetProps {
  open: boolean
  onClose: () => void
  date: Date | null
  events: CalendarEventFull[]
  currentUserId: string
  members: Member[]
  onAddEvent: (date: Date) => void
  onEditEvent: (event: CalendarEventFull) => void
}

const RSVP_OPTIONS = [
  { value: 'going',      label: 'Going' },
  { value: 'maybe',      label: 'Maybe' },
  { value: 'not_going',  label: "Can't make it" },
] as const

export default function DaySheet({
  open,
  onClose,
  date,
  events,
  currentUserId,
  members,
  onAddEvent,
  onEditEvent,
}: DaySheetProps) {
  const qc = useQueryClient()

  const rsvpMutation = useMutation({
    mutationFn: async ({ eventId, status }: { eventId: string; status: string }) => {
      const res = await fetch(`/api/calendar/${eventId}/rsvp`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to update RSVP')
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar'] })
    },
    onError: (err: Error) => {
      toast.error('Could not update RSVP', { description: err.message })
    },
  })

  if (!date) return null

  const dateHeading = format(date, 'EEEE, MMM d')
  const sorted = [...events].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  )

  return (
    <DraggableSheet
      open={open}
      onOpenChange={v => { if (!v) onClose() }}
      featureColor={COLOR}
      desktopMaxWidth={560}
    >
      <div className="px-4 pb-8">
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <p style={{ color: 'var(--roost-text-primary)', fontWeight: 800, fontSize: 18 }}>
            {dateHeading}
          </p>
          <motion.button
            type="button"
            whileTap={{ y: 1 }}
            onClick={() => { onClose(); onAddEvent(date) }}
            style={{
              height: 36,
              paddingLeft: 14,
              paddingRight: 14,
              borderRadius: 10,
              border: 'none',
              borderBottom: `3px solid ${COLOR_DARK}`,
              backgroundColor: COLOR,
              color: '#fff',
              fontSize: 13,
              fontWeight: 800,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 4,
            }}
          >
            <Plus size={14} />
            Add event
          </motion.button>
        </div>

        {/* Event list */}
        {sorted.length === 0 ? (
          <div
            style={{
              padding: '28px 16px',
              textAlign: 'center',
              borderRadius: 16,
              border: '2px dashed rgba(59,130,246,0.4)',
              backgroundColor: 'var(--roost-surface)',
            }}
          >
            <p style={{ color: 'var(--roost-text-muted)', fontSize: 14, fontWeight: 600 }}>
              Nothing scheduled
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {sorted.map(event => {
              const catColor = getCategoryColor(event.category)
              const startDt = new Date(event.startTime)
              const endDt = new Date(event.endTime)
              const timeStr = event.allDay
                ? 'All day'
                : `${format(startDt, 'h:mm a')} - ${format(endDt, 'h:mm a')}`

              const myAttendee = event.attendees.find(a => a.userId === currentUserId)
              const isAttendee = Boolean(myAttendee)

              return (
                <motion.button
                  key={`${event.id}-${event.startTime}`}
                  type="button"
                  whileTap={{ y: 1 }}
                  onClick={() => { onClose(); onEditEvent(event) }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '12px 14px',
                    borderRadius: 14,
                    border: '1.5px solid var(--roost-border)',
                    borderLeft: `4px solid ${catColor}`,
                    borderBottom: '3px solid var(--roost-border-bottom)',
                    backgroundColor: 'var(--roost-surface)',
                    cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
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
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        color: 'var(--roost-text-primary)',
                        fontWeight: 800,
                        fontSize: 14,
                        marginBottom: 2,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {event.title}
                      </p>
                      <p style={{ color: 'var(--roost-text-muted)', fontSize: 12, fontWeight: 600 }}>
                        {timeStr}
                      </p>
                      {event.location && (
                        <p style={{ color: 'var(--roost-text-muted)', fontSize: 12, fontWeight: 600, marginTop: 2 }}>
                          {event.location}
                        </p>
                      )}

                      {/* RSVP chips */}
                      {event.rsvpEnabled && isAttendee && (
                        <div
                          style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}
                          onClick={e => e.stopPropagation()}
                        >
                          {RSVP_OPTIONS.map(opt => {
                            const isSelected = myAttendee?.rsvpStatus === opt.value
                            return (
                              <button
                                key={opt.value}
                                type="button"
                                onClick={() =>
                                  rsvpMutation.mutate({ eventId: event.id, status: opt.value })
                                }
                                style={{
                                  padding: '4px 10px',
                                  borderRadius: 20,
                                  border: `1.5px solid ${isSelected ? COLOR : 'var(--roost-border)'}`,
                                  borderBottom: `2px solid ${isSelected ? COLOR_DARK : 'var(--roost-border-bottom)'}`,
                                  backgroundColor: isSelected ? COLOR + '18' : 'var(--roost-surface)',
                                  color: isSelected ? COLOR : 'var(--roost-text-muted)',
                                  fontSize: 11,
                                  fontWeight: 700,
                                  cursor: 'pointer',
                                }}
                              >
                                {opt.label}
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.button>
              )
            })}
          </div>
        )}
      </div>
    </DraggableSheet>
  )
}
