'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, Plus, Trash2, Check, ChevronDown, ChevronUp, ArrowUpDown, X } from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/Skeleton'
import { groupItemsBySection } from '@/lib/utils/grocerySort'

const COLOR = '#F59E0B'
const COLOR_DARK = '#C87D00'

interface GroceryItem {
  id: string
  name: string
  quantity: string | null
  isChecked: boolean
  checkedAt: string | null
  addedBy: string
  createdAt: string
}

interface ListSummary {
  id: string
  name: string
  isDefault: boolean
  itemCount: number
}

interface GroceryData {
  listId: string
  listName: string
  isDefault: boolean
  items: GroceryItem[]
}

// ── Item row ────────────────────────────────────────────────────────────────

function ItemRow({
  item,
  onCheck,
  onDelete,
  index,
}: {
  item: GroceryItem
  onCheck: (id: string, checked: boolean) => void
  onDelete: (id: string) => void
  index: number
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0, transition: { delay: Math.min(index * 0.03, 0.15), duration: 0.14 } }}
      exit={{ opacity: 0, x: -16, transition: { duration: 0.12 } }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 16px',
        minHeight: 64,
        backgroundColor: 'var(--roost-surface)',
        border: '1.5px solid var(--roost-border)',
        borderBottom: `4px solid ${item.isChecked ? COLOR_DARK + '50' : COLOR_DARK}`,
        borderRadius: 14,
      }}
    >
      <button
        type="button"
        aria-label={item.isChecked ? 'Uncheck item' : 'Check item'}
        onClick={() => onCheck(item.id, !item.isChecked)}
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: `2px solid ${item.isChecked ? COLOR : COLOR + '55'}`,
          backgroundColor: item.isChecked ? COLOR : 'transparent',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          cursor: 'pointer',
          transition: 'all 0.12s',
        }}
      >
        {item.isChecked && <Check size={14} color="#fff" strokeWidth={3} />}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontWeight: 700,
            fontSize: 15,
            color: item.isChecked ? 'var(--roost-text-muted)' : 'var(--roost-text-primary)',
            textDecoration: item.isChecked ? 'line-through' : 'none',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item.name}
        </p>
        {item.quantity && (
          <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--roost-text-muted)', margin: 0 }}>
            {item.quantity}
          </p>
        )}
      </div>

      <button
        type="button"
        aria-label="Delete item"
        onClick={() => onDelete(item.id)}
        style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          border: 'none',
          background: 'transparent',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--roost-text-muted)',
          flexShrink: 0,
        }}
      >
        <Trash2 size={16} />
      </button>
    </motion.div>
  )
}

// ── New list inline form ─────────────────────────────────────────────────────

