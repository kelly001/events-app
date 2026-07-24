import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import type { SavedFilter } from '../src/types/filters'
import SavedFilters from './SavedFilters'

const concertFilter: SavedFilter = {
  id: 'concerts',
  name: 'Concerts',
  selectedArtist: 'Basta',
  eventType: 'concert'
}

describe('SavedFilters', () => {
  it('renders the empty state', () => {
    render(
      <SavedFilters
        filters={[]}
        activeFilter={{ eventType: 'all' }}
        onApply={vi.fn()}
        onRemove={vi.fn()}
      />
    )

    expect(screen.getByText('Нет сохраненных фильтров')).toBeInTheDocument()
  })

  it('marks, applies, and removes a saved filter', async () => {
    const user = userEvent.setup()
    const onApply = vi.fn()
    const onRemove = vi.fn()

    render(
      <SavedFilters
        filters={[concertFilter]}
        activeFilter={{ selectedArtist: 'Basta', eventType: 'concert' }}
        onApply={onApply}
        onRemove={onRemove}
      />
    )

    const applyButton = screen.getByRole('button', { name: /Concerts/ })
    expect(applyButton).toHaveAttribute('aria-pressed', 'true')

    await user.click(applyButton)
    await user.click(screen.getByRole('button', { name: 'Удалить' }))
    expect(onApply).toHaveBeenCalledWith(concertFilter)
    expect(onRemove).toHaveBeenCalledWith('concerts')
  })
})
