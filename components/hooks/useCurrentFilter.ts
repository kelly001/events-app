import { useEffect, useState } from 'react'

import { loadCurrentFilter, saveCurrentFilterSnapshot } from '../../src/helpers/loadSaveFilters'
import { CurrentFilter, SavedFilter } from '../../src/types/filters'

const initialFilter: CurrentFilter = {
  eventType: 'all'
}

const normalizeFilter = (filter: CurrentFilter): CurrentFilter => ({
  selectedArtist: filter.selectedArtist || undefined,
  customArtistName: filter.customArtistName || undefined,
  eventType: filter.eventType ?? 'all'
})

const resolveCompatibleFilter = (filter: CurrentFilter): CurrentFilter => {
  const nextFilter = normalizeFilter(filter)

  if (nextFilter.customArtistName) {
    return {
      ...nextFilter,
      selectedArtist: undefined
    }
  }

  return nextFilter
}

const getInitialFilter = (override?: CurrentFilter): CurrentFilter => (
  resolveCompatibleFilter(override ?? initialFilter)
)

const applyCompatibleUpdates = (
  filter: CurrentFilter,
  updates: Partial<CurrentFilter>
): CurrentFilter => {
  const nextFilter = normalizeFilter({ ...filter, ...updates })

  if (updates.selectedArtist) {
    return {
      ...nextFilter,
      customArtistName: undefined
    }
  }

  if (updates.customArtistName?.trim()) {
    return {
      ...nextFilter,
      selectedArtist: undefined
    }
  }

  return nextFilter
}

export const useCurrentFilter = (initialFilterOverride?: CurrentFilter) => {
  const [currentFilter, setCurrentFilter] = useState<CurrentFilter>(() => getInitialFilter(initialFilterOverride))
  const [appliedFilter, setAppliedFilter] = useState<CurrentFilter>(currentFilter)

  useEffect(() => {
    if (initialFilterOverride) return

    const cachedFilter = loadCurrentFilter()
    if (!cachedFilter) return

    const nextFilter = resolveCompatibleFilter(cachedFilter)
    setCurrentFilter(nextFilter)
    setAppliedFilter(nextFilter)
  }, [initialFilterOverride])

  const onChange = (updates: Partial<CurrentFilter>) => {
    setCurrentFilter((prev) => applyCompatibleUpdates(prev, updates))
  }

  const onApply = () => {
    const nextFilter = normalizeFilter(currentFilter)
    setAppliedFilter(nextFilter)
    saveCurrentFilterSnapshot(nextFilter)
  }

  const applySavedFilter = (filter: SavedFilter) => {
    const nextFilter = resolveCompatibleFilter({
      selectedArtist: filter.selectedArtist,
      customArtistName: filter.customArtistName,
      eventType: filter.eventType ?? 'all'
    })

    setCurrentFilter(nextFilter)
    setAppliedFilter(nextFilter)
    saveCurrentFilterSnapshot(nextFilter)
  }

  return {
    currentFilter,
    appliedFilter,
    onChange,
    onApply,
    applySavedFilter
  }
}
