'use client'

import { useState, useCallback, useRef } from 'react'
import { AlertTriangle, ArrowLeft, Check, Minus } from 'lucide-react'

const COLOR = '#22C55E'
const COLOR_DARK = '#15803D'
const AMBER = '#F59E0B'
const AMBER_DARK = '#C87D00'

// ── Types ──────────────────────────────────────────────────────────────────

export interface LineItem {
  id: string
  description: string
  amount: number
}

export interface Member {
  id: string
  name: string
  avatarColor?: string
}

export interface AssignedSplit {
  userId: string
  amount: number
}

interface LineItemGridProps {
  items: LineItem[]
  taxAndTip: number
  members: Member[]
  onConfirm: (splits: AssignedSplit[], receiptData: object) => void
  onBack: () => void
}

// ── Helpers ────────────────────────────────────────────────────────────────

function fmt(n: number): string {
  return n.toFixed(2)
}

function firstInitial(name: string): string {
  return name.trim().charAt(0).toUpperCase()
}

function firstName(name: string): string {
  return name.trim().split(' ')[0]
}

// ── Sub-components ─────────────────────────────────────────────────────────

function MemberAvatar({ member, size = 28 }: { member: Member; size?: number }) {
  const bg = member.avatarColor ?? COLOR
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
        color: '#fff',
        fontWeight: 800,
        fontSize: size * 0.43,
        lineHeight: 1,
        userSelect: 'none',
      }}
      aria-hidden="true"
    >
      {firstInitial(member.name)}
    </div>
  )
}

// ── Main component ─────────────────────────────────────────────────────────

