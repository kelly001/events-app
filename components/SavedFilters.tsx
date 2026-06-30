import { sharedLabels } from '../src/constants/sharedLabels'
import { getEventTypeLabel } from '../src/helpers/getEventTypeLabel'
import { CurrentFilter, SavedFilter } from '../src/types/filters'

type SavedFiltersProps = {
  filters: SavedFilter[]
  activeFilter: CurrentFilter
  onApply: (filter: SavedFilter) => void
  onRemove: (id: string) => void
}

const savedFiltersLabels = {
  empty: 'Нет сохраненных фильтров',
  remove: 'Удалить'
}

const isActiveFilter = (filter: SavedFilter, activeFilter: CurrentFilter) => (
  (filter.selectedArtist ?? '') === (activeFilter.selectedArtist ?? '') &&
  (filter.customArtistName ?? '') === (activeFilter.customArtistName ?? '') &&
  (filter.eventType ?? 'all') === (activeFilter.eventType ?? 'all')
)

const SavedFilters = ({ filters, activeFilter, onApply, onRemove }: SavedFiltersProps) => {
  if (filters.length === 0) {
    return (
      <div className="rounded-3xl border border-border-color bg-card-bg p-6 text-sm text-muted">
        {savedFiltersLabels.empty}
      </div>
    )
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {filters.map((filter) => {
        const isActive = isActiveFilter(filter, activeFilter)

        return (
          <div
            key={filter.id}
            className={[
              'rounded-2xl border bg-white p-4 transition duration-150',
              'hover:-translate-y-0.5 hover:border-primary hover:shadow-sm',
              isActive ? 'border-primary bg-primary-soft' : 'border-border-color'
            ].join(' ')}
          >
            <button
              type="button"
              aria-pressed={isActive}
              onClick={() => onApply(filter)}
              className="w-full rounded-xl text-left outline-none transition focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 active:translate-y-px"
            >
              <div className="font-semibold text-text-color">{filter.name}</div>
              <div className="mt-1 text-sm text-muted">
                {filter.customArtistName || filter.selectedArtist || sharedLabels.anyArtist} · {getEventTypeLabel(filter.eventType)}
              </div>
            </button>
            <button
              type="button"
              onClick={() => onRemove(filter.id)}
              className="mt-3 rounded-lg text-sm text-red-600 outline-none transition hover:text-red-700 focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 active:translate-y-px"
            >
              {savedFiltersLabels.remove}
            </button>
          </div>
        )
      })}
    </div>
  )
}

export default SavedFilters
