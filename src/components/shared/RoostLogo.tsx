import Image from 'next/image'

const SIZES = {
  xs: 24,
  sm: 32,
  md: 42,
  lg: 56,
  xl: 72,
}

interface RoostLogoProps {
  size?: keyof typeof SIZES
  /** Show the "Roost" wordmark next to the icon. Defaults to true. */
  wordmark?: boolean
  /** Color of the wordmark text. Defaults to '#111827'. */
  wordmarkColor?: string
  className?: string
}

export default function RoostLogo({
  size = 'md',
  wordmark = true,
  wordmarkColor = '#111827',
  className,
}: RoostLogoProps) {
  const px = SIZES[size]

  const fontSizeMap: Record<keyof typeof SIZES, number> = {
    xs: 13,
    sm: 16,
    md: 20,
    lg: 26,
    xl: 32,
  }

  return (
    <div
      className={className}
      style={{ display: 'flex', alignItems: 'center', gap: Math.round(px * 0.28) }}
    >
      <Image
        src="/brand/roost-icon.png"
        alt="Roost"
        width={px}
        height={px}
        style={{ borderRadius: Math.round(px * 0.26), display: 'block', flexShrink: 0 }}
        priority
      />
      {wordmark && (
        <span
          style={{
            color: wordmarkColor,
            fontWeight: 900,
            fontSize: fontSizeMap[size],
            letterSpacing: '-0.5px',
            lineHeight: 1,
          }}
        >
          Roost
        </span>
      )}
    </div>
  )
}
