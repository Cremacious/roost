'use client'

import { motion } from 'framer-motion'

interface SlabCardProps {
  children: React.ReactNode
  className?: string
  color?: string
  pressable?: boolean
  onClick?: () => void
  style?: React.CSSProperties
}

export function SlabCard({
  children,
  className,
  color = 'var(--roost-border-bottom)',
  pressable = false,
  onClick,
  style,
}: SlabCardProps) {
  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--roost-surface)',
    border: '1.5px solid var(--roost-border)',
    borderBottom: `4px solid ${color}`,
    borderRadius: 16,
    ...style,
  }

  if (!pressable) {
    return (
      <div className={className} style={cardStyle} onClick={onClick}>
        {children}
      </div>
    )
  }

  return (
    <motion.div
      whileTap={{ y: 2 }}
      className={className}
      style={{ ...cardStyle, cursor: 'pointer' }}
      onClick={onClick}
    >
      {children}
    </motion.div>
  )
}
