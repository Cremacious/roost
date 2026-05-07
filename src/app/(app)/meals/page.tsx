'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Plus, ChevronLeft, ChevronRight, UtensilsCrossed, Search,
  ThumbsUp, ThumbsDown, Trophy, ShoppingCart, Pencil, Trash2,
  Clock, BookmarkCheck, X,
} from 'lucide-react'
import { toast } from 'sonner'
import { useSession } from '@/lib/auth/client'
import { SECTION_COLORS } from '@/lib/constants/colors'
import { SlabCard } from '@/components/ui/SlabCard'
import { DraggableSheet } from '@/components/shared/DraggableSheet'

const COLOR = SECTION_COLORS.meals.base
const COLOR_DARK = SECTION_COLORS.meals.dark

// ── Types ──────────────────────────────────────────────────────────────────────

type Tab = 'planner' | 'bank' | 'suggestions'
type SlotType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
type MealCategory = 'breakfast' | 'lunch' | 'dinner' | 'snack'

interface IngredientItem {
  name: string
  quantity?: string
  unit?: string
}

interface Meal {
  id: string
  name: string
  category: MealCategory | null
  description: string | null
  prepTime: number | null
  ingredients: string
  createdBy: string
}

interface PlannerSlot {
  id: string
  mealId: string
  mealName: string
  mealCategory: MealCategory | null
  slotDate: string
  slotType: SlotType
  createdBy: string
}

interface Suggestion {
  id: string
  name: string
  ingredients: string
  note: string | null
  prepTime: number | null
  targetSlotDate: string | null
  targetSlotType: SlotType | null
  status: 'suggested' | 'in_bank'
  upvotes: number
  downvotes: number
  userVote: 'up' | 'down' | null
  suggestedBy: string
  suggesterName: string | null
  createdAt: string
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const SLOT_TYPES: SlotType[] = ['breakfast', 'lunch', 'dinner', 'snack']
const SLOT_LABELS: Record<SlotType, string> = {
  breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack',
}

const UNITS = ['cups', 'tbsp', 'tsp', 'oz', 'g', 'lbs', 'ml', 'whole', 'to taste', 'pinch']

function parseIngredients(raw: string): IngredientItem[] {
  try {
    const arr = JSON.parse(raw)
    if (!Array.isArray(arr) || arr.length === 0) return []
    if (typeof arr[0] === 'string') return (arr as string[]).map(s => ({ name: s }))
    return arr as IngredientItem[]
  } catch { return [] }
}

const getMonday = (d: Date) => {
  const date = new Date(d)
  const day = date.getDay()
  const diff = date.getDate() - day + (day === 0 ? -6 : 1)
  date.setDate(diff)
  date.setHours(0, 0, 0, 0)
  return date
}

const fmtDate = (d: Date) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

const todayStr = () => fmtDate(new Date())
const tomorrowStr = () => { const d = new Date(); d.setDate(d.getDate() + 1); return fmtDate(d) }
const weekendStr = () => {
  const d = new Date()
  const day = d.getDay()
  const daysUntilSat = day === 6 ? 0 : 6 - day
  d.setDate(d.getDate() + daysUntilSat)
  return fmtDate(d)
}

const getDayLabel = (d: Date) => {
  const ds = fmtDate(d)
  if (ds === todayStr()) return 'Today'
  if (ds === tomorrowStr()) return 'Tomorrow'
  return d.toLocaleDateString('en-US', { weekday: 'short' })
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
  letterSpacing: '0.07em', color: '#374151', marginBottom: 6, display: 'block',
}
const INPUT_STYLE: React.CSSProperties = {
  width: '100%', border: '1.5px solid var(--roost-border)',
  borderBottom: '3px solid var(--roost-border)', borderRadius: 12,
  padding: '12px 14px', fontSize: 15, fontWeight: 600,
  backgroundColor: 'var(--roost-surface)', color: 'var(--roost-text-primary)',
  outline: 'none', boxSizing: 'border-box',
}

// ── IngredientEditor ──────────────────────────────────────────────────────────

function IngredientEditor({
  ingredients, onChange,
}: { ingredients: IngredientItem[]; onChange: (items: IngredientItem[]) => void }) {
  function update(i: number, patch: Partial<IngredientItem>) {
    onChange(ingredients.map((item, idx) => idx === i ? { ...item, ...patch } : item))
  }
  function remove(i: number) { onChange(ingredients.filter((_, idx) => idx !== i)) }
  function add() { onChange([...ingredients, { name: '' }]) }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {ingredients.map((item, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <input
            type="text"
            value={item.quantity ?? ''}
            onChange={e => update(i, { quantity: e.target.value })}
            placeholder="qty"
            style={{ ...INPUT_STYLE, width: 52, padding: '10px 8px', fontSize: 14 }}
          />
          <select
            value={item.unit ?? ''}
            onChange={e => update(i, { unit: e.target.value })}
            style={{ ...INPUT_STYLE, width: 90, padding: '10px 6px', fontSize: 13 }}
          >
            <option value="">unit</option>
            {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <input
            type="text"
            value={item.name}
            onChange={e => update(i, { name: e.target.value })}
            placeholder="ingredient"
            style={{ ...INPUT_STYLE, flex: 1, padding: '10px 12px', fontSize: 14 }}
          />
          <button
            type="button"
            onClick={() => remove(i)}
            style={{ width: 36, height: 44, borderRadius: 10, border: '1.5px solid var(--roost-border)', borderBottom: '3px solid var(--roost-border)', backgroundColor: 'var(--roost-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
          >
            <X size={13} color="var(--roost-text-muted)" />
          </button>
        </div>
      ))}
      <button
        type="button"
        onClick={add}
        style={{
          width: '100%', padding: '10px 0', borderRadius: 12, fontSize: 13, fontWeight: 700,
          border: '1.5px dashed var(--roost-border)', borderBottom: '2px dashed var(--roost-border)',
          backgroundColor: 'transparent', color: 'var(--roost-text-muted)', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
        }}
      >
        <Plus size={13} /> Add ingredient
      </button>
    </div>
  )
}

// ── GroceryPushSheet ──────────────────────────────────────────────────────────

function GroceryPushSheet({
  open, onClose, mealName, mealId, ingredients,
}: { open: boolean; onClose: () => void; mealName: string; mealId: string; ingredients: IngredientItem[] }) {
  const [busy, setBusy] = useState(false)
  const [checked, setChecked] = useState<Set<number>>(() => new Set(ingredients.map((_, i) => i)))

  const prevOpen = useRef(false)
  if (open && !prevOpen.current) {
    setChecked(new Set(ingredients.map((_, i) => i)))
  }
  prevOpen.current = open

  async function handleAdd() {
    const selected = ingredients.filter((_, i) => checked.has(i))
    if (selected.length === 0) { toast.error('Nothing selected', { description: 'Pick at least one ingredient.' }); return }
    setBusy(true)
    try {
      const r = await fetch(`/api/meals/${mealId}/add-to-grocery`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedIndices: [...checked] }),
      })
      if (!r.ok) throw new Error((await r.json()).error ?? 'Failed')
      const { added } = await r.json()
      toast.success(`Added ${added} item${added === 1 ? '' : 's'} to grocery list`)
      onClose()
    } catch (e) { toast.error('Could not add ingredients', { description: (e as Error).message }) }
    finally { setBusy(false) }
  }

