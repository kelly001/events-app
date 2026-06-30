import { CurrentFilter, eventTypeOptions } from '../src/types/filters'
import { artistOptions } from '../src/mockArtists'

const filterPanelLabels = {
  artist: 'Артист',
  chooseArtist: 'Выберите артиста',
  or: 'или',
  enterArtistName: 'Введите имя артиста',
  eventType: 'Тип события',
  applyFilters: 'Применить фильтры',
  saveFilters: 'Сохранить фильтр'
}

const controlClassName = [
  'w-full rounded-2xl border border-border-color bg-white px-4 py-3 text-sm outline-none transition duration-150',
  'hover:border-primary',
  'focus:border-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
].join(' ')

function FilterPanel({
  filter,
  onChange,
  onApply,
  onSave
}: {
  filter: CurrentFilter
  onChange: (updates: Partial<CurrentFilter>) => void
  onApply: () => void
  onSave: () => void
}) {
  return (
    <section className="rounded-3xl border border-border-color bg-card-bg p-6 shadow-sm transition hover:shadow-md">
      <div className="grid gap-4 md:grid-cols-[1.2fr_1fr_0.8fr_auto_auto]">
        <label className="space-y-2">
          <span className="block text-sm font-medium text-text-color">{filterPanelLabels.artist}</span>
          <select
            value={filter.selectedArtist ?? ''}
            onChange={(e) => onChange({ selectedArtist: e.target.value || undefined })}
            className={controlClassName}
          >
            <option value="">{filterPanelLabels.chooseArtist}</option>
            {artistOptions.map((artist) => (
              <option key={artist} value={artist}>{artist}</option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="block text-sm font-medium text-text-color">{filterPanelLabels.or}</span>
          <input
            value={filter.customArtistName ?? ''}
            onChange={(e) => onChange({ customArtistName: e.target.value || undefined })}
            placeholder={filterPanelLabels.enterArtistName}
            className={controlClassName}
          />
        </label>

        <label className="space-y-2">
          <span className="block text-sm font-medium text-text-color">{filterPanelLabels.eventType}</span>
          <select
            value={filter.eventType ?? 'all'}
            onChange={(e) => onChange({ eventType: e.target.value as CurrentFilter['eventType'] })}
            className={controlClassName}
          >
            {eventTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={onApply}
          className="h-12 rounded-3xl bg-primary px-6 text-sm font-semibold text-white outline-none transition duration-150 hover:bg-primary-dark focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-px md:self-end"
        >
          {filterPanelLabels.applyFilters}
        </button>

        <button
          type="button"
          onClick={onSave}
          className="h-12 rounded-3xl border border-primary bg-white px-6 text-sm font-semibold text-primary outline-none transition duration-150 hover:bg-primary-soft focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-px md:self-end"
        >
          {filterPanelLabels.saveFilters}
        </button>
      </div>
    </section>
  )
}

export default FilterPanel
