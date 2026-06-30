'use client'

import { useMemo } from 'react'

import FilterPanel from '../components/FilterPanel'
import SavedFilters from '../components/SavedFilters'
import EventCard from '../components/EventCard'
import { useCurrentFilter } from '../components/hooks/useCurrentFilter'
import { useEvents } from '../components/hooks/useEvents'
import { useSavedFilters } from '../components/hooks/useSavedFilters'
import { filterEvents } from '../src/helpers/filterEvents'

const pageLabels = {
  title: 'Русскоязычные события в Хельсинки',
  subtitle: 'Концерты, стендапы, лекции и многое другое',
  savedFiltersHeading: 'Сохраненные фильтры',
  foundEvents: 'Найдено событий:',
  loadingCount: '...',
  updatedPrefix: 'Обновлено',
  savedFiltersResults: 'Показываются результаты по сохраненным фильтрам',
  loadingEvents: 'Загружаем события...',
  emptyEvents: 'По выбранным фильтрам событий не найдено.'
}

export default function Page() {
  const {
    currentFilter,
    appliedFilter,
    onChange: onFilterChange,
    onApply: applyCurrentFilter,
    applySavedFilter
  } = useCurrentFilter()
  const {
    savedFilters,
    saveFilter,
    removeSavedFilter
  } = useSavedFilters()
  const {
    events,
    isLoading,
    lastUpdated,
    errorMessage
  } = useEvents()

  const filteredEvents = useMemo(
    () => filterEvents(events, appliedFilter),
    [events, appliedFilter]
  )

  const saveCurrentFilter = () => {
    saveFilter(currentFilter)
  }

  return (
    <main className="container mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold">{pageLabels.title}</h1>
        <p className="text-muted mt-2">{pageLabels.subtitle}</p>
      </header>

      <FilterPanel
        filter={currentFilter}
        onChange={onFilterChange}
        onApply={applyCurrentFilter}
        onSave={saveCurrentFilter}
      />

      <section className="mt-8 space-y-6">
        <div>
          <h2 className="mb-4 text-lg font-semibold text-text-color">{pageLabels.savedFiltersHeading}</h2>
          <SavedFilters
            filters={savedFilters}
            activeFilter={appliedFilter}
            onApply={applySavedFilter}
            onRemove={removeSavedFilter}
          />
        </div>

        <div className="rounded-3xl border border-border-color bg-card-bg p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-text-color">
              {pageLabels.foundEvents} <span className="font-semibold">{isLoading ? pageLabels.loadingCount : filteredEvents.length}</span>
            </p>
            <div className="text-sm text-muted">
              {lastUpdated ? `${pageLabels.updatedPrefix} ${new Date(lastUpdated).toLocaleString('ru-RU')}` : pageLabels.savedFiltersResults}
            </div>
          </div>
          {errorMessage ? (
            <p className="mt-3 text-sm text-red-600">{errorMessage}</p>
          ) : null}
        </div>

        {isLoading ? (
          <div className="rounded-3xl border border-border-color bg-card-bg p-8 text-center text-sm text-muted">
            {pageLabels.loadingEvents}
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="rounded-3xl border border-border-color bg-card-bg p-8 text-center text-sm text-muted">
            {pageLabels.emptyEvents}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
