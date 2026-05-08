import type { Metadata, Viewport } from 'next'
import { Nunito } from 'next/font/google'
import { headers } from 'next/headers'
import { Toaster } from 'sonner'
import { ThemeProvider } from '@/components/providers/ThemeProvider'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { getSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import './globals.css'

const nunito = Nunito({
  subsets: ['latin'],
  weight: ['600', '700', '800', '900'],
  variable: '--font-nunito',
  display: 'swap',
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://roost.app'

export const metadata: Metadata = {
  title: {
    default: 'Roost',
    template: '%s | Roost',
  },
  description: 'Home, sorted. The household OS for families, roommates, and college students.',
  metadataBase: new URL(APP_URL),
  openGraph: {
    title: 'Roost',
    description: 'Home, sorted. The household OS for families, roommates, and college students.',
    url: APP_URL,
    siteName: 'Roost',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'Roost — Home, sorted.',
      },
    ],
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Roost',
    description: 'Home, sorted. The household OS for families, roommates, and college students.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
}

export const viewport: Viewport = {
  maximumScale: 1,
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Read the nonce injected by proxy.ts so Next.js can stamp its inline
  // hydration scripts with it (nonce-based CSP — no 'unsafe-inline' for JS).
  const nonce = (await headers()).get('x-nonce') ?? undefined

  const session = await getSession()
  let initialTheme = 'default'
  if (session?.user?.id) {
    const row = await db
      .select({ theme: users.theme })
      .from(users)
      .where(eq(users.id, session.user.id))
      .limit(1)
      .then(r => r[0])
    if (row?.theme) initialTheme = row.theme
  }

  return (
    <html lang="en" nonce={nonce} className={nunito.variable} suppressHydrationWarning>
      <body>
        <ThemeProvider initialTheme={initialTheme}>
          <QueryProvider>
            {children}
            <Toaster position="bottom-center" richColors={false} />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
