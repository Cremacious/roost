'use client'

import { motion } from 'framer-motion'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'section' | 'ghost'
  color?: string
  darkColor?: string
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export function Button({
  children,
  variant = 'primary',
  color = '#EF4444',
  darkColor = '#C93B3B',
  size = 'md',
  loading,
  className,
  disabled,
  ...props
}: ButtonProps) {
  const sizes: Record<string, string> = {
    sm: 'h-9 px-4 text-sm',
    md: 'h-11 px-6 text-sm',
    lg: 'h-14 px-8 text-base',
  }

  const buttonStyle: React.CSSProperties =
    variant === 'primary' || variant === 'section'
      ? {
          backgroundColor: color,
          borderBottom: `3px solid ${darkColor}`,
          color: '#fff',
          border: 'none',
        }
      : {
          backgroundColor: 'transparent',
          color: 'var(--roost-text-primary)',
          border: '1.5px solid var(--roost-border)',
        }

  const sizeClass = sizes[size] ?? sizes.md
  const baseClass = 'rounded-[14px] flex items-center justify-center gap-2 transition-opacity'
  const disabledClass = disabled || loading ? 'opacity-50 cursor-not-allowed' : ''
  const combinedClass = [baseClass, sizeClass, disabledClass, className].filter(Boolean).join(' ')

  return (
    <motion.button
      whileTap={{ y: 1 }}
      {...(props as React.ComponentProps<typeof motion.button>)}
      disabled={disabled || loading}
      className={combinedClass}
      style={{ ...buttonStyle, fontWeight: 800 }}
    >
      {loading ? (
        <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
      ) : (
        children
      )}
    </motion.button>
  )
}
