'use client'

import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CornerDownLeft } from 'lucide-react'
import { parseTaskInput, ParsedTask } from '@/lib/utils/parseTaskInput'

interface TaskQuickCaptureProps {
  onAdd: (parsed: ParsedTask) => Promise<void>
  color: string
  colorDark: string
}

export default function TaskQuickCapture({ onAdd, color, colorDark }: TaskQuickCaptureProps) {
  const [value, setValue] = useState('')
  const [loading, setLoading] = useState(false)
  const [flash, setFlash] = useState<ParsedTask | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit() {
    const trimmed = value.trim()
    if (!trimmed || loading) return
    const parsed = parseTaskInput(trimmed)
    setFlash(parsed)
    setTimeout(() => setFlash(null), 1800)
    setLoading(true)
    try {
      await onAdd(parsed)
      setValue('')
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') handleSubmit()
  }

  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        background: 'var(--roost-surface)',
        border: '1.5px solid var(--roost-border)',
        borderBottom: `3px solid ${value ? colorDark : 'var(--roost-border)'}`,
        borderRadius: 14,
        padding: '0 12px',
        height: 48,
        transition: 'border-bottom-color 0.15s',
      }}>
        <input
          ref={inputRef}
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a task... or try 'dentist fri 3pm high'"
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            fontSize: 14,
            fontWeight: 600,
            color: 'var(--roost-text-primary)',
          }}
        />
        <motion.button
          type="button"
          onClick={handleSubmit}
          whileTap={{ y: 1 }}
          disabled={!value.trim() || loading}
          style={{
            width: 30,
            height: 30,
            borderRadius: 8,
            border: 'none',
            borderBottom: `2px solid ${colorDark}`,
            backgroundColor: value.trim() ? color : 'var(--roost-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: value.trim() ? 'pointer' : 'default',
            flexShrink: 0,
            transition: 'background-color 0.15s',
          }}
        >
          <CornerDownLeft size={14} color="#fff" strokeWidth={2.5} />
        </motion.button>
      </div>

      <AnimatePresence>
        {flash && (flash.dueDate || flash.priority) && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              display: 'flex',
              gap: 6,
              marginTop: 6,
              paddingLeft: 4,
              flexWrap: 'wrap',
            }}
          >
            {flash.dueDate && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                background: color + '18', color: color,
              }}>
                {flash.dueDate}{flash.dueTime ? ` ${flash.dueTime}` : ''}
              </span>
            )}
            {flash.priority && (
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                background: color + '18', color: color,
              }}>
                {flash.priority}
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
