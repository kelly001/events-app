import { useEffect, useState } from 'react'

import { loadEventCache, saveEventCache } from '../../src/helpers/loadSaveEventCache'
import { Event } from '../../src/types/events'

const CACHE_TTL_MS = 6 * 60 * 60 * 1000

export const useEvents = () => {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    const fetchEvents = async () => {
      try {
        const cached = loadEventCache()
        const isFresh = cached
          ? Date.now() - new Date(cached.updatedAt).getTime() < CACHE_TTL_MS
          : false

        if (cached && isFresh) {
          if (isMounted) {
            setEvents(cached.events)
            setLastUpdated(cached.updatedAt)
            setIsLoading(false)
          }
        }

        const response = await fetch('/api/events')
        if (!response.ok) {
          throw new Error('Failed to load events')
        }

        const data = await response.json()
        const nextEvents = data.events ?? []
        const nextUpdatedAt = data.updatedAt ?? new Date().toISOString()

        if (isMounted) {
          setEvents(nextEvents)
          setLastUpdated(nextUpdatedAt)
          setErrorMessage(null)
        }

        saveEventCache({
          events: nextEvents,
          updatedAt: nextUpdatedAt
        })
      } catch {
        if (isMounted) {
          setErrorMessage('Не удалось загрузить события. Показываем последние сохраненные данные.')
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    fetchEvents()

    return () => {
      isMounted = false
    }
  }, [])

  return {
    events,
    isLoading,
    lastUpdated,
    errorMessage
  }
}
