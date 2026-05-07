import { forwardRef } from 'react'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  focusColor?: string
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, focusColor = '#EF4444', style, onFocus, onBlur, ...props }, ref) => {
    return (
      <input
        ref={ref}
        className={['w-full outline-none placeholder:font-[700]', className].filter(Boolean).join(' ')}
        style={{
          backgroundColor: 'var(--roost-surface)',
          color: 'var(--roost-text-primary)',
          border: '1.5px solid var(--roost-border)',
          borderBottom: '3px solid var(--roost-border-bottom)',
          borderRadius: '12px',
          padding: '10px 14px',
          fontSize: '16px',
          fontWeight: 700,
          ...style,
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = focusColor
          e.currentTarget.style.borderBottomColor = focusColor
          onFocus?.(e)
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = 'var(--roost-border)'
          e.currentTarget.style.borderBottomColor = 'var(--roost-border-bottom)'
          onBlur?.(e)
        }}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'
