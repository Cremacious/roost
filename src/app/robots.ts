import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://roost.app'
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/privacy', '/terms'],
        disallow: [
          '/admin',
          '/api/',
          '/today',
          '/chores',
          '/lists',
          '/calendar',
          '/tasks',
          '/notes',
          '/reminders',
          '/money',
          '/meals',
          '/stats',
          '/settings',
          '/activity',
          '/more',
          '/onboarding',
          '/invite/',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
