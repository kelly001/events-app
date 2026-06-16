import { Event } from '../types/events'
import { CurrentFilter } from '../types/filters'

export const filterEvents = (events: Event[], filter: CurrentFilter) => {
  return events.filter((event) => {
    const artistQuery = filter.customArtistName?.trim() || filter.selectedArtist?.trim() || ''
    const artistMatches = artistQuery
      ? event.artist?.toLowerCase().includes(artistQuery.toLowerCase())
      : true

    const typeMatches = filter.eventType && filter.eventType !== 'all'
      ? event.type === filter.eventType
      : true

    return artistMatches && typeMatches
  })
}
