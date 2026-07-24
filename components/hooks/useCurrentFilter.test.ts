import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { useCurrentFilter } from './useCurrentFilter'

const CURRENT_FILTERS_KEY = 'ru-events-helsinki.current-filters'

describe('useCurrentFilter', () => {
  it('loads the current filter from localStorage', async () => {
    const cachedFilter = {
      selectedArtist: 'Basta',
      eventType: 'concert' as const
    }
    window.localStorage.setItem(CURRENT_FILTERS_KEY, JSON.stringify(cachedFilter))

    const { result } = renderHook(() => useCurrentFilter())

    await waitFor(() => {
      expect(result.current.currentFilter).toEqual(cachedFilter)
      expect(result.current.appliedFilter).toEqual(cachedFilter)
    })
  })

  it('updates, applies, and persists compatible filter values', () => {
    const { result } = renderHook(() => useCurrentFilter({
      customArtistName: 'Existing search',
      eventType: 'all'
    }))

    act(() => {
      result.current.onChange({ selectedArtist: 'Basta' })
    })

    expect(result.current.currentFilter).toEqual({
      selectedArtist: 'Basta',
      customArtistName: undefined,
      eventType: 'all'
    })

    act(() => {
      result.current.onApply()
    })

    expect(result.current.appliedFilter).toEqual(result.current.currentFilter)
    expect(JSON.parse(window.localStorage.getItem(CURRENT_FILTERS_KEY) ?? 'null')).toEqual(
      result.current.currentFilter
    )

    act(() => {
      result.current.applySavedFilter({
        id: 'saved-lecture',
        name: 'Lecture',
        customArtistName: 'Speaker',
        selectedArtist: 'Ignored artist',
        eventType: 'lecture'
      })
    })

    expect(result.current.currentFilter).toEqual({
      selectedArtist: undefined,
      customArtistName: 'Speaker',
      eventType: 'lecture'
    })
    expect(result.current.appliedFilter).toEqual(result.current.currentFilter)
  })
})
