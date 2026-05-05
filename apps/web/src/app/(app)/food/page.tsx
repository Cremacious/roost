'use client'

import { useState, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import { ShoppingCart, Plus, Trash2, Check, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { Skeleton } from '@/components/ui/Skeleton'

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

interface GroceryData {
  listId: string
  listName: string
  items: GroceryItem[]
}

function ItemRow({
  item,
  onCheck,
  onDelete,
}: {
  item: GroceryItem
  onCheck: (id: string, checked: boolean) => void
  onDelete: (id: string) => void
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.15 }}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 16px',
        minHeight: 64,
        backgroundColor: 'var(--roost-surface)',
        border: '1.5px solid var(--roost-border)',
        borderBottom: `4px solid ${item.isChecked ? COLOR_DARK + '60' : COLOR_DARK}`,
        borderRadius: 14,
      }}
    >
      {/* Check circle */}
      <button
        type="button"
        aria-label={item.isChecked ? 'Uncheck item' : 'Check item'}
        onClick={() => onCheck(item.id, !item.isChecked)}
        style={{
          width: 28,
          height: 28,
          borderRadius: '50%',
          border: `2px solid ${item.isChecked ? COLOR : COLOR + '66'}`,
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

      {/* Name + qty */}
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
            transition: 'color 0.12s',
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

      {/* Delete */}
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

export default function FoodPage() {
  const queryClient = useQueryClient()
  const [input, setInput] = useState('')
  const [checkedOpen, setCheckedOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const { data, isLoading, isError } = useQuery<GroceryData>({
    queryKey: ['grocery'],
    queryFn: async () => {
      const res = await fetch('/api/grocery')
      if (!res.ok) throw new Error('Failed to load grocery list')
      return res.json()
    },
    staleTime: 10_000,
    refetchInterval: 30_000,
  })

  const addMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/grocery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      if (!res.ok) throw new Error('Failed to add item')
      return res.json()
    },
    onMutate: async (name) => {
      await queryClient.cancelQueries({ queryKey: ['grocery'] })
      const prev = queryClient.getQueryData<GroceryData>(['grocery'])
      if (prev) {
        const optimistic: GroceryItem = {
          id: `optimistic-${Date.now()}`,
          name,
          quantity: null,
          isChecked: false,
          checkedAt: null,
          addedBy: '',
          createdAt: new Date().toISOString(),
        }
        queryClient.setQueryData<GroceryData>(['grocery'], {
          ...prev,
          items: [...prev.items, optimistic],
        })
      }
      return { prev }
    },
    onError: (_err, _name, context) => {
      if (context?.prev) queryClient.setQueryData(['grocery'], context.prev)
      toast.error('Could not add item', { description: 'Check your connection and try again.' })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['grocery'] }),
  })

  const checkMutation = useMutation({
    mutationFn: async ({ id, isChecked }: { id: string; isChecked: boolean }) => {
      const res = await fetch(`/api/grocery/items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isChecked }),
      })
      if (!res.ok) throw new Error('Failed to update item')
    },
    onMutate: async ({ id, isChecked }) => {
      await queryClient.cancelQueries({ queryKey: ['grocery'] })
      const prev = queryClient.getQueryData<GroceryData>(['grocery'])
      if (prev) {
        queryClient.setQueryData<GroceryData>(['grocery'], {
          ...prev,
          items: prev.items.map(i =>
            i.id === id
              ? { ...i, isChecked, checkedAt: isChecked ? new Date().toISOString() : null }
              : i
          ),
        })
      }
      return { prev }
    },
    onError: (_err, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(['grocery'], context.prev)
      toast.error('Could not update item', { description: 'Check your connection and try again.' })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['grocery'] }),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/grocery/items/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Failed to delete item')
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['grocery'] })
      const prev = queryClient.getQueryData<GroceryData>(['grocery'])
      if (prev) {
        queryClient.setQueryData<GroceryData>(['grocery'], {
          ...prev,
          items: prev.items.filter(i => i.id !== id),
        })
      }
      return { prev }
    },
    onError: (_err, _id, context) => {
      if (context?.prev) queryClient.setQueryData(['grocery'], context.prev)
      toast.error('Could not delete item', { description: 'Check your connection and try again.' })
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['grocery'] }),
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

  if (isLoading) {
    return (
      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
        <Skeleton style={{ height: 52 }} />
        {[0, 1, 2, 3].map(i => (
          <Skeleton key={i} style={{ height: 64, borderRadius: 14 }} />
        ))}
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
      style={{ padding: '12px 0 24px', display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 680, margin: '0 auto', width: '100%' }}
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
        <h1 style={{ fontWeight: 900, fontSize: 22, color: 'var(--roost-text-primary)', margin: 0, letterSpacing: '-0.3px' }}>
          {data?.listName ?? 'Grocery'}
        </h1>
      </div>

      {/* Quick add bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 0,
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

      {/* Item count */}
      {data && data.items.length > 0 && (
        <p style={{ fontSize: 11, fontWeight: 800, color: COLOR, letterSpacing: '0.08em', margin: '0 16px -4px' }}>
          ITEMS &middot; {unchecked.length} remaining
        </p>
      )}

      {/* Unchecked items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 16px' }}>
        <AnimatePresence mode="popLayout">
          {unchecked.length === 0 && checked.length === 0 && (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              style={{
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
            </motion.div>
          )}

          {unchecked.map(item => (
            <ItemRow
              key={item.id}
              item={item}
              onCheck={(id, val) => checkMutation.mutate({ id, isChecked: val })}
              onDelete={id => deleteMutation.mutate(id)}
            />
          ))}
        </AnimatePresence>
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
              : <ChevronDown size={14} color={COLOR} />
            }
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
                {checked.map(item => (
                  <ItemRow
                    key={item.id}
                    item={item}
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
