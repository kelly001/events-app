import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { Event } from '../src/types/events'

const mocks = vi.hoisted(() => ({
  useCurrentFilter: vi.fn(),
  useEvents: vi.fn(),
  useSavedFilters: vi.fn(),
  applyCurrentFilter: vi.fn(),
  applySavedFilter: vi.fn(),
  onFilterChange: vi.fn(),
  saveFilter: vi.fn(),
  removeSavedFilter: vi.fn()
}))

vi.mock('../components/hooks/useCurrentFilter', () => ({
  useCurrentFilter: mocks.useCurrentFilter
}))

vi.mock('../components/hooks/useEvents', () => ({
  useEvents: mocks.useEvents
}))

vi.mock('../components/hooks/useSavedFilters', () => ({
  useSavedFilters: mocks.useSavedFilters
}))

import Page from './page'

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

describe('Page', () => {
  beforeEach(() => {
    mocks.useCurrentFilter.mockReturnValue({
      currentFilter: { eventType: 'all' },
      appliedFilter: { eventType: 'all' },
      onChange: mocks.onFilterChange,
      onApply: mocks.applyCurrentFilter,
      applySavedFilter: mocks.applySavedFilter
    })
    mocks.useSavedFilters.mockReturnValue({
      savedFilters: [],
      saveFilter: mocks.saveFilter,
      removeSavedFilter: mocks.removeSavedFilter
    })
    mocks.useEvents.mockReturnValue({
      events: [createEvent('initial', 'Initial event')],
      isLoading: false,
      lastUpdated: '2026-07-24T12:00:00.000Z',
      isCacheFresh: true,
      errorMessage: null
    })
  })

  it('renders successful event data and forwards the save action', async () => {
    const user = userEvent.setup()
    render(<Page />)

    expect(screen.getByRole('heading', { name: 'Русскоязычные события в Хельсинки' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Initial event' })).toBeInTheDocument()
    expect(screen.getByText('Найдено событий:').parentElement).toHaveTextContent('Найдено событий: 1')

    await user.click(screen.getByRole('button', { name: 'Сохранить фильтр' }))
    expect(mocks.saveFilter).toHaveBeenCalledWith({ eventType: 'all' })
  })

  it('updates the rendered list when event data changes', () => {
    const { rerender } = render(<Page />)
    expect(screen.getByRole('heading', { name: 'Initial event' })).toBeInTheDocument()

    mocks.useEvents.mockReturnValue({
      events: [createEvent('updated', 'Updated event')],
      isLoading: false,
      lastUpdated: '2026-07-24T13:00:00.000Z',
      isCacheFresh: true,
      errorMessage: null
    })
    rerender(<Page />)

    expect(screen.queryByRole('heading', { name: 'Initial event' })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Updated event' })).toBeInTheDocument()
  })
})
