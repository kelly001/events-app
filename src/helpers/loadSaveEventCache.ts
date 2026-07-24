import { eventsListResponseSchema, type EventCache } from '../types/events'

const EVENT_CACHE_KEY = 'ru-events-helsinki.cached-events'

export const loadEventCache = (): EventCache | null => {
  if (typeof window === 'undefined') return null

  try {
    const raw = window.localStorage.getItem(EVENT_CACHE_KEY)
    if (!raw) return null

    const result = eventsListResponseSchema.safeParse(JSON.parse(raw))
    return result.success ? result.data : null
  } catch {
    return null
  }
}

export const saveEventCache = (cache: EventCache) => {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(EVENT_CACHE_KEY, JSON.stringify(cache))
  } catch {
    // A storage quota or privacy setting should not break the live event list.
  }
}
