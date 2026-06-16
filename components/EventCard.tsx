import { Event } from '../src/types/events'

function EventCard({ event }: { event: Event }) {
  return (
    <article className="rounded-3xl border border-border-color bg-card-bg p-5 shadow-sm transition hover:border-primary">
      <div className="flex items-start gap-5">
        <div className="flex h-24 w-20 flex-col items-center justify-center rounded-3xl bg-primary-soft text-text-color">
          <span className="text-3xl font-semibold">{new Date(event.date).getDate().toString().padStart(2, '0')}</span>
          <span className="text-xs uppercase text-muted">{new Date(event.date).toLocaleString('ru-RU', { month: 'short' })}</span>
          {event.time ? <span className="mt-1 text-xs text-muted">{event.time}</span> : null}
        </div>

        <div className="flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-primary-soft px-3 py-1 text-xs uppercase text-primary">{event.type}</span>
            <span className="text-sm text-muted">{event.source}</span>
          </div>
          <h2 className="text-xl font-semibold text-text-color">{event.title}</h2>
          <p className="mt-2 text-sm text-muted">{event.venue}</p>
          <p className="mt-1 text-sm text-muted">{event.description}</p>
        </div>

        <div className="flex h-full items-center">
          <a className="ml-auto rounded-full border border-border-color px-4 py-2 text-sm text-primary transition hover:border-primary-dark hover:bg-primary-soft" href={event.url}>
            →
          </a>
        </div>
      </div>
    </article>
  )
}

export default EventCard
