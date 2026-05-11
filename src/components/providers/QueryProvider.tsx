'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // 30 s global default — reduces redundant refetches while keeping data
            // reasonably fresh. Override per-query for real-time needs (e.g. 10 s
            // for dashboard activity) or stable data (e.g. 5 min for user profile).
            staleTime: 30_000,
            retry: 2,
          },
        },
      })
  )
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
