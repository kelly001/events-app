import { useEffect, useMemo, useState } from 'react'

import { filterEvents } from '../../src/helpers/filterEvents'
import { loadSavedFilters, saveSavedFilters } from '../../src/helpers/loadSaveFilters'
import { loadEventCache, saveEventCache } from '../../src/helpers/loadSaveEventCache'
import { Event } from '../../src/types/events'
import { CurrentFilter, SavedFilter, eventTypeOptions } from '../../src/types/filters'

const initialFilter: CurrentFilter = {
  eventType: 'all'
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000

const getFilterLabel = (filters: CurrentFilter) => {
  const artistLabel = filters.customArtistName || filters.selectedArtist || 'Любой артист'
  const typeLabel =
    filters.eventType && filters.eventType !== 'all'
      ? eventTypeOptions.find((option) => option.value === filters.eventType)?.label || filters.eventType
      : 'Все типы'

  return `${artistLabel} · ${typeLabel}`
}

export const useEventPage = () => {
  const [activeFilter, setActiveFilter] = useState<CurrentFilter>(initialFilter)
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  const [events, setEvents] = useState<Event[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [lastUpdated, setLastUpdated] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  useEffect(() => {
    const storedFilters = loadSavedFilters()
    if (storedFilters.length > 0) {
      setSavedFilters(storedFilters)
    }
  }, [])

  useEffect(() => {
    saveSavedFilters(savedFilters)
  }, [savedFilters])

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

  const filteredEvents = useMemo(
    () => filterEvents(events, activeFilter),
    [events, activeFilter]
  )

  const applySavedFilter = (filter: SavedFilter) => {
    const nextFilters = {
      selectedArtist: filter.selectedArtist,
      customArtistName: filter.customArtistName,
      eventType: filter.eventType ?? 'all'
    }

    setActiveFilter(nextFilters)
  }

  const saveCurrentFilter = (filter: CurrentFilter) => {
    const nextFilter: SavedFilter = {
      id: `saved-${Date.now()}`,
      name: getFilterLabel(filter),
      ...filter
    }

    setSavedFilters((prev) => {
      const alreadyExists = prev.some(
        (savedFilter) =>
          savedFilter.name === nextFilter.name &&
          savedFilter.selectedArtist === nextFilter.selectedArtist &&
          savedFilter.customArtistName === nextFilter.customArtistName &&
          savedFilter.eventType === nextFilter.eventType
      )

      if (alreadyExists) {
        return prev
      }

      return [nextFilter, ...prev]
    })
  }

  const removeSavedFilter = (id: string) => {
    setSavedFilters((prev) => prev.filter((filter) => filter.id !== id))
  }

  return {
    activeFilter,
    setActiveFilter,
    savedFilters,
    events,
    isLoading,
    lastUpdated,
    errorMessage,
    filteredEvents,
    applySavedFilter,
    saveCurrentFilter,
    removeSavedFilter,
    setSavedFilters
  }
}
