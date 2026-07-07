import type { Metadata, Viewport } from 'next'
import { Nunito } from 'next/font/google'
import { headers } from 'next/headers'
import { Toaster } from 'sonner'
import { QueryProvider } from '@/components/providers/QueryProvider'
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
  alternates: {
    canonical: './',
  },
  openGraph: {
    title: 'Roost',
    description: 'Home, sorted. The household OS for families, roommates, and college students.',
    url: APP_URL,
    siteName: 'Roost',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Roost',
    description: 'Home, sorted. The household OS for families, roommates, and college students.',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
  appleWebApp: {
    title: 'Roost',
    statusBarStyle: 'default',
    capable: true,
  },
  applicationName: 'Roost',
}

export const viewport: Viewport = {
  maximumScale: 1,
  themeColor: '#EF4444',
}


export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Read the nonce injected by proxy.ts so Next.js can stamp its inline
  // hydration scripts with it (nonce-based CSP — no 'unsafe-inline' for JS).
  const nonce = (await headers()).get('x-nonce') ?? undefined

  return (
    <html lang="en" nonce={nonce} className={nunito.variable} suppressHydrationWarning>
      <body>
        <QueryProvider>
          {children}
          <Toaster position="bottom-center" richColors={false} />
        </QueryProvider>
      </body>
    </html>
  )
}