function NewListForm({ onSave, onCancel }: { onSave: (name: string) => void; onCancel: () => void }) {
  const [value, setValue] = useState('')
  return (
    <div
      style={{
        display: 'flex',
        gap: 6,
        padding: '0 16px',
      }}
    >
      <input
        autoFocus
        type="text"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && value.trim()) onSave(value.trim())
          if (e.key === 'Escape') onCancel()
        }}
        placeholder="List name"
        style={{
          flex: 1,
          height: 40,
          padding: '0 12px',
          borderRadius: 10,
          border: `1.5px solid ${COLOR}`,
          borderBottom: `3px solid ${COLOR_DARK}`,
          background: 'var(--roost-surface)',
          outline: 'none',
          fontSize: 14,
          fontWeight: 700,
          color: 'var(--roost-text-primary)',
          fontFamily: 'inherit',
        }}
      />
      <button
        type="button"
        disabled={!value.trim()}
        onClick={() => value.trim() && onSave(value.trim())}
        style={{
          height: 40,
          padding: '0 14px',
          borderRadius: 10,
          border: 'none',
          borderBottom: `3px solid ${COLOR_DARK}`,
          backgroundColor: COLOR,
          color: '#fff',
          fontWeight: 800,
          fontSize: 13,
          cursor: value.trim() ? 'pointer' : 'default',
          opacity: value.trim() ? 1 : 0.5,
        }}
      >
        Add
      </button>
      <button
        type="button"
        onClick={onCancel}
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          border: '1.5px solid var(--roost-border)',
          borderBottom: '3px solid var(--roost-border-bottom)',
          background: 'var(--roost-surface)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <X size={16} color="var(--roost-text-muted)" />
      </button>
    </div>
  )
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function FoodPage() {
  const queryClient = useQueryClient()
  const [activeListId, setActiveListId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [checkedOpen, setCheckedOpen] = useState(false)
  const [smartSort, setSmartSort] = useState(false)
  const [addingList, setAddingList] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── Lists query ──────────────────────────────────────────────────────────
  const { data: listsData, isLoading: listsLoading } = useQuery<{ lists: ListSummary[] }>({
    queryKey: ['grocery-lists'],
    queryFn: async () => {
      const res = await fetch('/api/grocery/lists')
      if (!res.ok) throw new Error('Failed to load lists')
      return res.json()
    },
    staleTime: 15_000,
  })

  // Pick active list once data loads
  useEffect(() => {
    if (!listsData) return
    if (activeListId && listsData.lists.find(l => l.id === activeListId)) return
    const def = listsData.lists.find(l => l.isDefault) ?? listsData.lists[0]
    if (def) setActiveListId(def.id)
  }, [listsData, activeListId])

  // ── Items query ──────────────────────────────────────────────────────────
  const { data, isLoading: itemsLoading, isError } = useQuery<GroceryData>({
    queryKey: ['grocery-items', activeListId],
    queryFn: async () => {
      if (!activeListId) throw new Error('No list')
      // Auto-create default list if this is the first visit
      if (activeListId === '__default__') {
        const res = await fetch('/api/grocery')
        if (!res.ok) throw new Error('Failed to load grocery list')
        return res.json()
      }
      const res = await fetch(`/api/grocery/lists/${activeListId}/items`)
      if (!res.ok) throw new Error('Failed to load items')
      return res.json()
    },
    enabled: !!activeListId,
    staleTime: 10_000,
    refetchInterval: 30_000,
  })

  // ── Create list ──────────────────────────────────────────────────────────
  const createListMutation = useMutation({
    mutationFn: async (name: string) => {
      // First time: use the simple route to ensure default list exists
      const lists = listsData?.lists ?? []
      if (lists.length === 0) {
        // Create via simple API (creates default list)
        const res = await fetch('/api/grocery', { method: 'GET' })
        if (!res.ok) throw new Error('Failed to initialize')
      }
      const res = await fetch('/api/grocery/lists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error('Failed to create list')
      return res.json() as Promise<ListSummary>
    },
    onSuccess: (newList) => {
      queryClient.invalidateQueries({ queryKey: ['grocery-lists'] })
      setActiveListId(newList.id)
      setAddingList(false)
    },
    onError: () => {
      toast.error('Could not create list', { description: 'Check your connection and try again.' })
    },
  })

  // ── Add item ─────────────────────────────────────────────────────────────
  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      if (!activeListId) throw new Error('No active list')
      const url = activeListId === '__default__'
        ? '/api/grocery'
        : `/api/grocery/lists/${activeListId}/items`
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error('Failed to add item')
      return res.json() as Promise<GroceryItem>
    },
    onMutate: async (name) => {
      await queryClient.cancelQueries({ queryKey: ['grocery-items', activeListId] })
      const prev = queryClient.getQueryData<GroceryData>(['grocery-items', activeListId])
      if (prev) {
        const optimistic: GroceryItem = {
          id: `opt-${Date.now()}`,
          name,
          quantity: null,
          isChecked: false,
          checkedAt: null,
          addedBy: '',
          createdAt: new Date().toISOString(),
        }
        queryClient.setQueryData<GroceryData>(['grocery-items', activeListId], {
          ...prev,
          items: [...prev.items, optimistic],
        })
      }
      return { prev }
    },
    onError: (_err, _name, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['grocery-items', activeListId], ctx.prev)
      toast.error('Could not add item', { description: 'Check your connection and try again.' })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['grocery-items', activeListId] })
      queryClient.invalidateQueries({ queryKey: ['grocery-lists'] })
    },
  })

  // ── Check / uncheck ──────────────────────────────────────────────────────
  const checkMutation = useMutation({
    mutationFn: async ({ id, isChecked }: { id: string; isChecked: boolean }) => {
      const res = await fetch(`/api/grocery/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isChecked }),
      })
      if (!res.ok) throw new Error('Failed to update')
    },
    onMutate: async ({ id, isChecked }) => {
      await queryClient.cancelQueries({ queryKey: ['grocery-items', activeListId] })
      const prev = queryClient.getQueryData<GroceryData>(['grocery-items', activeListId])
      if (prev) {
        queryClient.setQueryData<GroceryData>(['grocery-items', activeListId], {
          ...prev,
          items: prev.items.map(i =>
            i.id === id ? { ...i, isChecked, checkedAt: isChecked ? new Date().toISOString() : null } : i
          ),
        })
      }
      return { prev }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['grocery-items', activeListId], ctx.prev)
      toast.error('Could not update item', { description: 'Check your connection and try again.' })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['grocery-items', activeListId] }),
  })

  // ── Delete ───────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/grocery/items/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete')
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['grocery-items', activeListId] })
      const prev = queryClient.getQueryData<GroceryData>(['grocery-items', activeListId])
      if (prev) {
        queryClient.setQueryData<GroceryData>(['grocery-items', activeListId], {
          ...prev,
          items: prev.items.filter(i => i.id !== id),
        })
      }
      return { prev }
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(['grocery-items', activeListId], ctx.prev)
      toast.error('Could not delete item', { description: 'Check your connection and try again.' })
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['grocery-items', activeListId] })
      queryClient.invalidateQueries({ queryKey: ['grocery-lists'] })
    },
  })

  const handleQuickAdd = useCallback(() => {
    const name = input.trim()
    if (!name) return
    setInput('')
    addMutation.mutate(name)
    inputRef.current?.focus()
  }, [input, addMutation])

  const unchecked = data?.items.filter(i => !i.isChecked) ?? []
  const checked = data?.items.filter(i => i.isChecked) ?? []
  const sortedGroups = smartSort ? groupItemsBySection(unchecked) : null
  const isLoading = listsLoading || (itemsLoading && !!activeListId)
  const lists = listsData?.lists ?? []

  if (isLoading) {
    return (
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ display: 'flex', gap: 8, overflowX: 'hidden' }}>
          {[80, 110, 90].map((w, i) => <Skeleton key={i} style={{ height: 36, width: w, borderRadius: 20, flexShrink: 0 }} />)}
        </div>
        <Skeleton style={{ height: 52 }} />
        {[0, 1, 2, 3].map(i => <Skeleton key={i} style={{ height: 64, borderRadius: 14 }} />)}
      </div>
    )
  }

  if (isError) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p style={{ color: 'var(--roost-text-muted)', fontWeight: 700 }}>
          Could not load grocery list. Please refresh.
        </p>
      </div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.18 }}
      style={{ padding: '12px 0 32px', display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 680, margin: '0 auto', width: '100%' }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '0 16px 4px' }}>
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            backgroundColor: `${COLOR}18`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <ShoppingCart size={18} color={COLOR} />
        </div>
        <h1 style={{ fontWeight: 900, fontSize: 22, color: 'var(--roost-text-primary)', margin: 0, letterSpacing: '-0.3px', flex: 1 }}>
          Grocery
        </h1>
        {/* Smart sort toggle */}
        <button
          type="button"
          onClick={() => setSmartSort(v => !v)}
          title={smartSort ? 'Disable smart sort' : 'Sort by store section'}
          style={{
            height: 36,
            padding: '0 12px',
            borderRadius: 10,
            border: `1.5px solid ${smartSort ? COLOR : 'var(--roost-border)'}`,
            borderBottom: `3px solid ${smartSort ? COLOR_DARK : 'var(--roost-border-bottom)'}`,
            backgroundColor: smartSort ? COLOR + '15' : 'var(--roost-surface)',
            display: 'flex',
            alignItems: 'center',
            gap: 5,
            cursor: 'pointer',
            transition: 'all 0.12s',
          }}
        >
          <ArrowUpDown size={13} color={smartSort ? COLOR : 'var(--roost-text-muted)'} strokeWidth={2.5} />
          <span style={{ fontSize: 12, fontWeight: 800, color: smartSort ? COLOR : 'var(--roost-text-muted)', letterSpacing: '0.02em' }}>
            Smart sort
          </span>
        </button>
      </div>

      {/* List pills */}
      {lists.length > 0 && (
        <div style={{ padding: '0 16px', display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
          {lists.map(list => {
            const isActive = list.id === activeListId
            return (
              <button
                key={list.id}
                type="button"
                onClick={() => setActiveListId(list.id)}
                style={{
                  height: 36,
                  padding: '0 14px',
                  borderRadius: 20,
                  border: `1.5px solid ${isActive ? COLOR : 'var(--roost-border)'}`,
                  borderBottom: `3px solid ${isActive ? COLOR_DARK : 'var(--roost-border-bottom)'}`,
                  backgroundColor: isActive ? COLOR + '15' : 'var(--roost-surface)',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  transition: 'all 0.12s',
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 800, color: isActive ? COLOR : 'var(--roost-text-primary)' }}>
                  {list.name}
                </span>
                {list.itemCount > 0 && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      backgroundColor: isActive ? COLOR : 'var(--roost-border)',
                      color: isActive ? '#fff' : 'var(--roost-text-muted)',
                      borderRadius: 10,
                      padding: '1px 6px',
                    }}
                  >
                    {list.itemCount}
                  </span>
                )}
              </button>
            )
          })}
          {/* Add list */}
          {!addingList && (
            <button
              type="button"
              onClick={() => setAddingList(true)}
              style={{
                height: 36,
                padding: '0 12px',
                borderRadius: 20,
                border: '1.5px dashed var(--roost-border)',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                flexShrink: 0,
              }}
            >
              <Plus size={13} color="var(--roost-text-muted)" />
              <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--roost-text-muted)' }}>
                New list
              </span>
            </button>
          )}
        </div>
      )}

      {/* New list form */}
      {addingList && (
        <NewListForm
          onSave={name => createListMutation.mutate(name)}
          onCancel={() => setAddingList(false)}
        />
      )}

      {/* Quick add bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          margin: '0 16px',
          backgroundColor: 'var(--roost-surface)',
          border: `1.5px solid ${COLOR}`,
          borderBottom: `3px solid ${COLOR_DARK}`,
          borderRadius: 14,
          overflow: 'hidden',
        }}
      >
        <input
          ref={inputRef}
          data-testid="grocery-quick-add"
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleQuickAdd()}
          placeholder="Add an item"
          style={{
            flex: 1,
            height: 52,
            padding: '0 16px',
            border: 'none',
            background: 'transparent',
            outline: 'none',
            fontSize: 15,
            fontWeight: 700,
            color: 'var(--roost-text-primary)',
            fontFamily: 'inherit',
          }}
        />
        <button
          type="button"
          onClick={handleQuickAdd}
          disabled={!input.trim()}
          style={{
            width: 52,
            height: 52,
            border: 'none',
            background: COLOR,
            cursor: input.trim() ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            opacity: input.trim() ? 1 : 0.5,
            transition: 'opacity 0.12s',
          }}
        >
          <Plus size={22} color="#fff" strokeWidth={2.5} />
        </button>
      </div>

      {/* Empty state */}
      {data && data.items.length === 0 && (
        <div
          style={{
            margin: '0 16px',
            padding: '32px 24px',
            textAlign: 'center',
            backgroundColor: 'var(--roost-surface)',
            border: '2px dashed var(--roost-border)',
            borderBottom: '4px dashed var(--roost-border-bottom)',
            borderRadius: 16,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              backgroundColor: 'var(--roost-surface)',
              border: '1.5px solid var(--roost-border)',
              borderBottom: `4px solid ${COLOR}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px',
            }}
          >
            <ShoppingCart size={22} color={COLOR} />
          </div>
          <p style={{ fontWeight: 800, fontSize: 16, color: 'var(--roost-text-primary)', margin: '0 0 6px' }}>
            The fridge is on its own.
          </p>
          <p style={{ fontWeight: 600, fontSize: 13, color: 'var(--roost-text-muted)', margin: 0 }}>
            No items on the list. Add something before someone eats a condiment for dinner.
          </p>
        </div>
      )}

      {/* Item count header */}
      {unchecked.length > 0 && (
        <p style={{ fontSize: 11, fontWeight: 800, color: COLOR, letterSpacing: '0.08em', margin: '0 16px -4px' }}>
          {smartSort ? 'BY SECTION' : `ITEMS · ${unchecked.length} remaining`}
        </p>
      )}

      {/* Unchecked items: smart sort groups OR flat list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 16px' }}>
        {smartSort && sortedGroups ? (
          sortedGroups.map(group => (
            <div key={group.section}>
              <p style={{ fontSize: 10, fontWeight: 800, color: 'var(--roost-text-muted)', letterSpacing: '0.1em', margin: '4px 2px 6px', textTransform: 'uppercase' }}>
                {group.section}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <AnimatePresence mode="popLayout">
                  {group.items.map((item, i) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      index={i}
                      onCheck={(id, val) => checkMutation.mutate({ id, isChecked: val })}
                      onDelete={id => deleteMutation.mutate(id)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          ))
        ) : (
          <AnimatePresence mode="popLayout">
            {unchecked.map((item, i) => (
              <ItemRow
                key={item.id}
                item={item}
                index={i}
                onCheck={(id, val) => checkMutation.mutate({ id, isChecked: val })}
                onDelete={id => deleteMutation.mutate(id)}
              />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Checked / In the cart */}
      {checked.length > 0 && (
        <div style={{ padding: '0 16px' }}>
          <button
            type="button"
            onClick={() => setCheckedOpen(v => !v)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              width: '100%',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px 0',
              marginBottom: checkedOpen ? 8 : 0,
            }}
          >
            <span style={{ fontSize: 11, fontWeight: 800, color: COLOR, letterSpacing: '0.08em' }}>
              IN THE CART ({checked.length})
            </span>
            {checkedOpen
              ? <ChevronUp size={14} color={COLOR} />
              : <ChevronDown size={14} color={COLOR} />}
          </button>

          <AnimatePresence>
            {checkedOpen && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18 }}
                style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', gap: 8 }}
              >
                {checked.map((item, i) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    index={i}
                    onCheck={(id, val) => checkMutation.mutate({ id, isChecked: val })}
                    onDelete={id => deleteMutation.mutate(id)}
                  />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}
