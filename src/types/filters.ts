import type { EventType } from './events'

export type CurrentFilter = {
  selectedArtist?: string
  customArtistName?: string
  eventType?: EventType | 'all'
}

export type SavedFilter = {
  id: string
  name: string
  selectedArtist?: string
  customArtistName?: string
  eventType?: EventType | 'all'
}

export const eventTypeOptions: { value: EventType | 'all'; label: string }[] = [
  { value: 'all', label: 'Все типы' },
  { value: 'concert', label: 'Концерт' },
  { value: 'comedy', label: 'Комедия' },
  { value: 'lecture', label: 'Лекция' },
  { value: 'theatre', label: 'Театр' },
  { value: 'family', label: 'Для всей семьи' },
  { value: 'other', label: 'Другое' }
]
