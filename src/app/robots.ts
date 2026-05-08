import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://roost.app'
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/signup', '/privacy', '/terms'],
        disallow: [
          '/admin',
          '/api/',
          '/dashboard',
          '/chores',
          '/grocery',
          '/calendar',
          '/tasks',
          '/notes',
          '/reminders',
          '/expenses',
          '/meals',
          '/stats',
          '/settings',
          '/activity',
          '/onboarding',
          '/invite/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
