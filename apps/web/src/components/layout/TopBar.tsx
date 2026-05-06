'use client'

import { useEffect, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Sun,
  Wind,
} from 'lucide-react'
import { useHousehold } from '@/lib/hooks/useHousehold'
import { useUserPreferences } from '@/lib/hooks/useUserPreferences'

interface WeatherResponse {
  current_weather: { temperature: number; weathercode: number }
}

function getWeatherIcon(code: number) {
  if (code === 0) return <Sun size={14} />
  if (code <= 3) return <Cloud size={14} />
  if (code <= 48) return <Wind size={14} />
  if (code <= 67) return <CloudRain size={14} />
  if (code <= 77) return <CloudSnow size={14} />
  if (code <= 82) return <CloudRain size={14} />
  if (code <= 86) return <CloudSnow size={14} />
  return <CloudLightning size={14} />
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
}

export function TopBar() {
  const [mounted, setMounted] = useState(false)
  const [time, setTime] = useState('')
  const locationRequested = useRef(false)
  const queryClient = useQueryClient()

  const { temperatureUnit, latitude, longitude, isLoading: prefsLoading } = useUserPreferences()
  const { household } = useHousehold()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Clock — aligned to the minute boundary
  useEffect(() => {
    const tick = () => setTime(formatTime(new Date()))
    tick()
    const ms = (60 - new Date().getSeconds()) * 1000
    const align = setTimeout(() => {
      tick()
      const interval = setInterval(tick, 60_000)
      return () => clearInterval(interval)
    }, ms)
    return () => clearTimeout(align)
  }, [])

  // Location detection on first mount, only if no stored location
  useEffect(() => {
    if (prefsLoading) return
    if (locationRequested.current) return
    locationRequested.current = true
    if (latitude !== null) return
    if (!navigator.geolocation) return

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude: lat, longitude: lon } = position.coords
        const tz = Intl.DateTimeFormat().resolvedOptions().timeZone
        const unit = tz.startsWith('America/') ? 'fahrenheit' : 'celsius'
        await fetch('/api/user/preferences', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ latitude: lat, longitude: lon, temperature_unit: unit }),
        }).catch(() => {})
        queryClient.invalidateQueries({ queryKey: ['user-preferences'] })
      },
      () => {},
      { timeout: 10_000 },
    )
  }, [prefsLoading, latitude, queryClient])

  // Weather
  const effectiveLat = latitude ?? 28.5
  const effectiveLon = longitude ?? -81.4
  const weatherUrl =
    temperatureUnit === 'fahrenheit'
      ? `https://api.open-meteo.com/v1/forecast?latitude=${effectiveLat}&longitude=${effectiveLon}&current_weather=true&temperature_unit=fahrenheit`
      : `https://api.open-meteo.com/v1/forecast?latitude=${effectiveLat}&longitude=${effectiveLon}&current_weather=true`

  const { data: weatherData } = useQuery<WeatherResponse>({
    queryKey: ['weather', effectiveLat, effectiveLon, temperatureUnit],
    queryFn: () => fetch(weatherUrl).then((r) => r.json()),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
    enabled: mounted,
  })

  const weather = weatherData?.current_weather
  const unitLabel = temperatureUnit === 'fahrenheit' ? '°F' : '°C'
  const householdName = household?.name ?? ''

  return (
    <header
      className="fixed left-0 right-0 top-0 z-30 flex h-14 items-center justify-between border-b px-4 bg-[#C0160C] md:bg-(--roost-topbar-bg) md:left-[180px]"
      style={{ borderBottomColor: 'var(--roost-topbar-border)' }}
    >
      {/* Left: logo on mobile, household name on desktop */}
      <div className="flex items-center gap-2 min-w-0">
        {/* Mobile logo */}
        <div className="flex items-center gap-2 md:hidden">
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: 7,
              backgroundColor: 'rgba(255,255,255,0.22)',
              flexShrink: 0,
            }}
          />
          <span style={{ color: '#fff', fontWeight: 800, fontSize: 15, letterSpacing: '-0.3px' }}>
            Roost
          </span>
        </div>

        {/* Desktop household name */}
        <div className="hidden md:block min-w-0">
          <span
            className="truncate text-base"
            style={{ color: 'var(--roost-text-primary)', fontWeight: 800, maxWidth: 220, display: 'block' }}
          >
            {householdName}
          </span>
        </div>
      </div>

      {/* Right: weather chip + time */}
      <div className="flex items-center gap-3">
        {/* Weather chip — mobile (white on red) */}
        {mounted && weather && (
          <div className="md:hidden">
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px]"
              style={{
                backgroundColor: 'rgba(255,255,255,0.18)',
                color: '#ffffff',
                fontWeight: 700,
              }}
            >
              {getWeatherIcon(weather.weathercode)}
              <span>{Math.round(weather.temperature)}{unitLabel}</span>
            </div>
          </div>
        )}

        {/* Weather chip — desktop (themed) */}
        {mounted && weather && (
          <div className="hidden md:block">
            <div
              className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px]"
              style={{
                backgroundColor: 'var(--roost-weather-bg)',
                color: 'var(--roost-weather-color)',
                fontWeight: 700,
              }}
            >
              {getWeatherIcon(weather.weathercode)}
              <span>{Math.round(weather.temperature)}{unitLabel}</span>
            </div>
          </div>
        )}

        {/* Time — hidden on mobile below sm breakpoint */}
        <span
          className="hidden sm:block tabular-nums text-[13px] text-white md:text-(--roost-text-muted)"
          style={{ fontWeight: 700 }}
          suppressHydrationWarning
        >
          {mounted ? time : ''}
        </span>
      </div>
    </header>
  )
}
