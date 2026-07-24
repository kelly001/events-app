import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Event, EventCache } from '../../src/types/events'

const mocks = vi.hoisted(() => ({
  loadEventCache: vi.fn(),
  saveEventCache: vi.fn(),
  useQuery: vi.fn()
}))

vi.mock('../../src/helpers/loadSaveEventCache', () => ({
  loadEventCache: mocks.loadEventCache,
  saveEventCache: mocks.saveEventCache
}))

vi.mock('../../src/trpc/client', () => ({
  trpc: {
    events: {
      list: {
        useQuery: mocks.useQuery
      }
    }
  }
}))

import { useEvents } from './useEvents'

const createEvent = (id: string, title: string): Event => ({
  id,
  title,
  artist: title,
  type: 'concert',
  date: '2026-09-24',
  time: '19:00',
  venue: 'Helsinki Apollo',
  city: 'Helsinki',
  description: `${title} description`,
  price: '49 €',
  url: '#',
  source: 'tochka'
})

describe('useEvents', () => {
  beforeEach(() => {
    mocks.loadEventCache.mockReset()
    mocks.saveEventCache.mockReset()
    mocks.useQuery.mockReset()
  })

  it('returns and persists a successful initial tRPC response', async () => {
    const response: EventCache = {
      events: [createEvent('fresh-1', 'Fresh event')],
      updatedAt: new Date().toISOString()
    }
    mocks.loadEventCache.mockReturnValue(null)
    mocks.useQuery.mockReturnValue({
      data: response,
      isPending: false,
      isError: false
    })

    const { result } = renderHook(() => useEvents())

    expect(result.current.events).toEqual(response.events)
    expect(result.current.isLoading).toBe(false)
    expect(result.current.errorMessage).toBeNull()
    expect(result.current.isCacheFresh).toBe(true)
    await waitFor(() => {
      expect(mocks.saveEventCache).toHaveBeenCalledWith(response)
    })
  })

  it('shows cached data first and updates when tRPC data arrives', async () => {
    const cachedResponse: EventCache = {
      events: [createEvent('cached-1', 'Cached event')],
      updatedAt: new Date().toISOString()
    }
    const freshResponse: EventCache = {
      events: [createEvent('fresh-2', 'Updated event')],
      updatedAt: new Date().toISOString()
    }
    let queryState = {
      data: undefined as EventCache | undefined,
      isPending: true,
      isError: false
    }
    mocks.loadEventCache.mockReturnValue(cachedResponse)
    mocks.useQuery.mockImplementation(() => queryState)

    const { result, rerender } = renderHook(() => useEvents())

    await waitFor(() => {
      expect(result.current.events).toEqual(cachedResponse.events)
      expect(result.current.isLoading).toBe(false)
    })

    queryState = {
      data: freshResponse,
      isPending: false,
      isError: false
    }
    rerender()

    await waitFor(() => {
      expect(result.current.events).toEqual(freshResponse.events)
      expect(result.current.lastUpdated).toBe(freshResponse.updatedAt)
      expect(mocks.saveEventCache).toHaveBeenCalledWith(freshResponse)
    })
  })
})
