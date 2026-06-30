import { useEffect, useState } from 'react'

import { loadEventCache, saveEventCache } from '../../src/helpers/loadSaveEventCache'
import { Event } from '../../src/types/events'

const CACHE_TTL_MS = 6 * 60 * 60 * 1000
const eventMessages = {
  refreshFailedWithCache: 'Не удалось обновить события. Показываем последние сохраненные данные.',
  loadFailed: 'Не удалось загрузить события.'
}

export const useEvents = () => {
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isCacheFresh, setIsCacheFresh] = useState(false)

  useEffect(() => {
    let isMounted = true

    const fetchEvents = async () => {
      const cached = loadEventCache()
      const cachedIsFresh = cached
        ? Date.now() - new Date(cached.updatedAt).getTime() < CACHE_TTL_MS
        : false

      if (cached && isMounted) {
        setEvents(cached.events)
        setLastUpdated(cached.updatedAt)
        setIsCacheFresh(cachedIsFresh)
        setIsLoading(false)
      }

      try {
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
          setIsCacheFresh(true)
          setErrorMessage(null)
        }

        saveEventCache({
          events: nextEvents,
          updatedAt: nextUpdatedAt
        })
      } catch {
        if (isMounted) {
          setErrorMessage(cached
            ? eventMessages.refreshFailedWithCache
            : eventMessages.loadFailed
          )
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
    isCacheFresh,
    errorMessage
  }
}
