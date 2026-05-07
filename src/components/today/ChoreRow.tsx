'use client'

import { motion, AnimatePresence } from 'framer-motion'

interface ChoreRowProps {
  id: string
  title: string
  overdue: boolean
  completed?: boolean
  onComplete: (id: string) => void
}

export function ChoreRow({ id, title, overdue, completed = false, onComplete }: ChoreRowProps) {
  return (
    <AnimatePresence>
      {!completed && (
        <motion.div
          key={id}
          initial={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
          style={{
            backgroundColor: 'var(--roost-surface)',
            border: '1.5px solid var(--roost-border)',
            borderBottom: '3px solid #EF4444',
            borderRadius: 12,
            padding: '10px 14px',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            overflow: 'hidden',
          }}
        >
          <button
            onClick={() => onComplete(id)}
            style={{ width: 22, height: 22, borderRadius: '50%', border: '2px solid #EF4444', backgroundColor: 'transparent', cursor: 'pointer', flexShrink: 0 }}
            aria-label="Complete chore"
          />
          <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: 'var(--roost-text-primary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {title}
          </span>
          <span style={{ fontSize: 11, fontWeight: 800, color: overdue ? '#EF4444' : '#9CA3AF', flexShrink: 0 }}>
            {overdue ? 'Overdue' : 'Today'}
          </span>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
