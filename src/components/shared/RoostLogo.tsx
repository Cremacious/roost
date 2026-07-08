import Image from 'next/image'

const SIZES = {
  xs: 24,
  sm: 32,
  md: 42,
  lg: 56,
  xl: 72,
}

/**
 * Which background the logo will sit on.
 * - 'onLight' (default): the self-contained red app-icon (white rooster on a red
 *   rounded square). It carries its own background, so it reads clearly on any
 *   light, neutral, or unknown surface. Pair with a dark wordmark.
 * - 'onDark': the transparent white line-art icon. Use ONLY on red or dark
 *   surfaces (sidebar, auth red panels, homepage hero) where it integrates
 *   cleanly. Pair with a white wordmark. Never use this on a light background,
 *   the white icon would vanish.
 */
type LogoVariant = 'onLight' | 'onDark'

const ICON_SRC: Record<LogoVariant, string> = {
  onLight: '/brand/roost-icon-original.png',
  onDark: '/brand/roost-icon.png',
}

interface RoostLogoProps {
  size?: keyof typeof SIZES
  /** Which background the logo sits on. Defaults to 'onLight'. */
  variant?: LogoVariant
  /** Show the "Roost" wordmark next to the icon. Defaults to true. */
  wordmark?: boolean
  /** Color of the wordmark text. Defaults to '#111827' (matches 'onLight'). Pass white on dark surfaces. */
  wordmarkColor?: string
  className?: string
}

export default function RoostLogo({
  size = 'md',
  variant = 'onLight',
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
        src={ICON_SRC[variant]}
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