  return (
    <DraggableSheet open={open} onOpenChange={(v: boolean) => !v && onClose()} featureColor={COLOR}>
      <div className="px-4 pb-8">
        <p className="mb-1 text-lg" style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}>Add to grocery list</p>
        <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)', marginBottom: 16 }}>{mealName}</p>
        {ingredients.length === 0 ? (
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--roost-text-secondary)', textAlign: 'center', padding: '24px 0' }}>No ingredients saved for this meal.</p>
        ) : (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 16 }}>
              {ingredients.map((ing, i) => {
                const label = [ing.quantity, ing.unit, ing.name].filter(Boolean).join(' ')
                const isChecked = checked.has(i)
                return (
                  <button key={i} type="button" onClick={() => {
                    const next = new Set(checked)
                    if (isChecked) next.delete(i); else next.add(i)
                    setChecked(next)
                  }} style={{
                    display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                    borderRadius: 10, border: `1.5px solid ${isChecked ? COLOR + '40' : 'var(--roost-border)'}`,
                    borderBottom: `3px solid ${isChecked ? COLOR_DARK + '60' : 'var(--roost-border)'}`,
                    backgroundColor: isChecked ? COLOR + '10' : 'var(--roost-surface)', cursor: 'pointer', textAlign: 'left',
                  }}>
                    <span style={{ width: 18, height: 18, borderRadius: 6, border: `2px solid ${isChecked ? COLOR : 'var(--roost-border)'}`, backgroundColor: isChecked ? COLOR : 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {isChecked && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                    </span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--roost-text-primary)' }}>{label}</span>
                  </button>
                )
              })}
            </div>
            <button type="button" onClick={() => setChecked(checked.size === ingredients.length ? new Set() : new Set(ingredients.map((_, i) => i)))} style={{
              fontSize: 12, fontWeight: 700, color: COLOR, background: 'none', border: 'none', cursor: 'pointer', padding: '0 0 12px', display: 'block',
            }}>
              {checked.size === ingredients.length ? 'Deselect all' : 'Select all'}
            </button>
            <button type="button" onClick={handleAdd} disabled={busy || checked.size === 0} style={{
              width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', borderBottom: `3px solid ${COLOR_DARK}`,
              backgroundColor: COLOR, color: '#fff', fontWeight: 800, fontSize: 15,
              cursor: busy ? 'not-allowed' : 'pointer', opacity: (busy || checked.size === 0) ? 0.6 : 1,
            }}>
              {busy ? 'Adding...' : `Add ${checked.size} item${checked.size === 1 ? '' : 's'} to list`}
            </button>
          </>
        )}
      </div>
    </DraggableSheet>
  )
}

// ── MealSheet ─────────────────────────────────────────────────────────────────

