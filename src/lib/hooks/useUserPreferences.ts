'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'

interface UserPreferences {
  temperatureUnit: string
  latitude: number | null
  longitude: number | null
  timezone: string | null
  language: string | null
}

export function useUserPreferences() {
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery<UserPreferences>({
    queryKey: ['user-preferences'],
    queryFn: async () => {
      const r = await fetch('/api/user/preferences')
      if (!r.ok) throw new Error('Failed to fetch preferences')
      return r.json()
    },
    staleTime: 60_000,
  })

  const mutation = useMutation({
    mutationFn: async (updates: Record<string, unknown>) => {
      const r = await fetch('/api/user/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      })
      if (!r.ok) throw new Error('Failed to update preferences')
      return r.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences'] })
    },
  })

  return {
    temperatureUnit: data?.temperatureUnit ?? 'fahrenheit',
    latitude: data?.latitude ?? null,
    longitude: data?.longitude ?? null,
    timezone: data?.timezone ?? null,
    language: data?.language ?? null,
    isLoading,
    updatePreferences: mutation.mutateAsync,
  }
}
