import { SavedFilter } from '../src/types/filters'

type SavedFiltersProps = {
  filters: SavedFilter[]
  onApply: (filter: SavedFilter) => void
  onRemove: (id: string) => void
}

const SavedFilters = ({ filters, onApply, onRemove }: SavedFiltersProps) => {
  if (filters.length === 0) {
    return (
      <div className="rounded-3xl border border-border-color bg-card-bg p-6 text-sm text-muted">
        Нет сохраненных фильтров
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {filters.map((filter) => (
        <div
          key={filter.id}
          className="rounded-2xl border border-border-color bg-white p-4 transition hover:border-primary"
        >
          <button
            type="button"
            onClick={() => onApply(filter)}
            className="w-full text-left"
          >
            <div className="font-semibold text-text-color">{filter.name}</div>
            <div className="mt-1 text-sm text-muted">
              {filter.customArtistName || filter.selectedArtist || 'Любой артист'} · {filter.eventType === 'all' ? 'Все типы' : filter.eventType}
            </div>
          </button>
          <button
            type="button"
            onClick={() => onRemove(filter.id)}
            className="mt-3 text-sm text-red-600 transition hover:text-red-700"
          >
            Удалить
          </button>
        </div>
      ))}
    </div>
  )
}

export default SavedFilters
