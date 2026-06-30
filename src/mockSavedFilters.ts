import { SavedFilter } from './types/filters'

export const savedFilterPresets: SavedFilter[] = [
  {
    id: 'preset-concerts',
    name: 'Все концерты',
    eventType: 'concert'
  },
  {
    id: 'preset-comedy',
    name: 'Стендап вечера',
    eventType: 'comedy'
  },
  {
    id: 'preset-lectures',
    name: 'Лекции',
    eventType: 'lecture'
  }
]
