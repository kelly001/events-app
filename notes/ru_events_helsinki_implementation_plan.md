# RU Events Helsinki — Implementation Plan

## Goal

Build a minimal web service for discovering Russian-speaking events in Helsinki.

The MVP should load events from selected public sources through a Next.js backend, cache fetched events in `localStorage`, allow filtering, and keep the UI very simple.

Design reference: the latest generated minimal green interface, but without a logo.

---

## MVP Scope

### Main features

- Event list for Helsinki-area Russian-speaking events.
- Artist filter:
  - choose artist from predefined list, or
  - enter custom artist name.
- Event type filter:
  - concert
  - comedy
  - lecture
  - theatre
  - family/kids
  - other
- Saved filters:
  - name + event type
  - stored in `localStorage`
- Event cache:
  - fetched events stored in `localStorage`
  - cache shown immediately on page load if fresh
  - background refresh via backend API

### Explicitly out of scope for MVP

- User accounts
- Database
- Saved/favourite events
- Sidebar
- Header image
- Logo
- Date filter
- Complex admin panel

---

## Data Sources

### Primary sources
Using this first two resources - afishamira.com and www.songkick.com, ignoring the source warning about scraping data protests since it's a not commercial project but a personal use.
Caching sources information for 24 hours and run the parser nightly.

1. `https://afishamira.com/city/helsinki/`
2. `https://www.songkick.com/venues/2412619-aaniwalli/calendar`
3. `https://www.songkick.com/venues/773081-apollo-live-club/calendar`

### Outdated music sources
4. `https://tochka.fi/events` - outdated information, so not using this source for now
5. `https://eventcartel.com/events/all-categories/helsinki/all-dates` - also does not have any relevant events for now

Optional later: add artist-name search through Songkick or another Finnish event/afisha source if scraping by venue is not enough.

---

## Recommended Tech Stack

- Next.js App Router
- TypeScript
- tRPC
- Zod
- Tailwind CSS
- localStorage
- Vercel hosting

No database for the first version.

---

## Target User Flow

On page load:

1. Read saved filters from `localStorage`.
2. Read cached events from `localStorage`.
3. If cache is fresh, show cached events immediately.
4. In background, call backend endpoint through tRPC.
5. Replace cached events with fresh results.
6. Render updated event list.

---

## UI Structure

The page should be minimal and utility-focused.

```text
Russian-speaking events in Helsinki
Concerts, comedy, lectures and more

[ Artist dropdown ]  or  [ Custom artist search ]
[ Event type dropdown ]
[ Apply filters ]

Saved filters
[ Noize MC + Concert ] [ Stand-up + Comedy ] [ Lectures ]

Found events: 24

[ date block ] [ type ] Event title
                     Venue
                     Short description
                     Price / Free      >
```

### Visual style

- White background
- Very light green page tint
- Green primary button
- Pale green date blocks
- Rounded cards
- Thin borders
- No heavy shadows
- No logo
- No sidebar
- No image header

### Suggested color palette

```css
--color-primary: #1f8f3a;
--color-primary-dark: #166c2c;
--color-primary-soft: #eaf7ee;
--color-border: #dfe8e2;
--color-page-bg: #f6faf7;
--color-card-bg: #ffffff;
--color-text: #10231a;
--color-muted: #66756d;
```

---

## Event Model

```ts
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
```

---

## localStorage Model

### Event cache

Key:

```ts
'ru-events-helsinki.events-cache'
```

Shape:

```ts
type EventsCache = {
  fetchedAt: string
  events: Event[]
}
```

### Current filters

Key:

```ts
'ru-events-helsinki.current-filters'
```

Shape:

```ts
type CurrentFilters = {
  selectedArtist?: string
  customArtistName?: string
  eventType?: EventType | 'all'
}
```

### Saved filters

Key:

```ts
'ru-events-helsinki.saved-filters'
```

Shape:

```ts
type SavedFilter = {
  id: string
  name: string
  artist?: string
  customArtistName?: string
  eventType?: EventType | 'all'
}
```

---

## Backend API

Use tRPC.

### Router

```ts
export const eventsRouter = router({
  list: publicProcedure.query(async () => {
    return getEvents()
  }),

  searchArtist: publicProcedure
    .input(z.object({ artistName: z.string().min(1) }))
    .query(async ({ input }) => {
      return searchEventsByArtist(input.artistName)
    }),
})
```

For the first MVP, `list` is enough. Add `searchArtist` after the basic flow works.

---

## Backend Event Aggregation

```ts
export async function getEvents(): Promise<Event[]> {
  const results = await Promise.allSettled([
    fetchTochkaEvents(),
    fetchEventCartelEvents(),
    fetchAfishaMiraEvents(),
    fetchSongkickAaniwalliEvents(),
    fetchSongkickApolloEvents(),
  ])

  const events = results
    .filter((result) => result.status === 'fulfilled')
    .flatMap((result) => result.value)

  return deduplicateEvents(events)
}
```

Each source fetcher should return normalized `Event[]`.

---

## Deduplication Strategy

Start simple.

Two events are probably duplicates if they have:

- same or very similar title
- same date
- same venue, if available

Generate stable IDs from:

```ts
title + date + venue + source
```

Later, improve with fuzzy matching.

---

## Implementation Steps

## Phase 1 — Project setup

