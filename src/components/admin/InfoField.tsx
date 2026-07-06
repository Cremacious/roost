'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

/**
 * Labelled value used in the admin expandable rows. When `mono` is set (used
 * for IDs) a copy-to-clipboard button is shown next to the value.
 */
export function InfoField({
  label,
  value,
  mono,
}: {
  label: string
  value: string
  mono?: boolean
}) {
  const [copied, setCopied] = useState(false)
  const canCopy = Boolean(mono) && value !== '' && value !== 'None'

  function copy() {
    navigator.clipboard?.writeText(value).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div>
      <p
        style={{
          fontSize: 11,
          fontWeight: 700,
          color: '#475569',
          margin: '0 0 3px',
          textTransform: 'uppercase',
          letterSpacing: '0.07em',
        }}
      >
        {label}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <p
          style={{
            fontSize: 12,
            fontWeight: 600,
            color: '#94A3B8',
            margin: 0,
            fontFamily: mono ? 'monospace' : 'inherit',
          }}
        >
          {value}
        </p>
        {canCopy && (
          <button
            type="button"
            onClick={copy}
            aria-label={`Copy ${label}`}
            title={`Copy ${label}`}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: copied ? '#22C55E' : '#64748B',
              padding: 2,
              display: 'flex',
              alignItems: 'center',
            }}
          >
            {copied ? <Check size={12} /> : <Copy size={12} />}
          </button>
        )}
      </div>
    </div>
  )
}