function MealSheet({
  open, onClose, meal, onSaved,
}: { open: boolean; onClose: () => void; meal: Meal | null; onSaved: () => void }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<MealCategory | ''>('')
  const [description, setDescription] = useState('')
  const [prepTime, setPrepTime] = useState('')
  const [ingredients, setIngredients] = useState<IngredientItem[]>([{ name: '' }, { name: '' }])
  const [saving, setSaving] = useState(false)

  const prevOpen = useRef(false)
  if (open && !prevOpen.current) {
    setName(meal?.name ?? '')
    setCategory(meal?.category ?? '')
    setDescription(meal?.description ?? '')
    setPrepTime(meal?.prepTime ? String(meal.prepTime) : '')
    const parsed = parseIngredients(meal?.ingredients ?? '[]')
    setIngredients(parsed.length > 0 ? parsed : [{ name: '' }, { name: '' }])
  }
  prevOpen.current = open

  async function handleSave() {
    if (!name.trim()) { toast.error('Name required', { description: 'Give the meal a name.' }); return }
    setSaving(true)
    try {
      const filtered = ingredients.filter(i => i.name.trim())
      const body = { name: name.trim(), category: category || null, description: description.trim() || null, prepTime: prepTime ? parseInt(prepTime, 10) : null, ingredients: filtered }
      const url = meal ? `/api/meals/${meal.id}` : '/api/meals'
      const r = await fetch(url, { method: meal ? 'PATCH' : 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
      if (!r.ok) throw new Error((await r.json()).error ?? 'Failed')
      toast.success(meal ? 'Meal updated' : 'Meal added to bank')
      onSaved()
      onClose()
    } catch (e) { toast.error('Could not save', { description: (e as Error).message }) }
    finally { setSaving(false) }
  }

  return (
    <DraggableSheet open={open} onOpenChange={(v: boolean) => !v && onClose()} featureColor={COLOR}>
      <div className="px-4 pb-8">
        <p className="mb-5 text-lg" style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}>
          {meal ? 'Edit meal' : 'Add to meal bank'}
        </p>
        <div style={{ marginBottom: 14 }}>
          <label style={LABEL_STYLE}>Name</label>
          <input style={INPUT_STYLE} placeholder="e.g. Chicken tacos" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={LABEL_STYLE}>Category</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {SLOT_TYPES.map(c => (
              <button key={c} type="button" onClick={() => setCategory(category === c ? '' : c)} style={{
                padding: '7px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none',
                borderBottom: `2px solid ${category === c ? COLOR_DARK : 'var(--roost-border)'}`,
                backgroundColor: category === c ? COLOR : 'var(--roost-surface)',
                color: category === c ? '#fff' : 'var(--roost-text-secondary)', cursor: 'pointer',
              }}>{SLOT_LABELS[c]}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={LABEL_STYLE}>Prep time (minutes)</label>
          <input style={INPUT_STYLE} type="number" placeholder="30" value={prepTime} onChange={e => setPrepTime(e.target.value)} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={LABEL_STYLE}>
            Ingredients
            <span style={{ fontWeight: 600, textTransform: 'none', fontSize: 11, color: 'var(--roost-text-muted)', marginLeft: 6 }}>optional</span>
          </label>
          <IngredientEditor ingredients={ingredients} onChange={setIngredients} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={LABEL_STYLE}>Notes</label>
          <textarea style={{ ...INPUT_STYLE, minHeight: 70, resize: 'vertical' }}
            placeholder="Tips, variations, links" value={description} onChange={e => setDescription(e.target.value)} />
        </div>
        <button type="button" onClick={handleSave} disabled={saving} style={{
          width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', borderBottom: `3px solid ${COLOR_DARK}`,
          backgroundColor: COLOR, color: '#fff', fontWeight: 800, fontSize: 15, cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
        }}>
          {saving ? 'Saving...' : meal ? 'Save changes' : 'Add to bank'}
        </button>
      </div>
    </DraggableSheet>
  )
}

// ── SlotPickerSheet ───────────────────────────────────────────────────────────

function SlotPickerSheet({
  open, onClose, day, slotType, existingSlot, bankMeals, onSaved, onRemoved, preSelectedMeal,
}: {
  open: boolean; onClose: () => void; day: Date | null; slotType: SlotType | null
  existingSlot: PlannerSlot | null; bankMeals: Meal[]; onSaved: () => void; onRemoved: () => void
  preSelectedMeal?: Meal | null
}) {
  const [mode, setMode] = useState<'menu' | 'bank' | 'quick' | 'datePickerForMeal'>('menu')
  const [search, setSearch] = useState('')
  const [quickName, setQuickName] = useState('')
  const [saveToBankToggle, setSaveToBankToggle] = useState(false)
  const [pickerDay, setPickerDay] = useState<Date>(new Date())
  const [pickerSlotType, setPickerSlotType] = useState<SlotType>('dinner')
  const [busy, setBusy] = useState(false)

  const prevOpen = useRef(false)
  if (open && !prevOpen.current) {
    if (preSelectedMeal) {
      setMode('datePickerForMeal')
      setPickerDay(new Date())
      setPickerSlotType('dinner')
    } else {
      setMode('menu')
    }
    setSearch(''); setQuickName(''); setSaveToBankToggle(false)
  }
  prevOpen.current = open

  const filtered = bankMeals.filter(m => m.name.toLowerCase().includes(search.toLowerCase()))

  const effectiveDay = preSelectedMeal ? pickerDay : day
  const effectiveSlotType = preSelectedMeal ? pickerSlotType : slotType

  async function pickMeal(mealId: string) {
    if (!effectiveDay || !effectiveSlotType) return
    setBusy(true)
    try {
      const r = await fetch('/api/meals/planner', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mealId, slotDate: fmtDate(effectiveDay), slotType: effectiveSlotType }),
      })
      if (!r.ok) throw new Error((await r.json()).error ?? 'Failed')
      toast.success(`Added to ${getDayLabel(effectiveDay)} ${SLOT_LABELS[effectiveSlotType]}`)
      onSaved(); onClose()
    } catch (e) { toast.error('Could not add', { description: (e as Error).message }) }
    finally { setBusy(false) }
  }

  async function handleQuickAdd() {
    if (!quickName.trim() || !effectiveDay || !effectiveSlotType) return
    setBusy(true)
    try {
      let mealId: string
      if (saveToBankToggle) {
        const mealRes = await fetch('/api/meals', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: quickName.trim(), ingredients: [] }),
        })
        if (!mealRes.ok) throw new Error((await mealRes.json()).error ?? 'Failed')
        const { meal } = await mealRes.json()
        mealId = meal.id
      } else {
        // Save without adding to bank: create a temporary meal entry for the slot
        const mealRes = await fetch('/api/meals', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: quickName.trim(), ingredients: [], skipBank: true }),
        })
        if (!mealRes.ok) throw new Error((await mealRes.json()).error ?? 'Failed')
        const { meal } = await mealRes.json()
        mealId = meal.id
      }
      await pickMeal(mealId)
    } catch (e) {
      toast.error('Could not add', { description: (e as Error).message })
      setBusy(false)
    }
  }

  async function handleRemove() {
    if (!existingSlot) return
    setBusy(true)
    try {
      const r = await fetch(`/api/meals/planner/${existingSlot.id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error('Failed')
      toast.success('Removed from plan')
      onRemoved(); onClose()
    } catch (e) { toast.error('Could not remove', { description: (e as Error).message }) }
    finally { setBusy(false) }
  }

  const title = preSelectedMeal
    ? `Plan: ${preSelectedMeal.name}`
    : existingSlot ? 'Change meal' : `Plan ${slotType ? SLOT_LABELS[slotType] : 'meal'}`

  // 7-day picker for bank card "add to planner"
  const pickerDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() + i)
    return d
  })

  return (
    <DraggableSheet open={open} onOpenChange={(v: boolean) => !v && onClose()} featureColor={COLOR}>
      <div className="px-4 pb-8">
        <p className="mb-1 text-lg" style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}>{title}</p>
        {existingSlot && !preSelectedMeal && (
          <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)', marginBottom: 16 }}>
            Currently: {existingSlot.mealName}
          </p>
        )}
        {!existingSlot && !preSelectedMeal && <div style={{ marginBottom: 16 }} />}

        {/* Date picker mode (from bank card + button) */}
        {mode === 'datePickerForMeal' && preSelectedMeal && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={LABEL_STYLE}>Which day</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {pickerDays.map(d => {
                  const ds = fmtDate(d)
                  const isActive = fmtDate(pickerDay) === ds
                  return (
                    <button key={ds} type="button" onClick={() => setPickerDay(d)} style={{
                      padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700, border: 'none',
                      borderBottom: `2px solid ${isActive ? COLOR_DARK : 'var(--roost-border)'}`,
                      backgroundColor: isActive ? COLOR : 'var(--roost-surface)',
                      color: isActive ? '#fff' : 'var(--roost-text-secondary)', cursor: 'pointer',
                    }}>{getDayLabel(d)}</button>
                  )
                })}
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={LABEL_STYLE}>Which meal</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {SLOT_TYPES.map(s => (
                  <button key={s} type="button" onClick={() => setPickerSlotType(s)} style={{
                    padding: '7px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none',
                    borderBottom: `2px solid ${pickerSlotType === s ? COLOR_DARK : 'var(--roost-border)'}`,
                    backgroundColor: pickerSlotType === s ? COLOR : 'var(--roost-surface)',
                    color: pickerSlotType === s ? '#fff' : 'var(--roost-text-secondary)', cursor: 'pointer',
                  }}>{SLOT_LABELS[s]}</button>
                ))}
              </div>
            </div>
            <button type="button" onClick={() => pickMeal(preSelectedMeal.id)} disabled={busy} style={{
              width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', borderBottom: `3px solid ${COLOR_DARK}`,
              backgroundColor: COLOR, color: '#fff', fontWeight: 800, fontSize: 15,
              cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1,
            }}>{busy ? 'Adding...' : `Add to ${getDayLabel(pickerDay)} ${SLOT_LABELS[pickerSlotType]}`}</button>
          </>
        )}

        {/* Normal menu mode */}
        {mode === 'menu' && !preSelectedMeal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <button type="button" onClick={() => setMode('bank')} style={{
              width: '100%', padding: '14px 0', borderRadius: 14, border: '1.5px solid var(--roost-border)',
              borderBottom: `3px solid ${COLOR_DARK}`, backgroundColor: COLOR, color: '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer',
            }}>Pick from meal bank</button>
            <button type="button" onClick={() => setMode('quick')} style={{
              width: '100%', padding: '14px 0', borderRadius: 14, border: '1.5px solid var(--roost-border)',
              borderBottom: '3px solid var(--roost-border)', backgroundColor: 'var(--roost-surface)',
              color: 'var(--roost-text-primary)', fontWeight: 800, fontSize: 15, cursor: 'pointer',
            }}>Quick add by name</button>
            {existingSlot && (
              <button type="button" onClick={handleRemove} disabled={busy} style={{
                width: '100%', padding: '12px 0', borderRadius: 14, border: 'none', backgroundColor: 'transparent',
                color: '#EF4444', fontWeight: 700, fontSize: 14, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
                <Trash2 size={14} /> Remove from plan
              </button>
            )}
          </div>
        )}

        {/* Bank search mode */}
        {mode === 'bank' && (
          <>
            <div style={{ position: 'relative', marginBottom: 10 }}>
              <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--roost-text-muted)' }} />
              <input style={{ ...INPUT_STYLE, paddingLeft: 34 }} placeholder="Search meals..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 300, overflowY: 'auto' }}>
              {filtered.length === 0 ? (
                <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)', textAlign: 'center', padding: 24 }}>No meals found</p>
              ) : filtered.map(m => (
                <button key={m.id} type="button" onClick={() => pickMeal(m.id)} disabled={busy} style={{
                  width: '100%', padding: '12px 14px', borderRadius: 12, textAlign: 'left',
                  border: '1.5px solid var(--roost-border)', borderBottom: '3px solid var(--roost-border)',
                  backgroundColor: 'var(--roost-surface)', cursor: 'pointer',
                }}>
                  <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: 'var(--roost-text-primary)' }}>{m.name}</p>
                  {m.category && <p style={{ margin: '2px 0 0', fontSize: 11, fontWeight: 700, color: COLOR }}>{SLOT_LABELS[m.category]}</p>}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Quick add mode */}
        {mode === 'quick' && (
          <>
            <div style={{ marginBottom: 14 }}>
              <label style={LABEL_STYLE}>Meal name</label>
              <input style={INPUT_STYLE} placeholder="e.g. Pasta night" value={quickName}
                onChange={e => setQuickName(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleQuickAdd()} />
            </div>
            {/* Save to bank toggle */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <button
                type="button"
                role="switch"
                aria-checked={saveToBankToggle}
                onClick={() => setSaveToBankToggle(v => !v)}
                style={{ position: 'relative', width: 40, height: 22, borderRadius: 11, backgroundColor: saveToBankToggle ? COLOR : 'var(--roost-border)', border: 'none', cursor: 'pointer', flexShrink: 0 }}
              >
                <span style={{ position: 'absolute', top: 3, left: saveToBankToggle ? 21 : 3, width: 16, height: 16, borderRadius: 8, backgroundColor: '#fff', transition: 'left 0.15s' }} />
              </button>
              <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--roost-text-secondary)' }}>Also save to meal bank</span>
            </div>
            <button type="button" onClick={handleQuickAdd} disabled={busy || !quickName.trim()} style={{
              width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', borderBottom: `3px solid ${COLOR_DARK}`,
              backgroundColor: COLOR, color: '#fff', fontWeight: 800, fontSize: 15,
              cursor: busy ? 'not-allowed' : 'pointer', opacity: busy ? 0.7 : 1,
            }}>{busy ? 'Adding...' : 'Add to plan'}</button>
          </>
        )}

        {mode !== 'menu' && mode !== 'datePickerForMeal' && (
          <button type="button" onClick={() => setMode('menu')} style={{
            marginTop: 10, width: '100%', padding: '10px 0', borderRadius: 12, border: 'none',
            backgroundColor: 'transparent', color: 'var(--roost-text-secondary)', fontWeight: 700, fontSize: 13, cursor: 'pointer',
          }}>Back</button>
        )}
      </div>
    </DraggableSheet>
  )
}

// ── SuggestionFormSheet ───────────────────────────────────────────────────────

function SuggestionFormSheet({
  open, onClose, onSaved,
}: { open: boolean; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState('')
  const [targetDate, setTargetDate] = useState(todayStr())
  const [quickDateKey, setQuickDateKey] = useState<'today' | 'tomorrow' | 'weekend' | null>('today')
  const [targetSlot, setTargetSlot] = useState<SlotType | ''>('')
  const [ingredients, setIngredients] = useState<IngredientItem[]>([{ name: '' }])
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  const todayS = todayStr()
  const tomorrowS = tomorrowStr()
  const weekendS = weekendStr()

  const prevOpen = useRef(false)
  if (open && !prevOpen.current) {
    setName(''); setTargetDate(todayS); setQuickDateKey('today')
    setTargetSlot(''); setIngredients([{ name: '' }]); setNote('')
  }
  prevOpen.current = open

  function handleQuickDate(key: 'today' | 'tomorrow' | 'weekend', ds: string) {
    setQuickDateKey(key); setTargetDate(ds)
  }

  function handleDateInput(value: string) {
    setTargetDate(value)
    if (value === todayS) setQuickDateKey('today')
    else if (value === tomorrowS) setQuickDateKey('tomorrow')
    else if (value === weekendS) setQuickDateKey('weekend')
    else setQuickDateKey(null)
  }

  async function handleSave() {
    if (!name.trim()) { toast.error('Name required', { description: 'Give the meal a name.' }); return }
    if (!targetDate || !targetSlot) { toast.error('Target required', { description: 'Pick a target day and slot.' }); return }
    setSaving(true)
    try {
      const filtered = ingredients.filter(i => i.name.trim())
      const r = await fetch('/api/meals/suggestions', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), targetSlotDate: targetDate, targetSlotType: targetSlot, ingredients: filtered, note: note.trim() || null }),
      })
      if (!r.ok) throw new Error((await r.json()).error ?? 'Failed')
      toast.success('Suggestion submitted')
      onSaved(); onClose()
    } catch (e) { toast.error('Could not submit', { description: (e as Error).message }) }
    finally { setSaving(false) }
  }

  const QUICK_PILLS = [
    { key: 'today' as const, label: 'Today', ds: todayS },
    { key: 'tomorrow' as const, label: 'Tomorrow', ds: tomorrowS },
    { key: 'weekend' as const, label: 'This weekend', ds: weekendS },
  ]

  return (
    <DraggableSheet open={open} onOpenChange={(v: boolean) => !v && onClose()} featureColor={COLOR}>
      <div className="px-4 pb-8">
        <p className="mb-5 text-lg" style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}>Suggest a meal</p>
        <div style={{ marginBottom: 14 }}>
          <label style={LABEL_STYLE}>Meal name</label>
          <input style={INPUT_STYLE} placeholder="e.g. Homemade pizza" value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={LABEL_STYLE}>For which day</label>
          <div style={{ display: 'flex', gap: 6, marginBottom: 8, flexWrap: 'wrap' }}>
            {QUICK_PILLS.map(({ key, label, ds }) => {
              const active = quickDateKey === key
              return (
                <button key={key} type="button" onClick={() => handleQuickDate(key, ds)} style={{
                  padding: '7px 12px', borderRadius: 10, fontSize: 12, fontWeight: 700, border: 'none',
                  borderBottom: `2px solid ${active ? COLOR_DARK : 'var(--roost-border)'}`,
                  backgroundColor: active ? COLOR : 'var(--roost-surface)',
                  color: active ? '#fff' : 'var(--roost-text-secondary)', cursor: 'pointer',
                }}>{label}</button>
              )
            })}
          </div>
          <input
            type="date"
            min={todayS}
            value={targetDate}
            onChange={e => handleDateInput(e.target.value)}
            style={INPUT_STYLE}
          />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={LABEL_STYLE}>Which meal</label>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {SLOT_TYPES.map(s => (
              <button key={s} type="button" onClick={() => setTargetSlot(targetSlot === s ? '' : s)} style={{
                padding: '7px 14px', borderRadius: 10, fontSize: 13, fontWeight: 700, border: 'none',
                borderBottom: `2px solid ${targetSlot === s ? COLOR_DARK : 'var(--roost-border)'}`,
                backgroundColor: targetSlot === s ? COLOR : 'var(--roost-surface)',
                color: targetSlot === s ? '#fff' : 'var(--roost-text-secondary)', cursor: 'pointer',
              }}>{SLOT_LABELS[s]}</button>
            ))}
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={LABEL_STYLE}>
            Ingredients
            <span style={{ fontWeight: 600, textTransform: 'none', fontSize: 11, color: 'var(--roost-text-muted)', marginLeft: 6 }}>optional</span>
          </label>
          <IngredientEditor ingredients={ingredients} onChange={setIngredients} />
        </div>
        <div style={{ marginBottom: 24 }}>
          <label style={LABEL_STYLE}>Note (optional)</label>
          <input style={INPUT_STYLE} placeholder="Any context for the household" value={note} onChange={e => setNote(e.target.value)} />
        </div>
        <button type="button" onClick={handleSave} disabled={saving} style={{
          width: '100%', padding: '14px 0', borderRadius: 14, border: 'none', borderBottom: `3px solid ${COLOR_DARK}`,
          backgroundColor: COLOR, color: '#fff', fontWeight: 800, fontSize: 15,
          cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
        }}>{saving ? 'Submitting...' : 'Submit suggestion'}</button>
      </div>
    </DraggableSheet>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function MealsPage() {
  const { data: session } = useSession()
  const currentUserId = session?.user?.id ?? ''
  const qc = useQueryClient()

  const [tab, setTab] = useState<Tab>('planner')
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()))

  // Planner slot sheet state
  const [slotOpen, setSlotOpen] = useState(false)
  const [slotDay, setSlotDay] = useState<Date | null>(null)
  const [slotType, setSlotTypeState] = useState<SlotType | null>(null)

  // Bank sheet state
  const [mealSheetOpen, setMealSheetOpen] = useState(false)
  const [editMeal, setEditMeal] = useState<Meal | null>(null)
  const [bankSearch, setBankSearch] = useState('')
  const [bankCategory, setBankCategory] = useState<MealCategory | 'all'>('all')

  // Bank card "add to planner" with pre-selected meal
  const [bankAddMeal, setBankAddMeal] = useState<Meal | null>(null)

  // Bank card grocery push
  const [groceryPushMeal, setGroceryPushMeal] = useState<Meal | null>(null)

  // Suggestion sheet state
  const [suggestOpen, setSuggestOpen] = useState(false)

  // Household info for admin check
  const { data: householdData } = useQuery({
    queryKey: ['household-me'],
    queryFn: async () => {
      const r = await fetch('/api/household/me')
      if (!r.ok) throw new Error('Failed')
      return r.json()
    },
    staleTime: 60_000,
  })
  const isAdmin = householdData?.role === 'admin'

  // Planner query
  const weekStartStr = fmtDate(weekStart)
  const { data: plannerData, isLoading: plannerLoading } = useQuery({
    queryKey: ['planner', weekStartStr],
    queryFn: async () => {
      const r = await fetch(`/api/meals/planner?weekStart=${weekStartStr}`)
      if (!r.ok) throw new Error('Failed')
      return r.json() as Promise<{ slots: PlannerSlot[] }>
    },
    staleTime: 10_000,
    refetchInterval: 30_000,
    enabled: tab === 'planner',
  })

  // Bank query
  const { data: bankData, isLoading: bankLoading } = useQuery({
    queryKey: ['meals'],
    queryFn: async () => {
      const r = await fetch('/api/meals')
      if (!r.ok) throw new Error('Failed')
      return r.json() as Promise<{ meals: Meal[] }>
    },
    staleTime: 10_000,
    enabled: tab === 'bank' || slotOpen || !!bankAddMeal,
  })

  // Suggestions query
  const { data: suggestData, isLoading: suggestLoading } = useQuery({
    queryKey: ['suggestions'],
    queryFn: async () => {
      const r = await fetch('/api/meals/suggestions')
      if (!r.ok) throw new Error('Failed')
      return r.json() as Promise<{ suggestions: Suggestion[] }>
    },
    staleTime: 10_000,
    refetchInterval: 30_000,
    enabled: tab === 'suggestions',
  })

  const slots = plannerData?.slots ?? []
  const bankMeals = bankData?.meals ?? []
  const suggestions = suggestData?.suggestions ?? []

  const getSlot = (day: Date, st: SlotType) =>
    slots.find(s => s.slotDate === fmtDate(day) && s.slotType === st) ?? null

  function openSlot(day: Date, st: SlotType) {
    setSlotDay(day)
    setSlotTypeState(st)
    setBankAddMeal(null)
    setSlotOpen(true)
  }

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart)
    d.setDate(d.getDate() + i)
    return d
  })

  const thisWeekStart = fmtDate(getMonday(new Date()))
  const isThisWeek = weekStartStr === thisWeekStart

  const deleteMealMutation = useMutation({
    mutationFn: async (id: string) => {
      const r = await fetch(`/api/meals/${id}`, { method: 'DELETE' })
      if (!r.ok) throw new Error('Failed')
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['meals'] }); toast.success('Meal removed') },
    onError: () => toast.error('Could not remove meal', { description: 'Please try again.' }),
  })

  const voteMutation = useMutation({
    mutationFn: async ({ id, voteType }: { id: string; voteType: 'up' | 'down' }) => {
      const r = await fetch(`/api/meals/suggestions/${id}/vote`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voteType }),
      })
      if (!r.ok) throw new Error('Failed')
      return r.json()
    },
    onMutate: async ({ id, voteType }) => {
      await qc.cancelQueries({ queryKey: ['suggestions'] })
      const prev = qc.getQueryData(['suggestions'])
      qc.setQueryData(['suggestions'], (old: { suggestions: Suggestion[] } | undefined) => {
        if (!old) return old
        return {
          ...old,
          suggestions: old.suggestions.map(s => {
            if (s.id !== id) return s
            const toggling = s.userVote === voteType
            const wasUp = s.userVote === 'up'
            const wasDown = s.userVote === 'down'
            return {
              ...s,
              userVote: toggling ? null : voteType,
              upvotes: voteType === 'up' ? (toggling ? s.upvotes - 1 : s.upvotes + 1 - (wasUp ? 0 : 0)) : wasUp ? s.upvotes - 1 : s.upvotes,
              downvotes: voteType === 'down' ? (toggling ? s.downvotes - 1 : s.downvotes + 1) : wasDown ? s.downvotes - 1 : s.downvotes,
            }
          }),
        }
      })
      return { prev }
    },
    onError: (_err, _vars, ctx) => { if (ctx?.prev) qc.setQueryData(['suggestions'], ctx.prev) },
    onSettled: () => qc.invalidateQueries({ queryKey: ['suggestions'] }),
  })

  const approveMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: 'in_bank' | 'rejected' }) => {
      const r = await fetch(`/api/meals/suggestions/${id}/approve`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destination: action === 'in_bank' ? 'bank' : 'reject' }),
      })
      if (!r.ok) throw new Error((await r.json()).error ?? 'Failed')
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['suggestions'] }),
    onError: (e) => toast.error('Action failed', { description: (e as Error).message }),
  })

  const filteredBank = bankMeals.filter(m => {
    const matchesSearch = m.name.toLowerCase().includes(bankSearch.toLowerCase())
    const matchesCat = bankCategory === 'all' || m.category === bankCategory
    return matchesSearch && matchesCat
  })

  const existingSlot = slotDay && slotType ? getSlot(slotDay, slotType) : null

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        style={{ padding: '20px 16px 100px', maxWidth: 1024, margin: '0 auto' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h1 style={{ margin: 0, fontWeight: 900, fontSize: 26, color: 'var(--roost-text-primary)', letterSpacing: '-0.3px' }}>Meals</h1>
            <p style={{ margin: '2px 0 0', fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)' }}>
              {tab === 'planner' ? 'Weekly planner' : tab === 'bank' ? `${bankMeals.length} meal${bankMeals.length === 1 ? '' : 's'} saved` : `${suggestions.length} suggestion${suggestions.length === 1 ? '' : 's'}`}
            </p>
          </div>
          {tab === 'bank' && (
            <motion.button whileTap={{ y: 2 }} type="button"
              onClick={() => { setEditMeal(null); setMealSheetOpen(true) }}
              style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: COLOR, border: 'none', borderBottom: `3px solid ${COLOR_DARK}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <Plus size={20} color="#fff" />
            </motion.button>
          )}
          {tab === 'suggestions' && (
            <motion.button whileTap={{ y: 2 }} type="button" onClick={() => setSuggestOpen(true)}
              style={{ width: 40, height: 40, borderRadius: 12, backgroundColor: COLOR, border: 'none', borderBottom: `3px solid ${COLOR_DARK}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', flexShrink: 0 }}>
              <Plus size={20} color="#fff" />
            </motion.button>
          )}
        </div>

        {/* Tab row */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
          {(['planner', 'bank', 'suggestions'] as Tab[]).map(t => (
            <button key={t} type="button" onClick={() => setTab(t)} style={{
              padding: '8px 16px', borderRadius: 12, fontSize: 13, fontWeight: 800, border: 'none',
              borderBottom: `3px solid ${tab === t ? COLOR_DARK : 'var(--roost-border)'}`,
              backgroundColor: tab === t ? COLOR : 'var(--roost-surface)',
              color: tab === t ? '#fff' : 'var(--roost-text-secondary)', cursor: 'pointer',
            }}>
              {t === 'planner' ? 'Planner' : t === 'bank' ? 'Meal Bank' : 'Suggestions'}
            </button>
          ))}
        </div>

        {/* ── PLANNER TAB ── */}
        {tab === 'planner' && (
          <>
            {/* Week nav */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <button type="button" onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })}
                style={{ width: 36, height: 36, borderRadius: 10, border: '1.5px solid var(--roost-border)', borderBottom: '3px solid var(--roost-border)', backgroundColor: 'var(--roost-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronLeft size={16} color="var(--roost-text-secondary)" />
              </button>
              <p style={{ margin: 0, fontWeight: 800, fontSize: 14, color: 'var(--roost-text-primary)', flex: 1, textAlign: 'center' }}>
                {weekStart.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} {isThisWeek ? '(This week)' : ''}
              </p>
              <button type="button" onClick={() => setWeekStart(d => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })}
                style={{ width: 36, height: 36, borderRadius: 10, border: '1.5px solid var(--roost-border)', borderBottom: '3px solid var(--roost-border)', backgroundColor: 'var(--roost-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <ChevronRight size={16} color="var(--roost-text-secondary)" />
              </button>
              {!isThisWeek && (
                <button type="button" onClick={() => setWeekStart(getMonday(new Date()))}
                  style={{ padding: '6px 12px', borderRadius: 10, fontSize: 12, fontWeight: 800, border: '1.5px solid var(--roost-border)', borderBottom: '3px solid var(--roost-border)', backgroundColor: 'var(--roost-surface)', color: 'var(--roost-text-secondary)', cursor: 'pointer', flexShrink: 0 }}>
                  This week
                </button>
              )}
            </div>

            {plannerLoading ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }} className="hidden sm:grid">
                {Array.from({ length: 7 }).map((_, i) => (
                  <div key={i} style={{ borderRadius: 14, backgroundColor: 'var(--roost-surface)', border: '1.5px solid var(--roost-border)', height: 320 }} />
                ))}
              </div>
            ) : (
              <>
                {/* Desktop 7-col grid */}
                <div className="hidden sm:grid w-full" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: 8 }}>
                  {days.map(day => {
                    const isCurrentDay = fmtDate(day) === todayStr()
                    return (
                      <div key={fmtDate(day)}>
                        <div style={{ height: 56, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: 'var(--roost-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            {day.toLocaleDateString('en-US', { weekday: 'short' })}
                          </p>
                          <div style={{ width: 28, height: 28, borderRadius: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 2, backgroundColor: isCurrentDay ? COLOR : 'transparent' }}>
                            <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: isCurrentDay ? '#fff' : 'var(--roost-text-primary)' }}>
                              {day.getDate()}
                            </p>
                          </div>
                        </div>
                        {SLOT_TYPES.map(st => {
                          const slot = getSlot(day, st)
                          return (
                            <motion.button
                              key={st} type="button" whileTap={{ y: 1 }}
                              onClick={() => openSlot(day, st)}
                              style={{
                                width: '100%', height: 72, marginBottom: 6, borderRadius: 12, border: '1.5px solid var(--roost-border)',
                                borderBottom: slot ? `3px solid ${COLOR_DARK}` : '2px dashed var(--roost-border)',
                                backgroundColor: slot ? `${COLOR}18` : 'var(--roost-surface)',
                                cursor: 'pointer', padding: '6px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'left',
                              }}
                            >
                              <p style={{ margin: 0, fontSize: 9, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: slot ? COLOR : 'var(--roost-text-muted)' }}>
                                {SLOT_LABELS[st]}
                              </p>
                              {slot ? (
                                <p style={{ margin: '3px 0 0', fontSize: 12, fontWeight: 800, color: 'var(--roost-text-primary)', lineHeight: 1.2, wordBreak: 'break-word' }}>
                                  {slot.mealName}
                                </p>
                              ) : (
                                <p style={{ margin: '3px 0 0', fontSize: 11, fontWeight: 600, color: 'var(--roost-text-muted)' }}>Tap to plan</p>
                              )}
                            </motion.button>
                          )
                        })}
                      </div>
                    )
                  })}
                </div>

                {/* Mobile vertical list */}
                <div className="block sm:hidden" style={{ flexDirection: 'column', gap: 10 }}>
                  {days.map(day => {
                    const isCurrentDay = fmtDate(day) === todayStr()
                    const daySlots = SLOT_TYPES.map(st => ({ st, slot: getSlot(day, st) }))
                    const filledCount = daySlots.filter(x => x.slot).length
                    return (
                      <SlabCard key={fmtDate(day)} color={isCurrentDay ? COLOR_DARK : 'var(--roost-border-bottom)'}>
                        <div style={{ padding: '12px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                            <div style={{ width: 32, height: 32, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: isCurrentDay ? COLOR : 'var(--roost-bg)' }}>
                              <p style={{ margin: 0, fontSize: 14, fontWeight: 900, color: isCurrentDay ? '#fff' : 'var(--roost-text-primary)' }}>{day.getDate()}</p>
                            </div>
                            <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: 'var(--roost-text-primary)' }}>{getDayLabel(day)}</p>
                            {filledCount > 0 && (
                              <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, color: COLOR, backgroundColor: `${COLOR}18`, padding: '2px 8px', borderRadius: 6 }}>
                                {filledCount} planned
                              </span>
                            )}
                          </div>
                          {daySlots.map(({ st, slot }) => (
                            <button key={st} type="button" onClick={() => openSlot(day, st)} style={{
                              width: '100%', display: 'flex', alignItems: 'center', padding: '10px 0',
                              borderTop: '1px solid var(--roost-border)', border: 'none', borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: 'var(--roost-border)',
                              backgroundColor: 'transparent', cursor: 'pointer', gap: 10, textAlign: 'left',
                            }}>
                              <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--roost-text-muted)', width: 70, flexShrink: 0 }}>
                                {SLOT_LABELS[st]}
                              </span>
                              <span style={{ fontSize: 13, fontWeight: slot ? 800 : 600, color: slot ? 'var(--roost-text-primary)' : 'var(--roost-text-muted)' }}>
                                {slot ? slot.mealName : 'Tap to plan'}
                              </span>
                            </button>
                          ))}
                        </div>
                      </SlabCard>
                    )
                  })}
                </div>

                {slots.length === 0 && (
                  <div className="hidden sm:flex" style={{
                    marginTop: 24, backgroundColor: 'var(--roost-surface)', border: '2px dashed var(--roost-border)',
                    borderBottom: '4px dashed var(--roost-border-bottom)', borderRadius: 16,
                    flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center', padding: '32px 24px',
                  }}>
                    <div style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: 'var(--roost-surface)', border: '1.5px solid var(--roost-border)', borderBottom: `4px solid ${COLOR}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <UtensilsCrossed size={24} color={COLOR} />
                    </div>
                    <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: 'var(--roost-text-primary)' }}>Dinner TBD.</p>
                    <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--roost-text-secondary)' }}>
                      No meals planned. The household is winging it tonight.
                    </p>
                  </div>
                )}
              </>
            )}
          </>
        )}

        {/* ── BANK TAB ── */}
        {tab === 'bank' && (
          <>
            <div style={{ marginBottom: 14 }}>
              <div style={{ position: 'relative', marginBottom: 10 }}>
                <Search size={14} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--roost-text-muted)' }} />
                <input style={{ ...INPUT_STYLE, paddingLeft: 34 }} placeholder="Search your meal bank..." value={bankSearch} onChange={e => setBankSearch(e.target.value)} />
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {(['all', ...SLOT_TYPES] as const).map(c => (
                  <button key={c} type="button" onClick={() => setBankCategory(c as MealCategory | 'all')} style={{
                    padding: '6px 14px', borderRadius: 10, fontSize: 12, fontWeight: 800, border: 'none',
                    borderBottom: `2px solid ${bankCategory === c ? COLOR_DARK : 'var(--roost-border)'}`,
                    backgroundColor: bankCategory === c ? COLOR : 'var(--roost-surface)',
                    color: bankCategory === c ? '#fff' : 'var(--roost-text-secondary)', cursor: 'pointer',
                  }}>
                    {c === 'all' ? 'All' : SLOT_LABELS[c]}
                  </button>
                ))}
              </div>
            </div>

            {bankLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1, 2, 3].map(i => (
                  <div key={i} style={{ height: 80, borderRadius: 16, backgroundColor: 'var(--roost-surface)', border: '1.5px solid var(--roost-border)', borderBottom: '4px solid var(--roost-border)' }} />
                ))}
              </div>
            ) : filteredBank.length === 0 ? (
              <div style={{
                backgroundColor: 'var(--roost-surface)', border: '2px dashed var(--roost-border)',
                borderBottom: '4px dashed var(--roost-border-bottom)', borderRadius: 16,
                padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center',
              }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: 'var(--roost-surface)', border: '1.5px solid var(--roost-border)', borderBottom: `4px solid ${COLOR}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UtensilsCrossed size={24} color={COLOR} />
                </div>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: 'var(--roost-text-primary)' }}>
                  {bankSearch || bankCategory !== 'all' ? 'No matches.' : 'Empty bank.'}
                </p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--roost-text-secondary)' }}>
                  {bankSearch || bankCategory !== 'all' ? 'Try a different search or category.' : 'Add meals to your bank so you can plan them later.'}
                </p>
                {!bankSearch && bankCategory === 'all' && (
                  <motion.button whileTap={{ y: 2 }} type="button" onClick={() => { setEditMeal(null); setMealSheetOpen(true) }}
                    style={{ marginTop: 8, padding: '11px 20px', borderRadius: 12, border: 'none', borderBottom: `3px solid ${COLOR_DARK}`, backgroundColor: COLOR, color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                    Add first meal
                  </motion.button>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredBank.map((m, i) => {
                  const ing = parseIngredients(m.ingredients)
                  return (
                    <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.2), duration: 0.15 }}>
                      <SlabCard color={COLOR_DARK}>
                        <div style={{ padding: 14, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                              <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: 'var(--roost-text-primary)' }}>{m.name}</p>
                              {m.category && (
                                <span style={{ fontSize: 10, fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.05em', color: COLOR, backgroundColor: `${COLOR}18`, padding: '2px 7px', borderRadius: 6 }}>
                                  {SLOT_LABELS[m.category]}
                                </span>
                              )}
                            </div>
                            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                              {m.prepTime && (
                                <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: 'var(--roost-text-muted)' }}>
                                  <Clock size={11} /> {m.prepTime} min
                                </span>
                              )}
                              {ing.length > 0 && (
                                <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--roost-text-muted)' }}>
                                  {ing.length} ingredient{ing.length === 1 ? '' : 's'}
                                </span>
                              )}
                            </div>
                            {m.description && (
                              <p style={{ margin: '6px 0 0', fontSize: 12, fontWeight: 600, color: 'var(--roost-text-secondary)', lineHeight: 1.4 }}>
                                {m.description.slice(0, 100)}{m.description.length > 100 ? '...' : ''}
                              </p>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
                            {/* Add to planner — opens date picker for this specific meal */}
                            <button type="button" title="Add to planner"
                              onClick={() => { setBankAddMeal(m); setSlotOpen(true) }}
                              style={{ width: 34, height: 34, borderRadius: 9, border: 'none', backgroundColor: 'var(--roost-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Plus size={14} color={COLOR} />
                            </button>
                            {/* Push ingredients to grocery */}
                            {ing.length > 0 && (
                              <button type="button" title="Add ingredients to grocery list"
                                onClick={() => setGroceryPushMeal(m)}
                                style={{ width: 34, height: 34, borderRadius: 9, border: 'none', backgroundColor: 'var(--roost-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <ShoppingCart size={13} color="var(--roost-text-secondary)" />
                              </button>
                            )}
                            <button type="button" onClick={() => { setEditMeal(m); setMealSheetOpen(true) }}
                              style={{ width: 34, height: 34, borderRadius: 9, border: 'none', backgroundColor: 'var(--roost-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Pencil size={13} color="var(--roost-text-secondary)" />
                            </button>
                            {m.createdBy === currentUserId && (
                              <button type="button" onClick={() => deleteMealMutation.mutate(m.id)}
                                style={{ width: 34, height: 34, borderRadius: 9, border: 'none', backgroundColor: 'var(--roost-bg)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Trash2 size={13} color="#EF4444" />
                              </button>
                            )}
                          </div>
                        </div>
                      </SlabCard>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── SUGGESTIONS TAB ── */}
        {tab === 'suggestions' && (
          <>
            {suggestLoading ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {[1, 2, 3].map(i => <div key={i} style={{ height: 100, borderRadius: 16, backgroundColor: 'var(--roost-surface)', border: '1.5px solid var(--roost-border)', borderBottom: '4px solid var(--roost-border)' }} />)}
              </div>
            ) : suggestions.length === 0 ? (
              <div style={{
                backgroundColor: 'var(--roost-surface)', border: '2px dashed var(--roost-border)',
                borderBottom: '4px dashed var(--roost-border-bottom)', borderRadius: 16,
                padding: '32px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, textAlign: 'center',
              }}>
                <div style={{ width: 52, height: 52, borderRadius: 14, backgroundColor: 'var(--roost-surface)', border: '1.5px solid var(--roost-border)', borderBottom: `4px solid ${COLOR}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <UtensilsCrossed size={24} color={COLOR} />
                </div>
                <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: 'var(--roost-text-primary)' }}>No suggestions yet.</p>
                <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--roost-text-secondary)' }}>
                  Suggest a meal for the household to vote on.
                </p>
                <motion.button whileTap={{ y: 2 }} type="button" onClick={() => setSuggestOpen(true)}
                  style={{ marginTop: 8, padding: '11px 20px', borderRadius: 12, border: 'none', borderBottom: `3px solid ${COLOR_DARK}`, backgroundColor: COLOR, color: '#fff', fontWeight: 800, fontSize: 14, cursor: 'pointer' }}>
                  Make a suggestion
                </motion.button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {suggestions.map((s, i) => {
                  const ing = parseIngredients(s.ingredients)
                  const isTop = i === 0 && s.upvotes > 0
                  return (
                    <motion.div key={s.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.04, 0.2), duration: 0.15 }}>
                      <SlabCard color={COLOR_DARK}>
                        <div style={{ padding: 14 }}>
                          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                                {isTop && (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, color: '#D97706', backgroundColor: '#FEF3C7', padding: '2px 8px', borderRadius: 6 }}>
                                    <Trophy size={11} /> Top pick
                                  </span>
                                )}
                                {s.status === 'in_bank' && (
                                  <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 800, color: COLOR, backgroundColor: `${COLOR}18`, padding: '2px 8px', borderRadius: 6 }}>
                                    <BookmarkCheck size={11} /> In meal bank
                                  </span>
                                )}
                                <p style={{ margin: 0, fontWeight: 800, fontSize: 15, color: 'var(--roost-text-primary)' }}>{s.name}</p>
                              </div>
                              {(s.targetSlotDate || s.targetSlotType) && (
                                <p style={{ margin: '2px 0 4px', fontSize: 12, fontWeight: 700, color: 'var(--roost-text-muted)' }}>
                                  {s.targetSlotDate && new Date(s.targetSlotDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                                  {s.targetSlotType && ` ${SLOT_LABELS[s.targetSlotType]}`}
                                </p>
                              )}
                              {ing.length > 0 && (
                                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 4 }}>
                                  {ing.slice(0, 4).map((item, idx) => (
                                    <span key={idx} style={{ fontSize: 11, fontWeight: 700, color: 'var(--roost-text-secondary)', backgroundColor: 'var(--roost-bg)', padding: '2px 8px', borderRadius: 6 }}>
                                      {[item.quantity, item.unit, item.name].filter(Boolean).join(' ')}
                                    </span>
                                  ))}
                                  {ing.length > 4 && <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--roost-text-muted)' }}>+{ing.length - 4} more</span>}
                                </div>
                              )}
                              {s.note && <p style={{ margin: '4px 0 0', fontSize: 12, fontWeight: 600, color: 'var(--roost-text-secondary)' }}>{s.note}</p>}
                              <p style={{ margin: '6px 0 0', fontSize: 11, fontWeight: 700, color: 'var(--roost-text-muted)' }}>
                                Suggested by {s.suggesterName?.split(' ')[0] ?? 'someone'}
                              </p>
                            </div>
                            {/* Voting */}
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                              <button type="button" onClick={() => voteMutation.mutate({ id: s.id, voteType: 'up' })} style={{
                                width: 36, height: 36, borderRadius: 10, border: '1.5px solid var(--roost-border)',
                                borderBottom: `2px solid ${s.userVote === 'up' ? COLOR_DARK : 'var(--roost-border)'}`,
                                backgroundColor: s.userVote === 'up' ? COLOR : 'var(--roost-surface)',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                <ThumbsUp size={14} color={s.userVote === 'up' ? '#fff' : 'var(--roost-text-secondary)'} />
                              </button>
                              <span style={{ fontSize: 13, fontWeight: 800, color: s.upvotes > 0 ? COLOR : 'var(--roost-text-muted)' }}>{s.upvotes}</span>
                              <button type="button" onClick={() => voteMutation.mutate({ id: s.id, voteType: 'down' })} style={{
                                width: 36, height: 36, borderRadius: 10, border: '1.5px solid var(--roost-border)',
                                borderBottom: `2px solid ${s.userVote === 'down' ? '#DC2626' : 'var(--roost-border)'}`,
                                backgroundColor: s.userVote === 'down' ? '#FEE2E2' : 'var(--roost-surface)',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              }}>
                                <ThumbsDown size={14} color={s.userVote === 'down' ? '#DC2626' : 'var(--roost-text-muted)'} />
                              </button>
                            </div>
                          </div>

                          {/* Admin actions */}
                          {isAdmin && (
                            <div style={{ display: 'flex', gap: 8, marginTop: 12, borderTop: '1px solid var(--roost-border)', paddingTop: 10 }}>
                              <button type="button"
                                onClick={() => approveMutation.mutate({ id: s.id, action: 'in_bank' })}
                                disabled={s.status === 'in_bank' || approveMutation.isPending}
                                style={{
                                  flex: 1, padding: '9px 0', borderRadius: 10, fontSize: 13, fontWeight: 800,
                                  border: 'none', borderBottom: `2px solid ${COLOR_DARK}`,
                                  backgroundColor: COLOR, color: '#fff', cursor: s.status === 'in_bank' ? 'not-allowed' : 'pointer',
                                  opacity: s.status === 'in_bank' ? 0.5 : 1,
                                }}>
                                Add to bank
                              </button>
                              <button type="button"
                                onClick={() => approveMutation.mutate({ id: s.id, action: 'rejected' })}
                                disabled={approveMutation.isPending}
                                style={{
                                  padding: '9px 14px', borderRadius: 10, fontSize: 13, fontWeight: 800,
                                  border: '1.5px solid var(--roost-border)', borderBottom: '2px solid var(--roost-border)',
                                  backgroundColor: 'var(--roost-surface)', color: '#EF4444', cursor: 'pointer',
                                }}>
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      </SlabCard>
                    </motion.div>
                  )
                })}
              </div>
            )}
          </>
        )}
      </motion.div>

      {/* FAB (planner: suggest; mobile) */}
      {tab === 'planner' && (
        <motion.button whileTap={{ y: 2 }} type="button"
          onClick={() => setSuggestOpen(true)}
          className="md:hidden"
          style={{ position: 'fixed', bottom: 80, right: 20, width: 56, height: 56, borderRadius: 18, backgroundColor: COLOR, border: 'none', borderBottom: `4px solid ${COLOR_DARK}`, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', zIndex: 40 }}>
          <Plus size={24} color="#fff" />
        </motion.button>
      )}

      <MealSheet open={mealSheetOpen} onClose={() => { setMealSheetOpen(false); setEditMeal(null) }} meal={editMeal}
        onSaved={() => qc.invalidateQueries({ queryKey: ['meals'] })} />

      <SlotPickerSheet
        open={slotOpen}
        onClose={() => { setSlotOpen(false); setBankAddMeal(null) }}
        day={slotDay}
        slotType={slotType}
        existingSlot={bankAddMeal ? null : existingSlot}
        bankMeals={bankMeals}
        preSelectedMeal={bankAddMeal}
        onSaved={() => qc.invalidateQueries({ queryKey: ['planner', weekStartStr] })}
        onRemoved={() => qc.invalidateQueries({ queryKey: ['planner', weekStartStr] })}
      />

      <SuggestionFormSheet open={suggestOpen} onClose={() => setSuggestOpen(false)}
        onSaved={() => qc.invalidateQueries({ queryKey: ['suggestions'] })} />

      {groceryPushMeal && (
        <GroceryPushSheet
          open={!!groceryPushMeal}
          onClose={() => setGroceryPushMeal(null)}
          mealName={groceryPushMeal.name}
          mealId={groceryPushMeal.id}
          ingredients={parseIngredients(groceryPushMeal.ingredients)}
        />
      )}
    </>
  )
}