1. Create Next.js project.
2. Add TypeScript.
3. Add Tailwind CSS.
4. Add tRPC.
5. Add Zod.
6. Create basic app layout.

Result: app runs locally with an empty page.

---

## Phase 2 — Static UI prototype

1. Build page without backend.
2. Use mock event data.
3. Implement minimal layout based on the reference design.
4. Add filter block.
5. Add saved filters block.
6. Add event list.

Result: static UI looks close to final MVP.

---

## Phase 3 — Filtering logic

1. Add predefined artist dropdown.
2. Add custom artist text input.
3. Make artist dropdown and custom input mutually compatible:
   - if custom search is typed, it overrides dropdown
   - if dropdown is selected, custom input can be cleared
4. Add event type dropdown.
5. Add apply and save filter buttons.
6. Filter mock events on the client.

Result: user can filter local mock data.

---

## Phase 4 — localStorage

1. Save current filters to `localStorage`.
2. Restore filters on page reload.
3. Save event cache to `localStorage`.
4. Add cache freshness check.
5. Suggested cache TTL: 6–12 hours.
6. Add saved filter presets.
7. Allow applying a saved filter.
8. Optional: allow deleting a saved filter.

Result: reload keeps filters and cached events.

---

## Phase 5 — tRPC backend with mock data

Status: completed on 2026-07-24. See `notes/2026-07-24_phase-5_trpc_technical_plan.md` and `notes/2026-07-24_progress.md` for the implemented architecture and verification results.

1. Create `eventsRouter`.
2. Add `events.list` procedure.
3. Return mock events from backend.
4. Connect frontend to tRPC.
5. On page load:
   - show cached events if available
   - call backend in background
   - update cache and UI

### Next implementation pass

1. Confirm and install the minimal tRPC client/server packages if missing.
2. Add the server tRPC foundation:
   - `src/server/trpc.ts`
   - `src/server/routers/events.ts`
   - `src/server/routers/root.ts`
3. Implement `events.list` with mock events from `src/mockEvents.ts`.
4. Add the App Router tRPC route handler at `app/api/trpc/[trpc]/route.ts`.
5. Add the frontend tRPC client/provider setup.
6. Replace the current `fetch('/api/events')` flow in `components/hooks/useEvents.ts` with `events.list`.
7. Preserve the current browser cache behavior:
   - show cached events immediately
   - refresh in the background
   - update cache on success
   - keep cached events visible on refresh failure
8. Remove or document the old `app/api/events/route.ts` once tRPC is confirmed.
9. Verify with `npx tsc --noEmit` and manual cache/filter checks.

Result: full frontend/backend flow works without scraping yet.

---

## Phase 6 — Real source fetchers

Add one source at a time.

Suggested order:

1. Tochka.fi
2. EventCartel
3. AfishaMira
4. Songkick Ääniwalli
5. Songkick Apollo Live Club

For each source:

1. Fetch source page on backend.
2. Parse event cards.
3. Map raw data to `Event` model.
4. Add source-specific error handling.
5. Add test fixture if possible.
6. Confirm source failure does not break the whole API.

Result: backend returns real events.

---

## Phase 7 — Artist search

1. Search cached events first.
2. Match both Cyrillic and Latin text.
3. Normalize casing.
4. Trim extra spaces.
5. Later: add transliteration support.
6. Later: add source-specific search if source pages support it.

Result: user can search for any artist name from available fetched data.

---

## Phase 8 — Polish

1. Add loading states.
2. Add “last updated” text.
3. Add empty state.
4. Add source labels.
5. Add error state if backend fetch fails.
6. Add mobile layout.
7. Add basic accessibility:
   - labels
   - keyboard navigation
   - visible focus styles

Result: app feels usable, not just technical.

---

## Phase 9 — Deployment

1. Deploy to Vercel.
2. Set environment variables if needed.
3. Test production build.
4. Check serverless function timeout.
5. Check source fetching from deployed environment.
6. Add basic logging.

Result: public MVP is online.

---

## Testing Checklist

### UI

- Page works on desktop.
- Page works on mobile.
- Filters are readable and not cramped.
- Event cards are scannable.
- No unnecessary UI elements remain.

### Filtering

- Artist dropdown works.
- Custom artist search works.
- Custom search overrides artist dropdown when filled.
- Event type filter works.
- Saved filters apply correctly.
- Saved filters persist after reload.

### Cache

- Cached events show immediately.
- Stale cache triggers background refresh.
- Fresh backend response replaces cache.
- Broken backend does not erase existing cache.

### Backend

- One failed source does not break all events.
- Events are normalized to the same model.
- Duplicates are reduced.
- External links open correctly.

---

## Suggested First Commit Plan

1. `init-next-app`
2. `add-tailwind-and-base-layout`
3. `add-event-types-and-mock-data`
4. `build-minimal-events-page`
5. `add-client-filters`
6. `add-local-storage-cache`
7. `add-trpc-events-router`
8. `connect-ui-to-backend-mock-events`
9. `add-first-real-source-fetcher`
10. `deploy-to-vercel`

---

## Main Risk

The main technical risk is not the UI or tRPC. It is reliable extraction of event data from external websites.

Mitigation:

- Start with mock data.
- Add sources one by one.
- Keep source fetchers isolated.
- Never let one broken source break the whole app.
- Keep cached events in the browser so the page remains useful even when fetching fails.
