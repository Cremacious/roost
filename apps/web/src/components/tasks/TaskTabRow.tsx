'use client'

import { useRef, useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import { motion } from 'framer-motion'
import { SECTION_COLORS } from '@/lib/constants/colors'

const COLOR = SECTION_COLORS.tasks.base
const COLOR_DARK = SECTION_COLORS.tasks.dark

export interface Project {
  id: string
  name: string
  color: string
}

export type TaskTab = 'all' | 'today' | 'new' | string

interface TaskTabRowProps {
  activeTab: TaskTab
  onTabChange: (tab: TaskTab) => void
  projects: Project[]
  todayCount: number
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <motion.button
      whileTap={{ y: 1 }}
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        padding: '7px 14px',
        borderRadius: 20,
        border: '1.5px solid var(--roost-border)',
        borderBottom: active ? `3px solid ${COLOR_DARK}` : '3px solid var(--roost-border)',
        backgroundColor: active ? COLOR : 'var(--roost-surface)',
        color: active ? '#fff' : 'var(--roost-text-secondary)',
        fontWeight: 700,
        fontSize: 13,
        cursor: 'pointer',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        transition: 'background-color 0.1s, border-color 0.1s',
      }}
    >
      {children}
    </motion.button>
  )
}

export default function TaskTabRow({ activeTab, onTabChange, projects, todayCount }: TaskTabRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [overflows, setOverflows] = useState(false)
  const [scrollRatio, setScrollRatio] = useState(0)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const check = () => setOverflows(el.scrollWidth > el.clientWidth)
    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [projects.length])

  function handleScroll() {
    const el = scrollRef.current
    if (!el) return
    const max = el.scrollWidth - el.clientWidth
    setScrollRatio(max > 0 ? el.scrollLeft / max : 0)
  }

  const thumbWidthPct = scrollRef.current
    ? scrollRef.current.clientWidth / scrollRef.current.scrollWidth
    : 1

  return (
    <div style={{ position: 'relative' }}>
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        style={{
          display: 'flex',
          gap: 8,
          overflowX: 'auto',
          scrollbarWidth: 'none',
          paddingBottom: overflows ? 12 : 0,
        }}
        className="scrollbar-none"
      >
        {/* All */}
        <Pill active={activeTab === 'all'} onClick={() => onTabChange('all')}>
          All
        </Pill>

        {/* Today */}
        <Pill active={activeTab === 'today'} onClick={() => onTabChange('today')}>
          Today
          {todayCount > 0 && (
            <span style={{
              fontSize: 10,
              fontWeight: 800,
              backgroundColor: activeTab === 'today' ? 'rgba(255,255,255,0.3)' : COLOR,
              color: '#fff',
              borderRadius: 20,
              padding: '1px 6px',
              marginLeft: 2,
            }}>
              {todayCount}
            </span>
          )}
        </Pill>

        {/* Project pills */}
        {projects.map(p => {
          const active = activeTab === p.id
          return (
            <motion.button
              key={p.id}
              whileTap={{ y: 1 }}
              type="button"
              onClick={() => onTabChange(p.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '7px 14px',
                borderRadius: 20,
                border: '1.5px solid var(--roost-border)',
                borderBottom: active ? `3px solid ${p.color}CC` : '3px solid var(--roost-border)',
                backgroundColor: active ? p.color : 'var(--roost-surface)',
                color: active ? '#fff' : 'var(--roost-text-secondary)',
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flexShrink: 0,
                transition: 'background-color 0.1s, border-color 0.1s',
              }}
            >
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                backgroundColor: active ? 'rgba(255,255,255,0.8)' : p.color,
                flexShrink: 0,
              }} />
              {p.name}
            </motion.button>
          )
        })}

        {/* New project pill */}
        <Pill active={activeTab === 'new'} onClick={() => onTabChange('new')}>
          <Plus size={12} />
          Project
        </Pill>
      </div>

      {/* Scroll progress indicator */}
      {overflows && (
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          backgroundColor: `${COLOR}20`,
          borderRadius: 2,
          overflow: 'hidden',
        }}>
          <motion.div
            style={{
              height: '100%',
              backgroundColor: COLOR,
              borderRadius: 2,
              width: `${thumbWidthPct * 100}%`,
              x: `${scrollRatio * (100 / thumbWidthPct - 100)}%`,
            }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          />
        </div>
      )}
    </div>
  )
}
