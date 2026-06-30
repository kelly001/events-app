import { useEffect, useState } from 'react'

import { loadSavedFilters, saveSavedFilters } from '../../src/helpers/loadSaveFilters'
import { CurrentFilter, SavedFilter, eventTypeOptions } from '../../src/types/filters'

const getFilterLabel = (filters: CurrentFilter) => {
  const artistLabel = filters.customArtistName || filters.selectedArtist || 'Любой артист'
  const typeLabel =
    filters.eventType && filters.eventType !== 'all'
      ? eventTypeOptions.find((option) => option.value === filters.eventType)?.label || filters.eventType
      : 'Все типы'

  return `${artistLabel} · ${typeLabel}`
}

export const useSavedFilters = () => {
  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>([])
  const [hasLoadedSavedFilters, setHasLoadedSavedFilters] = useState(false)

  useEffect(() => {
    setSavedFilters(loadSavedFilters())
    setHasLoadedSavedFilters(true)
  }, [])

  useEffect(() => {
    if (!hasLoadedSavedFilters) return
    saveSavedFilters(savedFilters)
  }, [hasLoadedSavedFilters, savedFilters])

  const saveFilter = (filter: CurrentFilter) => {
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
    savedFilters,
    saveFilter,
    removeSavedFilter
  }
}
