export type EventType =
  | 'concert'
  | 'comedy'
  | 'lecture'
  | 'theatre'
  | 'family'
  | 'other'

export type EventSource =
  | 'tochka'
  | 'eventcartel'
  | 'afishamira'
  | 'songkick-aaniwalli'
  | 'songkick-apollo'

export type Event = {
  id: string
  title: string
  artist?: string
  type: EventType
  date: string
  time?: string
  venue?: string
  city: 'Helsinki' | 'Espoo' | 'Vantaa' | 'Other'
  description?: string
  price?: string
  url: string
  source: EventSource
}

export type EventCache = {
  events: Event[]
  updatedAt: string
}
