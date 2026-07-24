import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { SavedFilter } from '../../src/types/filters'
import { useSavedFilters } from './useSavedFilters'

const SAVED_FILTERS_KEY = 'ru-events-helsinki.saved-filters'

const storedFilter: SavedFilter = {
  id: 'stored-concert',
  name: 'Stored concert',
  selectedArtist: 'Basta',
  eventType: 'concert'
}

describe('useSavedFilters', () => {
  beforeEach(() => {
    vi.spyOn(Date, 'now').mockReturnValue(1_234)
  })

  it('loads saved filters from localStorage on mount', async () => {
    window.localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify([storedFilter]))

    const { result } = renderHook(() => useSavedFilters())

    await waitFor(() => {
      expect(result.current.savedFilters).toEqual([storedFilter])
    })
  })

  it('adds and removes filters and persists each update', async () => {
    window.localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify([storedFilter]))
    const { result } = renderHook(() => useSavedFilters())

    await waitFor(() => {
      expect(result.current.savedFilters).toHaveLength(1)
    })

    act(() => {
      result.current.saveFilter({
        customArtistName: 'New artist',
        eventType: 'lecture'
      })
    })

    await waitFor(() => {
      expect(result.current.savedFilters).toHaveLength(2)
      expect(result.current.savedFilters[0]).toMatchObject({
        id: 'saved-1234',
        customArtistName: 'New artist',
        eventType: 'lecture'
      })
      expect(JSON.parse(window.localStorage.getItem(SAVED_FILTERS_KEY) ?? '[]')).toHaveLength(2)
    })

    act(() => {
      result.current.removeSavedFilter('stored-concert')
    })

    await waitFor(() => {
      expect(result.current.savedFilters).toHaveLength(1)
      expect(result.current.savedFilters[0].id).toBe('saved-1234')
      expect(JSON.parse(window.localStorage.getItem(SAVED_FILTERS_KEY) ?? '[]')).toHaveLength(1)
    })
  })
})
