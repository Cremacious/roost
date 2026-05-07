'use client'

import { usePathname } from 'next/navigation'

const EXCLUDED_ROUTES = ['/onboarding', '/login', '/signup']

interface AdBannerProps {
  isPremium: boolean
}

export function AdBanner({ isPremium }: AdBannerProps) {
  const pathname = usePathname()

  if (isPremium) return null
  if (EXCLUDED_ROUTES.some(r => pathname.startsWith(r))) return null

  return (
    <div
      style={{
        height: 50,
        width: 320,
        backgroundColor: 'var(--roost-border)',
        borderRadius: '4px 4px 0 0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          fontSize: 9,
          fontWeight: 800,
          letterSpacing: '0.05em',
          color: 'var(--roost-text-muted)',
        }}
      >
        ADVERTISEMENT
      </span>
    </div>
  )
}
