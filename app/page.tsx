'use client'

import FilterPanel from '../components/FilterPanel'
import SavedFilters from '../components/SavedFilters'
import EventCard from '../components/EventCard'
import { useEventPage } from '../components/hooks/useEventPage'

export default function Page() {
  const {
    activeFilter,
    setActiveFilter,
    savedFilters,
    isLoading,
    lastUpdated,
    errorMessage,
    filteredEvents,
    applySavedFilter,
    saveCurrentFilter,
    removeSavedFilter,
  } = useEventPage()

  return (
    <main className="container mx-auto p-6">
      <header className="mb-6">
        <h1 className="text-3xl font-semibold">Русскоязычные события в Хельсинки</h1>
        <p className="text-muted mt-2">Концерты, стендапы, лекции и многое другое</p>
      </header>

      <FilterPanel
        initialFilter={activeFilter}
        //onChange={updateFilters}
        onApply={setActiveFilter}
        onSave={saveCurrentFilter}
      />

      <section className="mt-8 space-y-6">
        <div>
          <h2 className="mb-4 text-lg font-semibold text-text-color">Сохраненные фильтры</h2>
          <SavedFilters filters={savedFilters} onApply={applySavedFilter} onRemove={removeSavedFilter} />
        </div>

        <div className="rounded-3xl border border-border-color bg-card-bg p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <p className="text-sm text-text-color">
              Найдено событий: <span className="font-semibold">{isLoading ? '...' : filteredEvents.length}</span>
            </p>
            <div className="text-sm text-muted">
              {lastUpdated ? `Обновлено ${new Date(lastUpdated).toLocaleString('ru-RU')}` : 'Показываются результаты по сохраненным фильтрам'}
            </div>
          </div>
          {errorMessage ? (
            <p className="mt-3 text-sm text-red-600">{errorMessage}</p>
          ) : null}
        </div>

        {isLoading ? (
          <div className="rounded-3xl border border-border-color bg-card-bg p-8 text-center text-sm text-muted">
            Загружаем события...
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="rounded-3xl border border-border-color bg-card-bg p-8 text-center text-sm text-muted">
            По выбранным фильтрам событий не найдено.
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
