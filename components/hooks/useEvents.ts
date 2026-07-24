import { useEffect, useState } from 'react'

import { loadEventCache, saveEventCache } from '../../src/helpers/loadSaveEventCache'
import { trpc } from '../../src/trpc/client'
import type { EventCache } from '../../src/types/events'

const CACHE_TTL_MS = 6 * 60 * 60 * 1000
const eventMessages = {
  refreshFailedWithCache: 'Не удалось обновить события. Показываем последние сохраненные данные.',
  loadFailed: 'Не удалось загрузить события.'
}

export const useEvents = () => {
  const [cachedSnapshot, setCachedSnapshot] = useState<EventCache | null>(null)
  const [hasReadCache, setHasReadCache] = useState(false)
  const eventsQuery = trpc.events.list.useQuery(undefined, {
    staleTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false
  })

  useEffect(() => {
    setCachedSnapshot(loadEventCache())
    setHasReadCache(true)
  }, [])

  useEffect(() => {
    if (!eventsQuery.data) return
    saveEventCache(eventsQuery.data)
  }, [eventsQuery.data])

  const visibleSnapshot = eventsQuery.data ?? cachedSnapshot
  const lastUpdated = visibleSnapshot?.updatedAt ?? null
  const updatedAtTime = lastUpdated ? new Date(lastUpdated).getTime() : Number.NaN
  const isCacheFresh = Number.isFinite(updatedAtTime)
    ? Date.now() - updatedAtTime < CACHE_TTL_MS
    : false
  const isLoading = !visibleSnapshot && (!hasReadCache || eventsQuery.isPending)
  const errorMessage = eventsQuery.isError
    ? visibleSnapshot
      ? eventMessages.refreshFailedWithCache
      : eventMessages.loadFailed
    : null

  return {
    events: visibleSnapshot?.events ?? [],
    isLoading,
    lastUpdated,
    isCacheFresh,
    errorMessage
  }
}