export function LineItemGrid({ items: initialItems, taxAndTip, members, onConfirm, onBack }: LineItemGridProps) {
  // Editable line items (description + amount can be fixed inline)
  const [items, setItems] = useState<LineItem[]>(initialItems)

  // assignments: Record<itemId, Set<userId>>
  // Tax/tip is a virtual row with id TAX_ROW_ID — always all members
  const TAX_ROW_ID = '__tax_tip__'

  const [assignments, setAssignments] = useState<Record<string, Set<string>>>(() => {
    const init: Record<string, Set<string>> = {}
    for (const item of initialItems) {
      init[item.id] = new Set() // start unassigned
    }
    init[TAX_ROW_ID] = new Set(members.map(m => m.id)) // tax/tip always all
    return init
  })

  // Inline editing state
  const [editingCell, setEditingCell] = useState<{ itemId: string; field: 'description' | 'amount' } | null>(null)
  const [editValue, setEditValue] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  // ── Assignment logic ─────────────────────────────────────────────────────

  const toggleAssignment = useCallback((itemId: string, userId: string) => {
    setAssignments(prev => {
      const current = new Set(prev[itemId] ?? [])
      if (current.has(userId)) {
        current.delete(userId)
      } else {
        current.add(userId)
      }
      return { ...prev, [itemId]: current }
    })
  }, [])

  // ── Per-person totals ────────────────────────────────────────────────────

  function getPersonTotal(userId: string): number {
    let total = 0
    for (const item of items) {
      const assigned = assignments[item.id]
      if (assigned && assigned.has(userId) && assigned.size > 0) {
        total += item.amount / assigned.size
      }
    }
    // Tax/tip always split equally
    if (taxAndTip > 0 && members.length > 0) {
      total += taxAndTip / members.length
    }
    return total
  }

  // ── Unassigned count ─────────────────────────────────────────────────────

  const unassignedCount = items.filter(item => {
    const assigned = assignments[item.id]
    return !assigned || assigned.size === 0
  }).length

  const canConfirm = unassignedCount === 0

  // ── Inline edit handlers ─────────────────────────────────────────────────

  function startEdit(itemId: string, field: 'description' | 'amount') {
    const item = items.find(i => i.id === itemId)
    if (!item) return
    setEditingCell({ itemId, field })
    setEditValue(field === 'description' ? item.description : fmt(item.amount))
    // Focus happens via useEffect-like pattern with autoFocus on the input
  }

  function commitEdit() {
    if (!editingCell) return
    const { itemId, field } = editingCell
    setItems(prev =>
      prev.map(item => {
        if (item.id !== itemId) return item
        if (field === 'description') {
          return { ...item, description: editValue.trim() || item.description }
        }
        const parsed = parseFloat(editValue)
        return { ...item, amount: isNaN(parsed) || parsed <= 0 ? item.amount : parsed }
      })
    )
    setEditingCell(null)
    setEditValue('')
  }

  function handleEditKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      commitEdit()
    } else if (e.key === 'Escape') {
      setEditingCell(null)
      setEditValue('')
    }
  }

  // Long-press support (mobile)
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  function handleLongPressStart(itemId: string, field: 'description' | 'amount') {
    longPressTimer.current = setTimeout(() => {
      startEdit(itemId, field)
    }, 500)
  }

  function handleLongPressCancel() {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
  }

  // ── Confirm handler ──────────────────────────────────────────────────────

  function handleConfirm() {
    if (!canConfirm) return

    const totals: Record<string, number> = {}
    for (const m of members) totals[m.id] = 0

    for (const item of items) {
      const assigned = assignments[item.id]
      if (assigned && assigned.size > 0) {
        const share = item.amount / assigned.size
        assigned.forEach(uid => {
          totals[uid] = (totals[uid] ?? 0) + share
        })
      }
    }

    // Tax/tip equal split
    if (taxAndTip > 0 && members.length > 0) {
      const tipShare = taxAndTip / members.length
      for (const m of members) {
        totals[m.id] = (totals[m.id] ?? 0) + tipShare
      }
    }

    const splits: AssignedSplit[] = members.map(m => ({
      userId: m.id,
      amount: Math.round((totals[m.id] ?? 0) * 100) / 100,
    }))

    const receiptData = {
      total: items.reduce((s, i) => s + i.amount, 0) + taxAndTip,
      taxAndTip,
      lineItems: items.map(item => ({
        name: item.description,
        amount: item.amount,
        assignedTo: Array.from(assignments[item.id] ?? []),
      })),
    }

    onConfirm(splits, receiptData)
  }

  // ── Styles ────────────────────────────────────────────────────────────────

  const ITEM_COL_WIDTH = 130 // px, sticky
  const MEMBER_COL_WIDTH = 64 // px per member column (wider for name label)
  const ROW_HEIGHT = 52

  const cellBase: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 36,
    height: 36,
    borderRadius: 10,
    flexShrink: 0,
  }

  function getAssignedCellStyle(isAssigned: boolean, isUnassignedRow: boolean): React.CSSProperties {
    if (isAssigned) {
      return {
        ...cellBase,
        backgroundColor: COLOR,
        border: `2px solid ${COLOR_DARK}`,
      }
    }
    if (isUnassignedRow) {
      return {
        ...cellBase,
        backgroundColor: 'transparent',
        border: `2px dashed ${AMBER}`,
      }
    }
    return {
      ...cellBase,
      backgroundColor: 'transparent',
      border: '2px solid var(--roost-border)',
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '0 16px 16px', display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: 36, height: 36, borderRadius: 10,
            border: '1.5px solid var(--roost-border)',
            borderBottom: '3px solid var(--roost-border-bottom)',
            backgroundColor: 'var(--roost-surface)', cursor: 'pointer', flexShrink: 0,
          }}
          aria-label="Back"
        >
          <ArrowLeft size={18} style={{ color: 'var(--roost-text-primary)' }} />
        </button>
        <div style={{ flex: 1 }}>
          <p style={{ color: 'var(--roost-text-primary)', fontWeight: 800, fontSize: 18, margin: 0 }}>
            Who had what?
          </p>
          <p style={{ color: 'var(--roost-text-muted)', fontWeight: 600, fontSize: 13, margin: 0 }}>
            Tap cells to assign items. Shared items split equally.
          </p>
        </div>
      </div>

      {/* Scrollable table area */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'auto', position: 'relative' }}>
        <table
          style={{
            borderCollapse: 'separate',
            borderSpacing: 0,
            width: '100%',
            minWidth: ITEM_COL_WIDTH + members.length * MEMBER_COL_WIDTH,
          }}
          role="grid"
          aria-label="Item assignment grid"
        >
          {/* Column headers */}
          <thead>
            <tr>
              {/* Sticky item name header */}
              <th
                style={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 3,
                  minWidth: ITEM_COL_WIDTH,
                  maxWidth: ITEM_COL_WIDTH,
                  backgroundColor: 'var(--roost-bg)',
                  borderBottom: '1.5px solid var(--roost-border)',
                  padding: '8px 12px',
                  textAlign: 'left',
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: 'var(--roost-text-muted)',
                  whiteSpace: 'nowrap',
                }}
              >
                Item
              </th>

              {/* Member columns */}
              {members.map(member => (
                <th
                  key={member.id}
                  style={{
                    width: MEMBER_COL_WIDTH,
                    minWidth: MEMBER_COL_WIDTH,
                    borderBottom: '1.5px solid var(--roost-border)',
                    padding: '8px 4px',
                    textAlign: 'center',
                    verticalAlign: 'bottom',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                    <MemberAvatar member={member} size={28} />
                    <span style={{
                      color: 'var(--roost-text-primary)',
                      fontWeight: 700,
                      fontSize: 11,
                      maxWidth: MEMBER_COL_WIDTH - 8,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      {firstName(member.name)}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* Line item rows */}
            {items.map(item => {
              const assigned = assignments[item.id] ?? new Set()
              const isUnassigned = assigned.size === 0
              const isShared = assigned.size > 1
              const shareAmount = assigned.size > 0 ? item.amount / assigned.size : 0

              return (
                <tr
                  key={item.id}
                  style={{
                    backgroundColor: isUnassigned ? `${AMBER}0F` : 'transparent',
                  }}
                >
                  {/* Sticky item name cell */}
                  <td
                    style={{
                      position: 'sticky',
                      left: 0,
                      zIndex: 2,
                      minWidth: ITEM_COL_WIDTH,
                      maxWidth: ITEM_COL_WIDTH,
                      backgroundColor: isUnassigned ? `${AMBER}0F` : 'var(--roost-bg)',
                      borderBottom: '1px solid var(--roost-border)',
                      padding: '6px 12px',
                      verticalAlign: 'middle',
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                      {/* Description — double-click/long-press to edit */}
                      {editingCell?.itemId === item.id && editingCell.field === 'description' ? (
                        <input
                          ref={editInputRef}
                          autoFocus
                          type="text"
                          value={editValue}
                          onChange={e => setEditValue(e.target.value)}
                          onBlur={commitEdit}
                          onKeyDown={handleEditKeyDown}
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: 'var(--roost-text-primary)',
                            border: `1.5px solid ${COLOR}`,
                            borderBottom: `2px solid ${COLOR_DARK}`,
                            borderRadius: 6,
                            padding: '2px 6px',
                            backgroundColor: 'var(--roost-surface)',
                            outline: 'none',
                            width: '100%',
                            boxSizing: 'border-box',
                          }}
                        />
                      ) : (
                        <span
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: 'var(--roost-text-primary)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            cursor: 'default',
                            display: 'block',
                          }}
                          title={item.description}
                          onDoubleClick={() => startEdit(item.id, 'description')}
                          onTouchStart={() => handleLongPressStart(item.id, 'description')}
                          onTouchEnd={handleLongPressCancel}
                          onTouchMove={handleLongPressCancel}
                        >
                          {item.description}
                        </span>
                      )}

                      {/* Amount + badges row */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
                        {/* Amount — double-click/long-press to edit */}
                        {editingCell?.itemId === item.id && editingCell.field === 'amount' ? (
                          <input
                            ref={editInputRef}
                            autoFocus
                            type="number"
                            inputMode="decimal"
                            min={0}
                            step="0.01"
                            value={editValue}
                            onChange={e => setEditValue(e.target.value)}
                            onBlur={commitEdit}
                            onKeyDown={handleEditKeyDown}
                            style={{
                              fontSize: 12,
                              fontWeight: 600,
                              color: 'var(--roost-text-muted)',
                              border: `1.5px solid ${COLOR}`,
                              borderBottom: `2px solid ${COLOR_DARK}`,
                              borderRadius: 6,
                              padding: '2px 6px',
                              backgroundColor: 'var(--roost-surface)',
                              outline: 'none',
                              width: 72,
                              boxSizing: 'border-box',
                            }}
                          />
                        ) : (
                          <span
                            style={{ fontSize: 12, fontWeight: 600, color: 'var(--roost-text-muted)', cursor: 'default' }}
                            onDoubleClick={() => startEdit(item.id, 'amount')}
                            onTouchStart={() => handleLongPressStart(item.id, 'amount')}
                            onTouchEnd={handleLongPressCancel}
                            onTouchMove={handleLongPressCancel}
                          >
                            ${fmt(item.amount)}
                          </span>
                        )}

                        {/* Shared badge */}
                        {isShared && (
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: COLOR_DARK,
                            backgroundColor: `${COLOR}22`,
                            border: `1px solid ${COLOR}55`,
                            borderRadius: 4,
                            padding: '1px 5px',
                            letterSpacing: '0.04em',
                            whiteSpace: 'nowrap',
                          }}>
                            shared ${fmt(shareAmount)}
                          </span>
                        )}

                        {/* Unassigned badge */}
                        {isUnassigned && (
                          <span style={{
                            fontSize: 10,
                            fontWeight: 700,
                            color: AMBER_DARK,
                            backgroundColor: `${AMBER}22`,
                            border: `1px solid ${AMBER}55`,
                            borderRadius: 4,
                            padding: '1px 5px',
                            letterSpacing: '0.04em',
                            whiteSpace: 'nowrap',
                          }}>
                            unassigned
                          </span>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Member tap cells */}
                  {members.map(member => {
                    const isAssigned = assigned.has(member.id)
                    return (
                      <td
                        key={member.id}
                        style={{
                          width: MEMBER_COL_WIDTH,
                          minWidth: MEMBER_COL_WIDTH,
                          borderBottom: '1px solid var(--roost-border)',
                          padding: '8px 4px',
                          textAlign: 'center',
                          verticalAlign: 'middle',
                          height: ROW_HEIGHT,
                        }}
                      >
                        <button
                          onClick={() => toggleAssignment(item.id, member.id)}
                          style={{
                            ...getAssignedCellStyle(isAssigned, isUnassigned),
                            cursor: 'pointer',
                            padding: 0,
                            outline: 'none',
                            margin: 'auto',
                          }}
                          aria-label={`${isAssigned ? 'Unassign' : 'Assign'} ${item.description} to ${member.name}`}
                          aria-pressed={isAssigned}
                        >
                          {isAssigned && (
                            <Check size={18} style={{ color: '#fff' }} strokeWidth={3} />
                          )}
                        </button>
                      </td>
                    )
                  })}
                </tr>
              )
            })}

            {/* Tax + tip row (always shown, locked) */}
            {taxAndTip > 0 && (
              <tr style={{ backgroundColor: 'transparent' }}>
                <td
                  style={{
                    position: 'sticky',
                    left: 0,
                    zIndex: 2,
                    minWidth: ITEM_COL_WIDTH,
                    maxWidth: ITEM_COL_WIDTH,
                    backgroundColor: 'var(--roost-bg)',
                    borderBottom: '1px solid var(--roost-border)',
                    padding: '6px 12px',
                    verticalAlign: 'middle',
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <span style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: 'var(--roost-text-muted)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}>
                      Tax + tip
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--roost-text-muted)' }}>
                      ${fmt(taxAndTip)} split equally
                    </span>
                  </div>
                </td>

                {/* Locked dash cells */}
                {members.map(member => (
                  <td
                    key={member.id}
                    style={{
                      width: MEMBER_COL_WIDTH,
                      minWidth: MEMBER_COL_WIDTH,
                      borderBottom: '1px solid var(--roost-border)',
                      padding: '8px 4px',
                      textAlign: 'center',
                      verticalAlign: 'middle',
                      height: ROW_HEIGHT,
                    }}
                  >
                    <div
                      style={{
                        ...cellBase,
                        backgroundColor: 'var(--roost-surface)',
                        border: '1.5px solid var(--roost-border)',
                        margin: 'auto',
                        cursor: 'not-allowed',
                      }}
                      aria-label={`Tax and tip: ${member.name} pays equal share`}
                      role="cell"
                    >
                      <Minus size={14} style={{ color: 'var(--roost-text-muted)' }} strokeWidth={2.5} />
                    </div>
                  </td>
                ))}
              </tr>
            )}

            {/* Footer: per-person totals */}
            <tr
              style={{
                position: 'sticky',
                bottom: 0,
                zIndex: 4,
                backgroundColor: 'var(--roost-surface)',
              }}
            >
              <td
                style={{
                  position: 'sticky',
                  left: 0,
                  zIndex: 5,
                  minWidth: ITEM_COL_WIDTH,
                  maxWidth: ITEM_COL_WIDTH,
                  backgroundColor: 'var(--roost-surface)',
                  borderTop: '2px solid var(--roost-border)',
                  padding: '10px 12px',
                  verticalAlign: 'middle',
                }}
              >
                <span style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.07em',
                  textTransform: 'uppercase',
                  color: 'var(--roost-text-muted)',
                }}>
                  Your total
                </span>
              </td>

              {members.map(member => {
                const total = getPersonTotal(member.id)
                return (
                  <td
                    key={member.id}
                    style={{
                      width: MEMBER_COL_WIDTH,
                      minWidth: MEMBER_COL_WIDTH,
                      borderTop: '2px solid var(--roost-border)',
                      padding: '10px 4px',
                      textAlign: 'center',
                      verticalAlign: 'middle',
                    }}
                  >
                    <span style={{
                      fontSize: 13,
                      fontWeight: 800,
                      color: total > 0 ? COLOR_DARK : 'var(--roost-text-muted)',
                    }}>
                      {total > 0 ? `$${fmt(total)}` : '--'}
                    </span>
                  </td>
                )
              })}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Unassigned amber banner */}
      {unassignedCount > 0 && (
        <div style={{
          margin: '0 16px',
          padding: '10px 14px',
          borderRadius: 12,
          backgroundColor: `${AMBER}18`,
          border: `1.5px solid ${AMBER}55`,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexShrink: 0,
          marginTop: 8,
        }}>
          <AlertTriangle size={16} style={{ color: AMBER, flexShrink: 0 }} />
          <p style={{
            color: AMBER_DARK,
            fontWeight: 700,
            fontSize: 13,
            margin: 0,
          }}>
            {unassignedCount === 1
              ? '1 item unassigned. Assign it to continue.'
              : `${unassignedCount} items unassigned. Assign them to continue.`}
          </p>
        </div>
      )}

      {/* Confirm button */}
      <div style={{ padding: '12px 16px 32px', flexShrink: 0 }}>
        <button
          onClick={handleConfirm}
          disabled={!canConfirm}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '100%',
            padding: '15px 0',
            borderRadius: 14,
            fontWeight: 800,
            fontSize: 16,
            cursor: canConfirm ? 'pointer' : 'not-allowed',
            border: 'none',
            backgroundColor: canConfirm ? COLOR : `${COLOR}70`,
            color: '#fff',
            borderBottom: canConfirm ? `3px solid ${COLOR_DARK}` : 'none',
            opacity: canConfirm ? 1 : 0.7,
          }}
        >
          Confirm assignment
        </button>
      </div>
    </div>
  )
}
