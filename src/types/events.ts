import { z } from 'zod'

export const eventTypeSchema = z.enum([
  'concert',
  'comedy',
  'lecture',
  'theatre',
  'family',
  'other'
])

export const eventSourceSchema = z.enum([
  'tochka',
  'eventcartel',
  'afishamira',
  'songkick-aaniwalli',
  'songkick-apollo'
])

export const eventCitySchema = z.enum([
  'Helsinki',
  'Espoo',
  'Vantaa',
  'Other'
])

export const eventSchema = z.object({
  id: z.string(),
  title: z.string(),
  artist: z.string().optional(),
  type: eventTypeSchema,
  date: z.string(),
  time: z.string().optional(),
  venue: z.string().optional(),
  city: eventCitySchema,
  description: z.string().optional(),
  price: z.string().optional(),
  url: z.string(),
  source: eventSourceSchema
})

export const eventsListResponseSchema = z.object({
  events: z.array(eventSchema),
  updatedAt: z.iso.datetime()
})

export type EventType = z.infer<typeof eventTypeSchema>
export type EventSource = z.infer<typeof eventSourceSchema>
export type Event = z.infer<typeof eventSchema>
export type EventsListResponse = z.infer<typeof eventsListResponseSchema>
export type EventCache = EventsListResponse
