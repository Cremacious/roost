'use client'

/** Shared "hide test accounts" checkbox for the admin panel surfaces. */
export function HideTestToggle({
  checked,
  onChange,
}: {
  checked: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        cursor: 'pointer',
        userSelect: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        style={{ accentColor: '#6366F1', width: 15, height: 15, cursor: 'pointer' }}
      />
      <span style={{ fontSize: 12, fontWeight: 700, color: '#94A3B8' }}>Hide test accounts</span>
    </label>
  )
}
