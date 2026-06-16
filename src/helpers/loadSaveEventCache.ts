import { EventCache } from '../types/events'

const EVENT_CACHE_KEY = 'ru-events-helsinki.cached-events'

export const loadEventCache = (): EventCache | null => {
  if (typeof window === 'undefined') return null

  const raw = window.localStorage.getItem(EVENT_CACHE_KEY)
  if (!raw) return null

  try {
    return JSON.parse(raw) as EventCache
  } catch {
    return null
  }
}

export const saveEventCache = (cache: EventCache) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(EVENT_CACHE_KEY, JSON.stringify(cache))
}
