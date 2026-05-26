'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DraggableSheet } from '@/components/shared/DraggableSheet'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const COLOR = '#F59E0B'
const COLOR_DARK = '#C87D00'

interface CommonItem { id: string; name: string }
interface CommonItemsResponse { items: CommonItem[] }

const LABEL_STYLE: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
  letterSpacing: '0.07em', color: '#374151', marginBottom: 6,
}
const INPUT_STYLE: React.CSSProperties = {
  width: '100%', height: 48, fontSize: 16, fontWeight: 600, padding: '0 14px',
  border: '1.5px solid var(--roost-border)', borderBottom: '3px solid var(--roost-border-bottom)',
  borderRadius: 12, background: 'var(--roost-surface)', color: 'var(--roost-text-primary)', outline: 'none',
}
const ADD_BTN_STYLE: React.CSSProperties = {
  height: 48, paddingLeft: 16, paddingRight: 16, borderRadius: 12,
  border: 'none', borderBottom: `3px solid ${COLOR_DARK}`, background: COLOR,
  color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
}

export function CommonItemsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const { data } = useQuery<CommonItemsResponse>({
    queryKey: ['common-items'],
    queryFn: async () => {
      const res = await fetch('/api/grocery/common-items')
      if (!res.ok) throw new Error('Failed to load common items')
      return res.json()
    },
    enabled: open,
    staleTime: 30_000,
  })
  const items = data?.items ?? []

  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [removeTarget, setRemoveTarget] = useState<CommonItem | null>(null)

  const addMut = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/grocery/common-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'Failed to add')
      return body as CommonItem
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['common-items'] }); setNewName(''); toast.success('Added') },
    onError: (err) => toast.error('Could not add', { description: err instanceof Error ? err.message : 'Please try again.' }),
  })

  const renameMut = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await fetch(`/api/grocery/common-items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'Failed to rename')
      return body as CommonItem
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['common-items'] }); setEditingId(null); toast.success('Renamed') },
    onError: (err) => toast.error('Could not rename', { description: err instanceof Error ? err.message : 'Please try again.' }),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/grocery/common-items/${id}`, { method: 'DELETE' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'Failed to delete')
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['common-items'] }); setRemoveTarget(null); toast.success('Removed') },
    onError: (err) => toast.error('Could not remove', { description: err instanceof Error ? err.message : 'Please try again.' }),
  })

  function startEdit(item: CommonItem) {
    setEditingId(item.id)
    setEditName(item.name)
  }

  function submitAdd() {
    const trimmed = newName.trim()
    if (!trimmed) return
    addMut.mutate(trimmed)
  }

  function submitRename(item: CommonItem) {
    const trimmed = editName.trim()
    if (!trimmed) return
    if (trimmed === item.name) { setEditingId(null); return }
    renameMut.mutate({ id: item.id, name: trimmed })
  }

  return (
    <>
      <DraggableSheet open={open} onOpenChange={(v: boolean) => { if (!v) onClose() }} featureColor={COLOR}>
        <div className="px-4 pb-8">
          <p className="mb-1 text-lg" style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}>
            Common items
          </p>
          <p style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)', lineHeight: 1.5 }}>
            Quick-add suggestions shared with everyone in your household.
          </p>

          {/* Add row */}
          <div style={{ marginBottom: 20 }}>
            <label style={LABEL_STYLE}>Add a common item</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitAdd() } }}
                placeholder="e.g. Yogurt"
                maxLength={60}
                style={{ ...INPUT_STYLE, flex: 1 }}
              />
              <motion.button
                type="button"
                whileTap={{ y: 1 }}
                onClick={submitAdd}
                disabled={addMut.isPending || !newName.trim()}
                style={{ ...ADD_BTN_STYLE, opacity: addMut.isPending || !newName.trim() ? 0.5 : 1 }}
              >
                <Plus size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Add
              </motion.button>
            </div>
          </div>

          {/* List */}
          {items.length === 0 ? (
            <p style={{ margin: '12px 0', fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)', textAlign: 'center' }}>
              No common items yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map((item) => {
                const editing = editingId === item.id
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 12px',
                      border: '1.5px solid var(--roost-border)',
                      borderBottom: '3px solid var(--roost-border-bottom)',
                      borderRadius: 12, background: 'var(--roost-surface)',
                    }}
                  >
                    {editing ? (
                      <>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); submitRename(item) }
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          maxLength={60}
                          autoFocus
                          style={{ ...INPUT_STYLE, flex: 1, height: 40 }}
                        />
                        <button
                          type="button"
                          aria-label="Save rename"
                          onClick={() => submitRename(item)}
                          disabled={renameMut.isPending}
                          style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: COLOR, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Check size={16} />
                        </button>
                        <button
                          type="button"
                          aria-label="Cancel rename"
                          onClick={() => setEditingId(null)}
                          style={{ width: 40, height: 40, borderRadius: 10, border: '1.5px solid var(--roost-border)', background: 'var(--roost-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <X size={16} color="var(--roost-text-muted)" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--roost-text-primary)' }}>
                          {item.name}
                        </span>
                        <button
                          type="button"
                          aria-label={`Rename ${item.name}`}
                          onClick={() => startEdit(item)}
                          style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Pencil size={16} color="var(--roost-text-muted)" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${item.name}`}
                          onClick={() => setRemoveTarget(item)}
                          style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Trash2 size={16} color="#EF4444" />
                        </button>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DraggableSheet>

      <AlertDialog open={!!removeTarget} onOpenChange={(v) => { if (!v) setRemoveTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              It will no longer appear as a quick-add chip. Items already added to your lists are unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeTarget && deleteMut.mutate(removeTarget.id)}
              disabled={deleteMut.isPending}
              style={{ background: '#EF4444', borderBottom: '3px solid #C93B3B', color: '#fff', fontWeight: 700 }}
            >
              {deleteMut.isPending ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
