import { mockEvents } from '../../mockEvents'
import { eventsListResponseSchema } from '../../types/events'
import { publicProcedure, router } from '../trpc'

export const eventsRouter = router({
  list: publicProcedure
    .output(eventsListResponseSchema)
    .query(() => ({
      events: mockEvents,
      updatedAt: new Date().toISOString()
    }))
})
