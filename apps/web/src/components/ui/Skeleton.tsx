export function Skeleton({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div
      className={['animate-pulse rounded-xl', className].filter(Boolean).join(' ')}
      style={{ backgroundColor: 'var(--roost-border)', ...style }}
    />
  )
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div
      className={className}
      style={{
        backgroundColor: 'var(--roost-surface)',
        border: '1.5px solid var(--roost-border)',
        borderBottom: '4px solid var(--roost-border-bottom)',
        borderRadius: 16,
        padding: 16,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}
    >
      <Skeleton style={{ height: 20, width: '75%' }} />
      <Skeleton style={{ height: 16, width: '50%' }} />
    </div>
  )
}
