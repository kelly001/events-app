import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { Event } from '../src/types/events'
import EventCard from './EventCard'

const event: Event = {
  id: 'event-1',
  title: 'Test concert',
  artist: 'Test artist',
  type: 'concert',
  date: '2026-09-24',
  time: '19:00',
  venue: 'Helsinki Apollo',
  city: 'Helsinki',
  description: 'A test event description',
  price: '49 €',
  url: '#details',
  source: 'tochka'
}

describe('EventCard', () => {
  it('renders event details and its destination link', () => {
    render(<EventCard event={event} />)

    expect(screen.getByRole('heading', { name: 'Test concert' })).toBeInTheDocument()
    expect(screen.getByText('Helsinki Apollo')).toBeInTheDocument()
    expect(screen.getByText('A test event description')).toBeInTheDocument()
    expect(screen.getByText('19:00')).toBeInTheDocument()
    expect(screen.getByText('concert')).toBeInTheDocument()
    expect(screen.getByText('tochka')).toBeInTheDocument()
    expect(screen.getByRole('link')).toHaveAttribute('href', '#details')
  })
})
