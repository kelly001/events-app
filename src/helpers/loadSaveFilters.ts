import { CurrentFilter, SavedFilter } from '../types/filters'

const SAVED_FILTERS_KEY = 'ru-events-helsinki.saved-filters'
const CURRENT_FILTERS_KEY = 'ru-events-helsinki.current-filters'

export const loadSavedFilters = (): SavedFilter[] => {
  if (typeof window === 'undefined') return []

  const raw = window.localStorage.getItem(SAVED_FILTERS_KEY)
  if (!raw) return []

  try {
    return JSON.parse(raw) as SavedFilter[]
  } catch {
    return []
  }
}

export const saveSavedFilters = (filters: SavedFilter[]) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(filters))
}

export const hasSavedFiltersStorage = () => {
  if (typeof window === 'undefined') return false
  return window.localStorage.getItem(SAVED_FILTERS_KEY) !== null && window.localStorage.getItem(SAVED_FILTERS_KEY) !== '[]';
}

export const loadCurrentFilter = (): CurrentFilter | null => {
  if (typeof window === 'undefined') return null

  const raw = window.localStorage.getItem(CURRENT_FILTERS_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as CurrentFilter
  } catch {
    return null
  }
}

export const saveCurrentFilterSnapshot = (filter: CurrentFilter) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(CURRENT_FILTERS_KEY, JSON.stringify(filter))
}
