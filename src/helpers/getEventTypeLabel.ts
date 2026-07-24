import { eventTypeOptions } from '../types/filters'
import { sharedLabels } from '../constants/sharedLabels'
import type { EventType } from '../types/events'

export const getEventTypeLabel = (eventType?: EventType | 'all') => (
  eventTypeOptions.find((option) => option.value === eventType)?.label ?? sharedLabels.allEventTypes
)
