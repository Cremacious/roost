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

export const metadata: Metadata = {
  title: 'Roost',
  description: 'Home, sorted.',
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
