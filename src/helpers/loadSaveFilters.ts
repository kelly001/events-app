import { CurrentFilter, SavedFilter } from '../types/filters'

const SAVED_FILTERS_KEY = 'ru-events-helsinki.saved-filters'

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
