import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import FilterPanel from './FilterPanel'

describe('FilterPanel', () => {
  it('renders current values and reports filter and button interactions', async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const onApply = vi.fn()
    const onSave = vi.fn()

    render(
      <FilterPanel
        filter={{ eventType: 'all' }}
        onChange={onChange}
        onApply={onApply}
        onSave={onSave}
      />
    )

    await user.selectOptions(screen.getByRole('combobox', { name: 'Артист' }), 'Basta')
    expect(onChange).toHaveBeenCalledWith({ selectedArtist: 'Basta' })

    fireEvent.change(screen.getByPlaceholderText('Введите имя артиста'), {
      target: { value: 'Speaker' }
    })
    expect(onChange).toHaveBeenCalledWith({ customArtistName: 'Speaker' })

    await user.selectOptions(screen.getByRole('combobox', { name: 'Тип события' }), 'lecture')
    expect(onChange).toHaveBeenCalledWith({ eventType: 'lecture' })

    await user.click(screen.getByRole('button', { name: 'Применить фильтры' }))
    await user.click(screen.getByRole('button', { name: 'Сохранить фильтр' }))
    expect(onApply).toHaveBeenCalledOnce()
    expect(onSave).toHaveBeenCalledOnce()
  })
})
