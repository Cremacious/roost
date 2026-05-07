'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Bell, CheckSquare, Clock, MapPin, Trash2, Users } from 'lucide-react'
import { toast } from 'sonner'
import { DayPicker } from 'react-day-picker'
import { format, parseISO } from 'date-fns'
import { DraggableSheet } from '@/components/shared/DraggableSheet'
import { SECTION_COLORS } from '@/lib/constants/colors'
import { CALENDAR_CATEGORIES } from '@/lib/constants/calendarCategories'

const COLOR = SECTION_COLORS.calendar.base   // #3B82F6
const COLOR_DARK = SECTION_COLORS.calendar.dark // #1A5CB5

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CalendarEventFull {
  id: string
  title: string
  description: string | null
  startTime: string
  endTime: string
  allDay: boolean
  recurring: boolean
  frequency: string | null
  repeatEndType: string | null
  repeatUntil: string | null
  repeatOccurrences: number | null
  category: string | null
  location: string | null
  notifyMemberIds: string | null
  rsvpEnabled: boolean
  createdBy: string
  creatorName: string
  attendees: Array<{ userId: string; name: string; avatarColor: string | null; rsvpStatus: string | null }>
  isRecurring: boolean
  templateStartTime: string
}

export interface Member {
  userId: string
  name: string
  avatarColor: string | null
  role: string
}

interface EventSheetProps {
  open: boolean
  onClose: () => void
  event?: CalendarEventFull | null
  members: Member[]
  defaultDate?: Date
  currentUserId: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return format(d, 'yyyy-MM-dd')
}

function toTimeStr(d: Date): string {
  return format(d, 'HH:mm')
}

function buildISO(dateStr: string, timeStr: string): string {
  return new Date(`${dateStr}T${timeStr}:00`).toISOString()
}

function getInitials(name: string): string {
  return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
}

// ─── Shared input style — calendar blue borders ────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 13px',
  borderRadius: 12,
  border: `1.5px solid #BAD3F7`,
  borderBottom: `3px solid ${COLOR_DARK}`,
  backgroundColor: '#fff',
  color: '#0F172A',
  fontSize: 14,
  fontWeight: 700,
  outline: 'none',
  fontFamily: 'inherit',
}

const nativePickerStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 13px',
  minHeight: 48,
  borderRadius: 12,
  border: `1.5px solid #BAD3F7`,
  borderBottom: `3px solid ${COLOR_DARK}`,
  backgroundColor: '#fff',
  color: '#0F172A',
  fontSize: 14,
  fontWeight: 700,
  outline: 'none',
  fontFamily: 'inherit',
}

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 800,
  color: '#374151',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  display: 'block',
  marginBottom: 5,
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function EventSheet({
  open,
  onClose,
  event,
  members,
  defaultDate,
  currentUserId,
}: EventSheetProps) {
  const isEdit = Boolean(event)
  const qc = useQueryClient()

  const today = new Date()

  // Form state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [location, setLocation] = useState('')
  const [category, setCategory] = useState<string>('')
  const [startDate, setStartDate] = useState(toDateStr(today))
  const [startTime, setStartTime] = useState('09:00')
  const [endDate, setEndDate] = useState(toDateStr(today))
  const [endTime, setEndTime] = useState('10:00')
  const [allDay, setAllDay] = useState(false)
  const [attendeeIds, setAttendeeIds] = useState<string[]>([])
  const [rsvpEnabled, setRsvpEnabled] = useState(false)
  const [notifyAll, setNotifyAll] = useState(false)
  const [notifySpecificIds, setNotifySpecificIds] = useState<string[]>([])
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)

  // Right-column: selected date for the mini calendar
  const [calMonth, setCalMonth] = useState<Date>(defaultDate ?? today)

  // Populate form when event/open changes
  useEffect(() => {
    if (event) {
      setTitle(event.title)
      setDescription(event.description ?? '')
      setLocation(event.location ?? '')
      setCategory(event.category ?? '')
      const s = new Date(event.startTime)
      const e = new Date(event.endTime)
      setStartDate(toDateStr(s))
      setStartTime(toTimeStr(s))
      setEndDate(toDateStr(e))
      setEndTime(toTimeStr(e))
      setAllDay(event.allDay)
      setCalMonth(s)
      setAttendeeIds(event.attendees.map(a => a.userId))
      setRsvpEnabled(event.rsvpEnabled)
      if (event.notifyMemberIds === 'all') {
        setNotifyAll(true); setNotifySpecificIds([])
      } else if (event.notifyMemberIds) {
        try { setNotifySpecificIds(JSON.parse(event.notifyMemberIds) as string[]) } catch { setNotifySpecificIds([]) }
        setNotifyAll(false)
      } else {
        setNotifyAll(false); setNotifySpecificIds([])
      }
    } else {
      const d = defaultDate ?? today
      setTitle(''); setDescription(''); setLocation(''); setCategory('')
      setStartDate(toDateStr(d)); setEndDate(toDateStr(d))
      setStartTime('09:00'); setEndTime('10:00')
      setAllDay(false); setCalMonth(d)
      setAttendeeIds([]); setRsvpEnabled(false)
      setNotifyAll(false); setNotifySpecificIds([])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event, defaultDate, open])

  const saveMutation = useMutation({
    mutationFn: async () => {
      const notifyMemberIds = notifyAll
        ? 'all'
        : notifySpecificIds.length > 0 ? notifySpecificIds : undefined

      const body = {
        title: title.trim(),
        description: description.trim() || undefined,
        startTime: allDay
          ? new Date(`${startDate}T00:00:00`).toISOString()
          : buildISO(startDate, startTime),
        endTime: allDay
          ? new Date(`${endDate}T23:59:59`).toISOString()
          : buildISO(endDate, endTime),
        allDay,
        category: category || undefined,
        location: location.trim() || undefined,
        notifyMemberIds,
        rsvpEnabled,
        attendeeIds,
      }

      const url = isEdit ? `/api/calendar/${event!.id}` : '/api/calendar'
      const method = isEdit ? 'PATCH' : 'POST'
      const res = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to save event')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar'] })
      toast.success(isEdit ? 'Event updated' : 'Event added')
      onClose()
    },
    onError: (err: Error) => {
      toast.error('Could not save event', { description: err.message })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/calendar/${event!.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? 'Failed to delete event')
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar'] })
      toast.success('Event deleted')
      setShowDeleteDialog(false)
      onClose()
    },
    onError: (err: Error) => {
      toast.error('Could not delete event', { description: err.message })
    },
  })

  const handleSave = () => {
    if (!title.trim()) {
      toast.error('Title is required', { description: 'Please enter an event title.' })
      return
    }
    saveMutation.mutate()
  }

  const toggleAttendee = (uid: string) =>
    setAttendeeIds(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid])

  const toggleNotifyMember = (uid: string) =>
    setNotifySpecificIds(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid])

  const handleNotifyAllToggle = () => {
    setNotifyAll(v => !v)
    setNotifySpecificIds([])
  }

  const canDelete =
    isEdit && (event?.createdBy === currentUserId || members.find(m => m.userId === currentUserId)?.role === 'admin')

  // Selected date for right-col calendar
  const selectedDate = startDate ? new Date(`${startDate}T12:00:00`) : undefined

  return (
    <>
      <DraggableSheet
        open={open}
        onOpenChange={v => { if (!v) onClose() }}
        featureColor={COLOR}
        desktopMaxWidth={860}
      >
        {/* Two-column grid on desktop */}
        <div className="grid sm:grid-cols-[1fr_260px]">

          {/* ── LEFT COLUMN — desktop only ── */}
          <div
            style={{ padding: '20px 24px 28px', borderRight: '1px solid #E2E8F0' }}
            className="hidden sm:flex flex-col gap-4"
          >
            <LeftColumn
              isEdit={isEdit}
              title={title} setTitle={setTitle}
              description={description} setDescription={setDescription}
              location={location} setLocation={setLocation}
              category={category} setCategory={setCategory}
              startDate={startDate} setStartDate={setStartDate}
              startTime={startTime} setStartTime={setStartTime}
              endDate={endDate} setEndDate={setEndDate}
              endTime={endTime} setEndTime={setEndTime}
              allDay={allDay} setAllDay={setAllDay}
              attendeeIds={attendeeIds} toggleAttendee={toggleAttendee}
              rsvpEnabled={rsvpEnabled} setRsvpEnabled={setRsvpEnabled}
              notifyAll={notifyAll} handleNotifyAllToggle={handleNotifyAllToggle}
              notifySpecificIds={notifySpecificIds} toggleNotifyMember={toggleNotifyMember}
              members={members}
              canDelete={canDelete}
              saveMutation={saveMutation}
              handleSave={handleSave}
              setShowDeleteDialog={setShowDeleteDialog}
            />
          </div>

          {/* Mobile single column */}
          <div className="flex flex-col gap-4 px-4 pb-8 sm:hidden">
            <LeftColumn
              isEdit={isEdit}
              title={title} setTitle={setTitle}
              description={description} setDescription={setDescription}
              location={location} setLocation={setLocation}
              category={category} setCategory={setCategory}
              startDate={startDate} setStartDate={setStartDate}
              startTime={startTime} setStartTime={setStartTime}
              endDate={endDate} setEndDate={setEndDate}
              endTime={endTime} setEndTime={setEndTime}
              allDay={allDay} setAllDay={setAllDay}
              attendeeIds={attendeeIds} toggleAttendee={toggleAttendee}
              rsvpEnabled={rsvpEnabled} setRsvpEnabled={setRsvpEnabled}
              notifyAll={notifyAll} handleNotifyAllToggle={handleNotifyAllToggle}
              notifySpecificIds={notifySpecificIds} toggleNotifyMember={toggleNotifyMember}
              members={members}
              canDelete={canDelete}
              saveMutation={saveMutation}
              handleSave={handleSave}
              setShowDeleteDialog={setShowDeleteDialog}
            />
          </div>

          {/* ── RIGHT COLUMN — desktop only ── */}
          <div
            className="hidden sm:flex flex-col"
            style={{
              padding: '20px 18px',
              backgroundColor: '#FAFBFF',
            }}
          >
            {/* Mini calendar */}
            <style>{`
              .roost-mini-cal .rdp-root { --rdp-font-size: 12px; }
              .roost-mini-cal .rdp-day { width: 28px; height: 28px; font-size: 12px; font-weight: 700; }
              .roost-mini-cal .rdp-day_button { width: 28px; height: 28px; border-radius: 50%; }
              .roost-mini-cal .rdp-weekday { font-size: 10px; font-weight: 700; color: #94A3B8; }
              .roost-mini-cal [data-selected] .rdp-day_button { background: #3B82F6 !important; color: #fff !important; }
              .roost-mini-cal [data-today]:not([data-selected]) .rdp-day_button { background: #DBEAFE; color: #1D4ED8; }
              .roost-mini-cal .rdp-caption_label { font-size: 13px; font-weight: 800; color: #1E293B; }
              .roost-mini-cal .rdp-nav_button { width: 28px; height: 28px; border-radius: 50%; border: 1.5px solid #E2E8F0; background: white; color: #475569; }
            `}</style>
            <div className="roost-mini-cal">
              <DayPicker
                mode="single"
                selected={selectedDate}
                month={calMonth}
                onMonthChange={setCalMonth}
                onSelect={(d) => {
                  if (d) {
                    const ds = toDateStr(d)
                    setStartDate(ds)
                    if (ds > endDate) setEndDate(ds)
                    setCalMonth(d)
                  }
                }}
              />
            </div>

            <div style={{ height: 1, backgroundColor: '#E2E8F0', margin: '8px 0 12px' }} />

            {/* Selected date label */}
            <p style={{ fontSize: 11, fontWeight: 800, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>
              {selectedDate ? format(selectedDate, 'EEE MMM d') : 'No date selected'}
            </p>

            {/* Category legend */}
            <div style={{ height: 1, backgroundColor: '#E2E8F0', margin: '12px 0 8px' }} />
            <p style={{ fontSize: 10, fontWeight: 800, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>
              Category colors
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {CALENDAR_CATEGORIES.map(cat => (
                <div key={cat.slug} style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: cat.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: '#475569' }}>{cat.label}</span>
                </div>
              ))}
            </div>
          </div>

        </div>
      </DraggableSheet>

      {/* Delete confirm */}
      {showDeleteDialog && (
        <div
          style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '0 24px' }}
          onClick={() => setShowDeleteDialog(false)}
        >
          <div
            style={{ backgroundColor: 'var(--roost-surface)', borderRadius: 16, padding: 24, maxWidth: 380, width: '100%', border: '1.5px solid var(--roost-border)' }}
            onClick={e => e.stopPropagation()}
          >
            <p style={{ color: 'var(--roost-text-primary)', fontWeight: 800, fontSize: 16, marginBottom: 8 }}>Delete event?</p>
            <p style={{ color: 'var(--roost-text-muted)', fontSize: 14, fontWeight: 600, marginBottom: 20 }}>
              {event?.isRecurring ? 'All occurrences will be removed. This cannot be undone.' : 'This event will be permanently deleted.'}
            </p>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowDeleteDialog(false)}
                style={{ padding: '8px 16px', borderRadius: 10, border: '1.5px solid var(--roost-border)', backgroundColor: 'var(--roost-surface)', color: 'var(--roost-text-primary)', fontWeight: 700, cursor: 'pointer' }}>
                Cancel
              </button>
              <button type="button" onClick={() => deleteMutation.mutate()} disabled={deleteMutation.isPending}
                style={{ padding: '8px 16px', borderRadius: 10, border: 'none', backgroundColor: '#EF4444', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: deleteMutation.isPending ? 0.7 : 1 }}>
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── Left Column (shared between mobile + desktop) ────────────────────────────

interface LeftColProps {
  isEdit: boolean
  title: string; setTitle: (v: string) => void
  description: string; setDescription: (v: string) => void
  location: string; setLocation: (v: string) => void
  category: string; setCategory: (v: string) => void
  startDate: string; setStartDate: (v: string) => void
  startTime: string; setStartTime: (v: string) => void
  endDate: string; setEndDate: (v: string) => void
  endTime: string; setEndTime: (v: string) => void
  allDay: boolean; setAllDay: (fn: (v: boolean) => boolean) => void
  attendeeIds: string[]; toggleAttendee: (uid: string) => void
  rsvpEnabled: boolean; setRsvpEnabled: (fn: (v: boolean) => boolean) => void
  notifyAll: boolean; handleNotifyAllToggle: () => void
  notifySpecificIds: string[]; toggleNotifyMember: (uid: string) => void
  members: Member[]
  canDelete: boolean
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  saveMutation: any
  handleSave: () => void
  setShowDeleteDialog: (v: boolean) => void
}

function LeftColumn({
  isEdit, title, setTitle, description, setDescription, location, setLocation,
  category, setCategory, startDate, setStartDate, startTime, setStartTime,
  endDate, setEndDate, endTime, setEndTime, allDay, setAllDay,
  attendeeIds, toggleAttendee, rsvpEnabled, setRsvpEnabled,
  notifyAll, handleNotifyAllToggle, notifySpecificIds, toggleNotifyMember,
  members, canDelete, saveMutation, handleSave, setShowDeleteDialog,
}: LeftColProps) {
  return (
    <>
      <p style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>
        {isEdit ? 'Edit event' : 'New event'}
      </p>

      {/* Title */}
      <input
        type="text"
        placeholder="Event title"
        value={title}
        onChange={e => setTitle(e.target.value)}
        style={{ ...inputStyle, fontSize: 16, fontWeight: 800, borderBottomWidth: 4 }}
      />

      {/* All day row */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '8px 13px', backgroundColor: '#F8FAFC',
        border: '1.5px solid #BAD3F7', borderBottom: `3px solid ${COLOR_DARK}`, borderRadius: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#374151' }}>
          <Clock size={15} style={{ color: COLOR }} />
          All day
        </div>
        <TogglePill on={allDay} onToggle={() => setAllDay(v => !v)} />
      </div>

      {/* Date + time — native inputs open OS picker on mobile */}
      <div style={{ display: 'grid', gridTemplateColumns: allDay ? '1fr' : '1fr 1fr', gap: 8 }}>
        <div>
          <label style={labelStyle}>Start date</label>
          <input type="date" value={startDate}
            onChange={e => { setStartDate(e.target.value); if (e.target.value > endDate) setEndDate(e.target.value) }}
            style={nativePickerStyle} />
        </div>
        {!allDay && (
          <div>
            <label style={labelStyle}>Start time</label>
            <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} style={nativePickerStyle} />
          </div>
        )}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: allDay ? '1fr' : '1fr 1fr', gap: 8 }}>
        <div>
          <label style={labelStyle}>End date</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} style={nativePickerStyle} />
        </div>
        {!allDay && (
          <div>
            <label style={labelStyle}>End time</label>
            <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} style={nativePickerStyle} />
          </div>
        )}
      </div>

      {/* Category */}
      <div>
        <label style={labelStyle}>Category</label>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          <button type="button" onClick={() => setCategory('')}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 11px', borderRadius: 20, fontSize: 12, fontWeight: 700,
              border: !category ? `1.5px solid ${COLOR}` : '1.5px solid transparent',
              backgroundColor: !category ? COLOR : '#F1F5F9',
              color: !category ? '#fff' : '#475569', cursor: 'pointer',
            }}>
            None
          </button>
          {CALENDAR_CATEGORIES.map(cat => {
            const active = category === cat.slug
            return (
              <button key={cat.slug} type="button" onClick={() => setCategory(active ? '' : cat.slug)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '5px 11px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                  border: '1.5px solid transparent',
                  backgroundColor: active ? cat.color : '#F1F5F9',
                  color: active ? '#fff' : '#475569', cursor: 'pointer',
                }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: active ? 'rgba(255,255,255,0.5)' : cat.color, flexShrink: 0 }} />
                {cat.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Location */}
      <div>
        <label style={labelStyle}>Location</label>
        <div style={{ position: 'relative' }}>
          <MapPin size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94A3B8', pointerEvents: 'none' }} />
          <input type="text" placeholder="Add a location" value={location}
            onChange={e => setLocation(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 36 }} />
        </div>
      </div>

      {/* Attendees */}
      {members.length > 0 && (
        <div>
          <label style={labelStyle}>Who&apos;s going</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {members.map(m => {
              const sel = attendeeIds.includes(m.userId)
              return (
                <button key={m.userId} type="button" onClick={() => toggleAttendee(m.userId)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '5px 10px 5px 5px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                    border: sel ? '1.5px solid #BAD3F7' : '1.5px solid #E2E8F0',
                    backgroundColor: sel ? '#EFF6FF' : '#F8FAFC',
                    color: sel ? '#1E40AF' : '#475569',
                  }}>
                  <MiniAvatar name={m.name} color={m.avatarColor} />
                  {m.name.split(' ')[0]}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* RSVP — shown when attendees selected, blue-tinted card */}
      {attendeeIds.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '8px 13px', marginTop: -8,
          backgroundColor: '#EFF6FF', border: '1.5px solid #BAD3F7',
          borderBottom: `3px solid ${COLOR_DARK}`, borderRadius: 12,
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, fontWeight: 700, color: '#1E40AF' }}>
              <CheckSquare size={14} style={{ color: COLOR }} />
              Ask for RSVP
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: COLOR, marginTop: 2 }}>
              Attendees can mark attending, maybe, or no
            </div>
          </div>
          <TogglePill on={rsvpEnabled} onToggle={() => setRsvpEnabled(v => !v)} />
        </div>
      )}

      {/* Notes */}
      <div>
        <label style={labelStyle}>Notes</label>
        <textarea placeholder="Any extra details" value={description}
          onChange={e => setDescription(e.target.value)} rows={3}
          style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.5 }} />
      </div>

      {/* Notify section — card */}
      <div style={{
        backgroundColor: '#F8FAFC', border: '1.5px solid #E2E8F0',
        borderBottom: '3px solid #94A3B8', borderRadius: 12, padding: '12px 14px',
        display: 'flex', flexDirection: 'column', gap: 10,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, fontWeight: 800, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
          <Bell size={13} style={{ color: '#374151' }} />
          Notify when saved
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {/* All household — dark fill */}
          <button type="button" onClick={handleNotifyAllToggle}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
              border: '1.5px solid transparent',
              backgroundColor: notifyAll ? '#0F172A' : '#fff',
              color: notifyAll ? '#fff' : '#475569',
              borderColor: notifyAll ? '#0F172A' : '#E2E8F0',
            }}>
            <Users size={11} />
            All household
          </button>
          {/* Individual member chips */}
          {members.map(m => {
            const sel = notifySpecificIds.includes(m.userId)
            return (
              <button key={m.userId} type="button"
                onClick={() => { if (!notifyAll) toggleNotifyMember(m.userId) }}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px 4px 5px', borderRadius: 20, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  border: '1.5px solid',
                  borderColor: sel ? '#BAD3F7' : '#E2E8F0',
                  backgroundColor: (notifyAll || sel) ? '#EFF6FF' : '#fff',
                  color: (notifyAll || sel) ? '#1E40AF' : '#475569',
                  opacity: notifyAll ? 0.6 : 1,
                }}>
                <MiniAvatar name={m.name} color={m.avatarColor} size={16} fontSize={8} />
                {m.name.split(' ')[0]}
              </button>
            )
          })}
        </div>
        <p style={{ fontSize: 11, fontWeight: 600, color: '#94A3B8' }}>
          Selected members get a push notification when this event is saved
        </p>
      </div>

      {/* Save */}
      <motion.button type="button" whileTap={{ y: 1 }} disabled={saveMutation.isPending}
        onClick={handleSave}
        style={{
          width: '100%', height: 50, borderRadius: 14, border: 'none',
          borderBottom: `4px solid ${COLOR_DARK}`, backgroundColor: COLOR,
          color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer',
          opacity: saveMutation.isPending ? 0.7 : 1,
        }}>
        {saveMutation.isPending ? 'Saving...' : isEdit ? 'Save changes' : 'Save event'}
      </motion.button>

      {canDelete && (
        <motion.button type="button" whileTap={{ y: 1 }} onClick={() => setShowDeleteDialog(true)}
          style={{
            width: '100%', height: 44, borderRadius: 14,
            border: '1.5px solid #E2E8F0', borderBottom: '3px solid #E2E8F0',
            backgroundColor: '#F8FAFC', color: '#EF4444',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          }}>
          <Trash2 size={15} />
          Delete event
        </motion.button>
      )}
    </>
  )
}

// ─── Mini helpers ─────────────────────────────────────────────────────────────

function TogglePill({ on, onToggle }: { on: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-label="Toggle"
      style={{
        width: 40, height: 22, borderRadius: 11, border: 'none', flexShrink: 0, cursor: 'pointer',
        backgroundColor: on ? COLOR : '#CBD5E1', position: 'relative', transition: 'background-color 0.15s',
      }}>
      <span style={{
        position: 'absolute', top: 2,
        left: on ? 20 : 2,
        width: 18, height: 18, borderRadius: '50%', backgroundColor: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)', transition: 'left 0.15s',
      }} />
    </button>
  )
}

function MiniAvatar({ name, color, size = 22, fontSize = 10 }: { name: string; color: string | null; size?: number; fontSize?: number }) {
  return (
    <span style={{
      width: size, height: size, borderRadius: '50%',
      backgroundColor: color ?? SECTION_COLORS.calendar.base,
      color: '#fff', fontSize, fontWeight: 800,
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      {name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
    </span>
  )
}
