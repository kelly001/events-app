# Phase 6 Technical Plan — Real Source Fetchers

Date: 2026-07-30  
Project: RU Events Helsinki  
Phase status: planned

## 1. Objective

Replace the Phase 5 mock-event backend with three real HTML fetchers:

1. AfishaMira Helsinki.
2. Songkick Ääniwalli.
3. Songkick Apollo Live Club.

The two Songkick venues are separate logical sources with separate cache snapshots and failure states, but they share one parser implementation configured for a venue.

Each source is refreshed independently by a nightly scheduled job. A successful refresh atomically replaces only that source's backend JSON snapshot. A failed refresh records the failure but preserves the source's last successful event snapshot. The public `events.list` query reads the backend snapshots, combines and deduplicates their events, and never waits for or invokes an upstream scraper.

This design keeps page requests fast, avoids repeatedly hitting source sites, and ensures a failure in one nightly parser run cannot erase data from another source.

## 2. Product decisions supplied for this revision

The following are inputs to this plan:

- The project is personal and non-commercial.
- The implementation will use HTML parsing for AfishaMira and the two public Songkick venue pages.
- Source information is refreshed on a 24-hour/nightly cadence.
- The product owner has accepted the source-use warnings for this personal project; Phase 6 does not add a separate permission gate.
- Tochka.fi is excluded because its event information is currently outdated.
- EventCartel is excluded because it currently has no relevant Helsinki events.
- Backend source snapshots may initially be serialized as JSON files.
- The last successful JSON snapshot for a source must survive a later refresh failure.
- The backend implementation must still be structured so it can move to cloud hosting without coupling parser or aggregation logic to a particular machine.

The product owner should re-evaluate source terms and usage if the project later becomes public, commercial, or materially higher traffic.

## 3. Definition of success

Phase 6 is complete when:

- Three independently runnable fetchers produce normalized `Event[]` values:
  - `afishamira`
  - `songkick-aaniwalli`
  - `songkick-apollo`
- Each source has its own versioned serialized backend snapshot.
- Each refresh runs at most once per nightly schedule unless manually triggered.
- A successful empty parse replaces that source's old events with an empty list.
- A technical fetch/parse/validation failure keeps that source's last successful events.
- Refreshing one source never rewrites another source's snapshot.
- `events.list` reads snapshots only; it performs no live external HTTP requests.
- `events.list` keeps the Phase 5 `{ events, updatedAt }` response contract.
- Browser `localStorage` remains an aggregate response fallback and does not need per-source merge logic.
- Returned events are validated, upcoming, deterministically sorted, and conservatively deduplicated.
- Parser tests use committed minimal HTML fixtures and no normal test depends on live websites.
- JSON file persistence is behind a storage interface so cloud object storage can replace it without changing fetchers, parsers, aggregation, tRPC, or the UI.

## 4. Inputs and current baseline

This plan is based on:

- `notes/ru_events_helsinki_implementation_plan.md`, including its updated source description.
- `notes/2026-07-24_phase-5_trpc_technical_plan.md`.
- `notes/2026-07-24_progress.md`.
- The current Phase 5 implementation.

Current relevant contracts:

| Area | Current implementation | Phase 6 treatment |
| --- | --- | --- |
| Public API | `events.list` returns `{ events, updatedAt }` | Preserve this shape. Read backend snapshots instead of `mockEvents`. |
| Runtime schema | `eventsListResponseSchema` validates events and ISO timestamp | Reuse it for the public response; add separate schemas for source snapshots and refresh outcomes. |
| Sources | Five literals exist in `eventSourceSchema` | Keep all literals for compatibility, but only register the three active sources. |
| Browser cache | Aggregate tRPC response is stored in `localStorage` | Keep it as UI/offline fallback. It is not the source-of-truth ingestion cache. |
| Browser refresh | Each page mount calls `events.list` | Keep this; the call now reads local/backend snapshots and does not scrape. |
| Backend cache | None | Add one independent last-known-good JSON snapshot per source. |
| Scheduling | None | Add source-targeted refresh functions plus scheduler-safe HTTP/CLI entry points. |
| Database | None | No database is needed in this phase. |
| Tests | Vitest, TypeScript, lint, Next build | Add Node parser/store/job tests while preserving existing UI tests. |

## 5. Active and inactive sources

### 5.1 Active source registry

| Source ID | URL | Parser implementation | Cache key/file |
| --- | --- | --- | --- |
| `afishamira` | `https://afishamira.com/city/helsinki/` | `parseAfishaMiraEvents` | `afishamira.json` |
| `songkick-aaniwalli` | `https://www.songkick.com/venues/2412619-aaniwalli/calendar` | shared `parseSongkickVenueEvents` with Ääniwalli config | `songkick-aaniwalli.json` |
| `songkick-apollo` | `https://www.songkick.com/venues/773081-apollo-live-club/calendar` | shared `parseSongkickVenueEvents` with Apollo config | `songkick-apollo.json` |

The registry is the only list used by the scheduler and aggregator. A source enum member that is not in this registry is inactive.

### 5.2 Inactive sources

- `tochka`: keep the type literal but do not fetch, schedule, or create a cache file.
- `eventcartel`: keep the type literal but do not fetch, schedule, or create a cache file.

Do not create disabled placeholder outcomes for these sources in the public API. They can be reconsidered later by adding a new adapter and registry entry.

## 6. Target architecture

```text
External nightly scheduler
  -> POST /api/internal/events/refresh/afishamira
       -> fetch AfishaMira HTML
       -> parse + normalize + validate
       -> atomically write afishamira.json

  -> POST /api/internal/events/refresh/songkick-aaniwalli
       -> fetch Songkick Ääniwalli HTML
       -> shared Songkick parser + venue config
       -> atomically write songkick-aaniwalli.json

  -> POST /api/internal/events/refresh/songkick-apollo
       -> fetch Songkick Apollo HTML
       -> shared Songkick parser + venue config
       -> atomically write songkick-apollo.json

Page load
  -> tRPC events.list
       -> read the three independent backend snapshots
       -> keep valid upcoming events
       -> deduplicate + sort
       -> return existing { events, updatedAt }
  -> useEvents
       -> preserve existing aggregate localStorage fallback
```

The scheduled refresh path and read path are deliberately separate:

- Refresh path may access the internet and write one source snapshot.
- Read path accesses no upstream site and normally performs only three small cache reads.
- A source failure affects its refresh record, not the availability of other snapshots.

## 7. Core architecture decisions

### 7.1 Keep the public API contract unchanged

Do not add `isPartial`, per-source status, or per-source browser snapshots to `eventsListResponseSchema` in Phase 6.

The backend source cache already solves partial failures:

- Every source has its own last-known-good snapshot.
- A failed refresh does not replace that snapshot.
- `events.list` aggregates the most recent successful snapshot available for each source.
- The browser receives one complete best-known aggregate.

The response remains:

```ts
type EventsListResponse = {
  events: Event[]
  updatedAt: string
}
```

`updatedAt` should be the oldest `lastSuccessAt` among the configured source snapshots included in the aggregate. This is conservative: the displayed timestamp describes how old the least recently refreshed component of the returned dataset is. If only one snapshot is available, use its `lastSuccessAt`.

Do not use API assembly time as `updatedAt`, because reading an old snapshot does not make its event data fresh.

### 7.2 Distinguish refresh cadence from retention

“24-hour cache” means each source is scheduled for refresh once per day and becomes operationally stale after 24 hours. It does not mean deleting the last-known-good snapshot after 24 hours.

Rules:

- Successful refresh: replace events and set a new `lastSuccessAt`.
- Successful empty refresh: replace events with `[]` and set a new `lastSuccessAt`.
- Failed refresh: retain events and `lastSuccessAt`; update only attempt/error metadata.
- Old events whose dates are already past are filtered out when reading the snapshot.
- A stale snapshot remains usable until a later successful refresh replaces it.

This fulfills the requirement to keep old source data after a request failure without falsely renewing it.

### 7.3 Treat Songkick venues as two source instances

Use a source factory rather than duplicated code:

```ts
type SongkickVenueConfig = {
  source: 'songkick-aaniwalli' | 'songkick-apollo'
  url: string
  venueName: string
  expectedVenueId: string
}

const songkickAaniwalliFetcher = createSongkickVenueFetcher({ ... })
const songkickApolloFetcher = createSongkickVenueFetcher({ ... })
```

Each instance has:

- its own source ID;
- its own fixed URL;
- its own fetch result;
- its own JSON snapshot;
- its own nightly job and failure history.

Both instances share:

- HTTP safeguards;
- HTML parser implementation;
- date/title/artist extraction;
- normalization and validation rules;
- fixtures where the structure is common.

### 7.4 Separate retrieval from parsing

Each adapter has two primary functions:

```ts
fetchAfishaMiraEvents(context): Promise<Event[]>
parseAfishaMiraEvents(html, context): Event[]

fetchSongkickVenueEvents(config, context): Promise<Event[]>
parseSongkickVenueEvents(html, config, context): Event[]
```

Fetcher responsibilities:

- make one bounded HTTP request;
- validate HTTP status, content type, and body size;
- pass HTML to a pure parser;
- add source context;
- surface normalized error codes.

Parser responsibilities:

- locate the upcoming-event region;
- extract raw fields;
- normalize values;
- construct stable IDs;
- validate each event;
- distinguish genuine empty results from structural parser drift.

Parsers must not read environment variables, files, the network, browser globals, or current system time directly. Pass a fixed `now` value in their context.

### 7.5 Keep the tRPC router thin

`src/server/routers/events.ts` should call an aggregation/read service only:

```ts
list: publicProcedure
  .output(eventsListResponseSchema)
  .query(() => readAggregatedEvents())
```

It must not contain:

- source URLs;
- HTML selectors;
- live `fetch` calls;
- cache-file paths;
- retry logic;
- scheduling logic.

### 7.6 Make persistence replaceable

Define a storage contract used by refresh jobs and the aggregate reader:

```ts
type SourceSnapshotStore = {
  read(source: ActiveEventSource): Promise<SourceSnapshot | null>
  write(source: ActiveEventSource, snapshot: SourceSnapshot): Promise<void>
}
```

Initial implementation:

- `JsonFileSourceSnapshotStore`
- one JSON file per source;
- configurable cache directory;
- atomic temp-file write plus rename;
- no files under `public/`;
- no source path derived from untrusted client input.

Cloud implementation seam:

- `ObjectStorageSourceSnapshotStore`
- same serialized JSON schema and logical keys;
- backed by S3-compatible/object/blob storage;
- conditional writes/ETags where available;
- no parser or router changes.

The filesystem implementation is suitable for local development, a traditional server, or a container with a mounted persistent volume. An ephemeral serverless filesystem is not durable across invocations, so cloud serverless deployment must select an object-storage implementation through configuration. This is why storage is injected rather than imported directly by parsers or the tRPC router.

### 7.7 Use an external scheduler entry point

Do not run `node-cron`, `setInterval`, or a resident background loop inside Next.js. Those mechanisms are unreliable when cloud instances sleep, restart, or scale horizontally.

Provide two thin ways to call the same refresh service:

1. Authenticated HTTP route for a cloud scheduler:

   ```text
   POST /api/internal/events/refresh/{source}
   Authorization: Bearer <EVENT_REFRESH_SECRET>
   ```

2. CLI wrapper for development, a VM, or container cron:

   ```text
   npm run events:refresh -- --source=afishamira
   ```

The three schedules should be separate and may be staggered, for example:

```text
02:05 Europe/Helsinki  afishamira
02:15 Europe/Helsinki  songkick-aaniwalli
02:25 Europe/Helsinki  songkick-apollo
```

Store scheduler times in UTC where required by the hosting provider, accounting for Finland daylight-saving changes. Alternatively schedule a fixed UTC nightly window because exact local clock time is not a product requirement.

### 7.8 Make refresh idempotent and overlap-safe

The scheduler may retry or accidentally overlap jobs. Use a `runId` and `startedAt` for every refresh.

Minimum rules:

- Refreshing the same source with the same page produces the same event IDs/content.
- A job writes only its source key.
- A filesystem write uses a unique temp file in the same directory and atomic rename.
- A newer completed snapshot must not be overwritten by an older delayed job.
- The HTTP route returns success only after the snapshot/update metadata is durable.

For the JSON file store, serialize same-source jobs in-process and configure the external scheduler not to overlap. For multi-instance cloud hosting, use object-store conditional writes or a distributed lease if overlap becomes possible. Do not claim a module-level lock is globally reliable.

### 7.9 Use Node/Web APIs and pure JavaScript packages

Use:

- Node.js built-in `fetch`/`AbortController`;
- `URL`, `TextDecoder`, and `Intl`;
- `node:crypto` for stable hashes;
- `node:fs/promises` only inside `JsonFileSourceSnapshotStore`;
- a lightweight pure-JavaScript HTML parser such as `cheerio`.

Avoid:

- Playwright/Puppeteer or a browser executable;
- native scraping binaries;
- shelling out from backend code;
- OS locale/timezone assumptions;
- machine-specific absolute paths;
- client-supplied fetch URLs;
- provider SDK imports in parser/aggregation modules.

Declare Node runtime on the refresh and tRPC route handlers if required:

```ts
export const runtime = 'nodejs'
```

## 8. Backend source snapshot model

### 8.1 Snapshot schema

Add a separate Zod schema; do not alias it to the public API or browser cache.

```ts
const activeEventSourceSchema = z.enum([
  'afishamira',
  'songkick-aaniwalli',
  'songkick-apollo'
])

const sourceSnapshotSchema = z.object({
  version: z.literal(1),
  source: activeEventSourceSchema,
  sourceUrl: z.url(),
  parserVersion: z.string().min(1),
  lastAttemptAt: z.iso.datetime(),
  lastSuccessAt: z.iso.datetime(),
  lastRunId: z.string().min(1),
  status: z.enum(['fresh', 'stale-after-error']),
  events: z.array(eventSchema),
  lastError: z.object({
    at: z.iso.datetime(),
    code: sourceRefreshErrorCodeSchema,
    message: z.string().max(300)
  }).optional()
})
```

`sourceUrl` is stored for audit/debugging but validated against the registry during reads. `parserVersion` is a manually incremented parser/fixture version such as `afishamira-v1` or `songkick-venue-v1`.

### 8.2 File layout

Suggested development/container layout:

```text
data/
  event-source-cache/
    afishamira.json
    songkick-aaniwalli.json
    songkick-apollo.json
```

Rules:

- Add generated snapshot files to `.gitignore`.
- Optionally commit only `.gitkeep` and a README describing the format.
- Configure the root with `EVENT_SOURCE_CACHE_DIR`.
- Resolve and validate the configured absolute path during server initialization.
- Map source IDs to hard-coded filenames; never accept `../` or an arbitrary file name.
- Restrict file content to normalized event data and operational metadata.
- Do not store raw source HTML in production cache files.

### 8.3 Successful refresh transaction

For source `S`:

1. Read the existing snapshot for context only; failure to find one is allowed.
2. Fetch the fixed source URL with a bounded timeout.
3. Parse and normalize all candidate upcoming events.
4. Validate the complete `Event[]`.
5. Deduplicate within the source and sort deterministically.
6. Construct a complete new `SourceSnapshot` with:
   - `lastAttemptAt = now`
   - `lastSuccessAt = now`
   - `status = fresh`
   - no `lastError`
7. Serialize to JSON with a trailing newline.
8. Write a uniquely named temp file in the destination directory.
9. Flush/close it, then rename it over only `S`'s target file.
10. Emit a success summary.

A successfully parsed zero-event upcoming section is a valid transaction and writes `events: []`.

### 8.4 Failed refresh transaction

If fetch, HTTP validation, parsing, drift detection, or final validation fails:

1. Do not replace the existing `events` or `lastSuccessAt`.
2. If a prior snapshot exists, write an updated snapshot containing:
   - preserved events;
   - preserved `lastSuccessAt`;
   - new `lastAttemptAt`;
   - new `lastRunId`;
   - `status = stale-after-error`;
   - sanitized `lastError`.
3. If no prior successful snapshot exists, write a separate operational failure record or log the failure; do not invent an empty successful snapshot.
4. Return a failed job result/non-2xx scheduler response so monitoring can detect it.
5. Do not touch the other two source files.

Updating error metadata must also use atomic write/rename. If that metadata write fails, preserve the old file and report both errors.

### 8.5 Corrupt snapshot behavior

On read:

- parse JSON;
- validate with `sourceSnapshotSchema`;
- confirm the embedded `source` and `sourceUrl` match the registry key;
- reject the snapshot if validation fails;
- log `snapshot_corrupt` without logging the whole file;
- continue reading other sources.

Do not automatically overwrite a corrupt file with an empty snapshot from the public request path. The next successful scheduled refresh repairs it.

## 9. HTTP fetching safeguards

Create a shared `SourceHttpClient` with:

- fixed HTTPS URLs from the source registry;
- hostname allowlist for `afishamira.com` and `www.songkick.com`;
- manual redirect handling and hostname revalidation;
- maximum 3 redirects;
- per-request timeout, initially 10 seconds;
- maximum HTML response size, initially 2 MB;
- status validation;
- expected HTML content type with a cautious fallback for misconfigured `text/plain` only if fixture/live checks justify it;
- a stable identifying user agent;
- `Accept: text/html`;
- appropriate `Accept-Language`;
- no cookies, authentication forwarding, or browser-session state;
- response decoding based on declared charset with UTF-8 default;
- sanitized errors.

Recommended first-pass retry policy:

- no retry for 4xx, 429, content-type, parser, or validation errors;
- at most one retry for transient network failure or 5xx;
- retry must remain inside the job's total deadline;
- no long sleep inside a cloud function;
- scheduler-level retry is preferred because it is observable.

Never accept a source URL, redirect override, or filename from public tRPC input.

## 10. Shared normalization rules

### 10.1 Text

- Decode entities through the HTML parser.
- Normalize Unicode to NFKC.
- Replace non-breaking spaces with ordinary spaces.
- Collapse repeated whitespace.
- Trim fields.
- Convert blank optional fields to `undefined`.
- Enforce maximum lengths:
  - title: 300
  - artist: 200
  - venue: 200
  - description: 1,000
  - price: 100
- Extract plain text only; never preserve or render source HTML.

### 10.2 Dates and times

Normalize:

- `date` to `YYYY-MM-DD`.
- `time` to `HH:mm` when present.

Use `Europe/Helsinki` explicitly for “today” and past-event removal. Do not rely on the host machine's timezone.

Rules:

- Reject impossible dates/times.
- Preserve a date-only event when time is unknown.
- Do not append `Z` to Helsinki wall-clock time.
- Use structured `datetime`/`content` attributes before visible text when the value is clearly associated with the event.
- Cover daylight-saving boundaries in tests even though the public model stores date/time separately.

### 10.3 City and venue

- AfishaMira city page must still be validated as Helsinki, not assumed blindly.
- Songkick venue/city must match the configured venue identity and Helsinki page metadata.
- Map Helsinki/Хельсинки to `Helsinki`.
- Reject or map an unexpected city to `Other` according to a documented source rule; active venue fetchers should normally reject a venue identity mismatch as parser drift.

### 10.4 Event type

- Songkick venue events are always `concert`.
- AfishaMira uses explicit categories first:

| AfishaMira category | `EventType` |
| --- | --- |
| Музыка | `concert` |
| Юмор | `comedy` |
| Беседа / Лекция | `lecture` |
| Театр | `theatre` |
| Детям | `family` |
| Unknown/other | `other` |

For multiple categories, use deterministic precedence:

```text
family -> theatre -> comedy -> lecture -> concert -> other
```

This makes `Детям + Беседа / Лекция` a `family` event.

### 10.5 Artist

`artist` is optional and must not be invented.

- Songkick: prefer the explicitly identified headline performance. If markup only exposes a combined billing title, use that normalized display text consistently and cover it with fixtures.
- AfishaMira: use an explicit structured performer field if present. Otherwise use a conservative title rule only for clearly recognized patterns; leave `artist` undefined when uncertain.

Phase 7 should update custom artist search to match both `event.artist` and `event.title`, which is more reliable than aggressively guessing artist names in Phase 6.

### 10.6 URLs

- Resolve relative event paths against the fixed source origin.
- Allow only `https:` and, only if the source actually emits it, normalize safe `http:` canonical links to their tested HTTPS form.
- Strip fragments and known non-essential tracking parameters when safe.
- Prefer the source event-detail URL over a generic venue URL.
- Do not use a generic “buy tickets” URL if the event-detail URL is available.

### 10.7 Stable IDs

Within each source, choose a stable key in this order:

1. Source event ID from the event URL or structured markup.
2. Canonical event-detail URL.
3. Normalized `title + date + time + venue` fallback.

Hash `source + ':' + stableKey` with SHA-256 and use a sufficiently long base64url/hex prefix. Do not use card index, scrape time, or mutable description text.

## 11. Parser plan — AfishaMira

Source:

```text
https://afishamira.com/city/helsinki/
```

### 11.1 Section discovery

Parse the upcoming list only:

1. Locate the Helsinki page heading and year context.
2. Identify event-card/listing candidates before the “Прошедшие события” heading.
3. Stop parsing when the past section begins.
4. Exclude excursions/promotional blocks and navigation/category links that are not event cards.

Do not make exact CSS selectors part of this plan before capturing the backend-delivered HTML fixture. During implementation, prefer stable semantic attributes, element relationships, and event-detail URL patterns over generated class hashes.

### 11.2 Field mapping

| `Event` field | AfishaMira extraction |
| --- | --- |
| `title` | Event detail-link text |
| `artist` | Explicit performer metadata or conservative title extraction; otherwise absent |
| `type` | Explicit event category mapping |
| `date` | Full visible/structured `DD.MM.YYYY` date |
| `time` | Visible/structured event time |
| `venue` | Listing venue if present; otherwise absent |
| `city` | Validated Helsinki listing location |
| `description` | Listing excerpt if clearly tied to the event and short; otherwise absent |
| `price` | Explicit listing price only; otherwise absent |
| `url` | Canonical AfishaMira event-detail URL |
| `source` | `afishamira` |

The first implementation should be listing-only. Do not fetch each event detail page; optional fields are preferable to an N+1 request pattern.

### 11.3 Parser-drift detection

Treat as a parser failure, not an empty success, when:

- the page identifies itself as the Helsinki events page;
- event-detail links or event-like candidates are present;
- but zero candidates can be normalized;
- or the past/upcoming boundary cannot be determined safely.

Treat as a valid empty success only when the upcoming section is positively identified and contains no event candidates.

### 11.4 Fixture cases

- multiple future events;
- full date and time;
- multiple categories;
- no venue/price/description;
- promotional block among events;
- past section boundary;
- malformed one-of-many card;
- true empty upcoming section;
- changed/missing structural sentinel;
- Cyrillic and mixed Latin/Cyrillic text.

## 12. Parser plan — Songkick venue pages

Sources:

```text
https://www.songkick.com/venues/2412619-aaniwalli/calendar
https://www.songkick.com/venues/773081-apollo-live-club/calendar
```

### 12.1 Shared venue configuration

```ts
const songkickVenueConfigs = {
  'songkick-aaniwalli': {
    venueId: '2412619',
    venueName: 'Ääniwalli',
    city: 'Helsinki',
    url: 'https://www.songkick.com/venues/2412619-aaniwalli/calendar'
  },
  'songkick-apollo': {
    venueId: '773081',
    venueName: 'Apollo Live Club',
    city: 'Helsinki',
    url: 'https://www.songkick.com/venues/773081-apollo-live-club/calendar'
  }
}
```

Use this configuration to verify the fetched page belongs to the expected venue. Do not accept a venue ID from a public request.

### 12.2 Section and card discovery

1. Verify the page venue heading or canonical metadata matches the configured venue ID/name.
2. Locate “Upcoming concerts” or the equivalent upcoming calendar region.
3. Parse event rows/list items only inside that region.
4. Stop before “Past concerts.”
5. Prefer structured `<time datetime>`, JSON-LD, or explicit data attributes when present and directly associated with an event.
6. Use visible date-heading text as a tested fallback.
7. Identify event/detail anchors by stable Songkick event/concert URL shape.

The parser must work on the HTML returned to backend `fetch`; it must not depend on client-side JavaScript execution or the post-hydration browser DOM.

### 12.3 Field mapping

| `Event` field | Songkick extraction |
| --- | --- |
| `title` | Full event billing/display name associated with the event link |
| `artist` | Headline performance when explicitly marked; otherwise normalized billing text or absent |
| `type` | Always `concert` |
| `date` | Structured or visible upcoming-event date |
| `time` | Structured event time when present; otherwise absent |
| `venue` | Configured canonical venue name after page identity validation |
| `city` | `Helsinki` after page identity validation |
| `description` | Usually absent; do not copy generic Songkick prose |
| `price` | Explicit event price only; normally absent |
| `url` | Canonical Songkick event/concert URL |
| `source` | Configured logical source ID |

Multi-artist events should preserve the full billing in `title`. `artist` should use the explicitly identified headliner if available. Do not generate multiple event cards for supporting artists.

### 12.4 Two-source isolation

Required tests must prove:

- the same HTML parser maps Ääniwalli events to `songkick-aaniwalli`;
- Apollo events map to `songkick-apollo`;
- an Apollo page passed to the Ääniwalli configuration fails venue identity validation;
- the two fetchers write different snapshot keys;
- a failed Apollo refresh leaves Ääniwalli untouched and vice versa.

### 12.5 Fixture cases

- one and multiple upcoming concerts;
- date with no time;
- explicit time;
- multiple artists/support acts;
- event URL plus separate ticket URL;
- zero upcoming concerts;
- past-concert boundary;
- venue mismatch;
- JavaScript warning text coexisting with server-rendered listings;
- malformed event row among valid rows;
- structural markup drift.

## 13. Aggregation and deduplication

### 13.1 Snapshot read behavior

`readAggregatedEvents()` should:

1. Read all three configured snapshots concurrently through `SourceSnapshotStore`.
2. Validate each snapshot independently.
3. Log and skip a missing/corrupt snapshot while retaining valid snapshots.
4. Take each valid snapshot's events, including a valid empty list.
5. Remove events before the current Helsinki calendar date.
6. Deduplicate within and across sources.
7. Sort deterministically.
8. Return `{ events, updatedAt }`.

If no valid source snapshot exists, throw `TRPCError` with `SERVICE_UNAVAILABLE`/an appropriate mapped code so `useEvents` keeps its browser cache and displays the existing refresh warning.

A missing one-of-three snapshot does not make the public request fail when other valid snapshots exist.

### 13.2 Deduplication

Run two stages:

1. Exact within-source dedupe by stable event ID/canonical URL.
2. Conservative cross-source dedupe by normalized title + date, with compatible time and venue when present.

Normalize fingerprints with:

- Unicode NFKC;
- lowercase;
- punctuation removal;
- collapsed whitespace;
- common venue aliases (`apollo`, `apollo live club`, etc.);
- removal of generic city suffixes such as “in Helsinki”/“в Хельсинки” only where tested.

Do not use fuzzy edit-distance matching in Phase 6.

When merging AfishaMira and Songkick records for the same event:

- generate a canonical cross-source ID from normalized title/date/venue;
- prefer an explicit Songkick headliner for `artist`;
- prefer a known time over missing time;
- prefer a non-empty venue;
- prefer a concise non-empty description;
- choose the outbound URL using a documented stable source priority;
- keep `source` as the selected canonical record's source because the current public model supports only one source.

Recommended URL/source priority for duplicate concerts:

```text
afishamira -> songkick venue
```

This prioritizes the Russian-language discovery page while retaining Songkick-only venue listings.

### 13.3 Sorting

Sort by:

1. date ascending;
2. known time ascending, with unknown time after known times on the same date;
3. normalized title;
4. stable ID.

## 14. Scheduling and refresh API

### 14.1 Refresh service

```ts
type RefreshSourceResult = {
  runId: string
  source: ActiveEventSource
  status: 'updated' | 'failed-preserved' | 'failed-no-snapshot'
  attemptedAt: string
  previousSuccessAt?: string
  successAt?: string
  eventCount?: number
  errorCode?: SourceRefreshErrorCode
}

refreshSource(source, dependencies): Promise<RefreshSourceResult>
```

The service selects the fetcher and cache key from the internal registry. There is no generic `refreshUrl(url)` function.

### 14.2 Internal HTTP route

Suggested path:

```text
app/api/internal/events/refresh/[source]/route.ts
```

Requirements:

- `POST` only.
- Exact source allowlist.
- Constant-time comparison of bearer token where practical.
- Secret from server-only `EVENT_REFRESH_SECRET`.
- No response containing raw HTML or stack traces.
- `200` for `updated`.
- Non-2xx for refresh failure, even when an old snapshot was preserved, so the scheduler can alert/retry.
- Development-only detailed logging.
- Optional deployment-specific protection may be added outside the core route.

### 14.3 CLI wrapper

Suggested script:

```text
scripts/refresh-event-source.ts
```

It should parse a source name, construct the same dependencies as the route, call `refreshSource`, print one sanitized summary, and use a non-zero exit code on failure. It must not duplicate fetch or persistence logic.

### 14.4 Schedule configuration

Configure three nightly invocations, not one monolithic all-source transaction. This provides independent retries and monitoring.

The exact scheduler is deployment configuration:

- local/manual development: CLI invocation;
- VM/container: host cron or scheduler invokes CLI/HTTP route;
- serverless cloud: managed scheduler invokes authenticated HTTP route;
- CI/manual recovery: protected workflow may invoke the same route.

Do not encode provider-specific cron syntax in core TypeScript.

## 15. Proposed file layout

```text
src/
  types/
    events.ts
  server/
    events/
      contracts.ts
      config.ts
      activeSources.ts
      normalizeEvent.ts
      parseLocalDateTime.ts
      classifyEvent.ts
      stableEventId.ts
      deduplicateEvents.ts
      readAggregatedEvents.ts
      refreshSource.ts
      errors.ts
      logging.ts
      http/
        sourceHttpClient.ts
      store/
        sourceSnapshotSchema.ts
        sourceSnapshotStore.ts
        jsonFileSourceSnapshotStore.ts
        objectStorageSourceSnapshotStore.ts  # interface/placeholder until cloud deployment
      sources/
        afishaMira/
          fetchAfishaMiraEvents.ts
          parseAfishaMiraEvents.ts
          parseAfishaMiraEvents.test.ts
        songkick/
          songkickVenueConfig.ts
          createSongkickVenueFetcher.ts
          parseSongkickVenueEvents.ts
          parseSongkickVenueEvents.test.ts
  server/routers/
    events.ts
app/
  api/internal/events/refresh/[source]/route.ts
scripts/
  refresh-event-source.ts
test/
  fixtures/sources/
    afisha-mira/
      upcoming.html
      empty.html
      drifted.html
    songkick/
      aaniwalli-upcoming.html
      apollo-upcoming.html
      empty.html
      drifted.html
data/
  event-source-cache/                 # ignored generated files
```

The object-storage implementation does not need to be completed for a local-only Phase 6 release, but the interface and dependency wiring must make it possible without refactoring core logic.

## 16. Configuration

Suggested server-only configuration:

```text
EVENT_SOURCE_CACHE_DRIVER=json-file
EVENT_SOURCE_CACHE_DIR=<absolute writable persistent directory>
EVENT_REFRESH_SECRET=<random secret>
SOURCE_FETCH_TIMEOUT_MS=10000
SOURCE_FETCH_MAX_BYTES=2097152
SOURCE_FETCH_USER_AGENT=ru-events-helsinki/0.1 (+contact)
```

Future cloud object storage:

```text
EVENT_SOURCE_CACHE_DRIVER=object-storage
EVENT_SOURCE_CACHE_BUCKET=<bucket/container>
EVENT_SOURCE_CACHE_PREFIX=event-source-cache/
```

Rules:

- Validate configuration once with Zod.
- Never expose secrets through `NEXT_PUBLIC_*`.
- Fail clearly if `json-file` is selected without a writable persistent directory.
- Do not default production serverless deployments to an ephemeral temp directory.
- Do not allow environment variables to redefine source origins.
- Bound timeout/body values to safe ranges.
- Keep credentials/provider details inside the selected store implementation.

## 17. Observability

Emit structured JSON-compatible logs.

Refresh summary:

```text
event=event_source_refresh
runId=<opaque id>
source=<source id>
status=updated|failed-preserved|failed-no-snapshot
durationMs=<number>
httpStatus=<number when available>
candidateCount=<number>
acceptedCount=<number>
droppedCount=<number>
previousSuccessAt=<ISO when available>
successAt=<ISO when successful>
errorCode=<stable code when failed>
```

Read summary:

```text
event=events_snapshot_read
validSnapshotCount=<number>
missingSnapshotCount=<number>
corruptSnapshotCount=<number>
beforeDedupCount=<number>
afterDedupCount=<number>
oldestSuccessAt=<ISO>
```

Stable error codes:

- `timeout`
- `network`
- `http_4xx`
- `http_429`
- `http_5xx`
- `redirect`
- `content_type`
- `body_too_large`
- `parse`
- `parser_drift`
- `contract`
- `snapshot_read`
- `snapshot_write`
- `configuration`

Never log raw HTML, full descriptions, refresh secrets, response cookies, or complete stack traces in production summaries.

## 18. Detailed implementation sequence

### Work package 1 — Baseline and fixtures

1. Run `npm test`, `npx tsc --noEmit`, `npm run lint`, and `npm run build`.
2. Record current `events.list` and browser-cache behavior.
3. Fetch each source using the same backend HTTP headers/runtime planned for production.
4. Save minimal sanitized fixture fragments containing the structural cases required by the parser.
5. Record capture date, source URL, and page identity in fixture comments/readmes.
6. Confirm all three pages expose usable upcoming data in server-returned HTML without browser execution.

Exit criteria:

- Deterministic fixtures exist for all three logical sources.
- Live-page uncertainty is separated from parser implementation.

### Work package 2 — Add source and snapshot contracts

1. Add `ActiveEventSource` for the three registered sources.
2. Add `SourceFetcher`, parsing context, refresh result, and stable error types.
3. Add `sourceSnapshotSchema` and `SourceSnapshot`.
4. Keep `eventsListResponseSchema` unchanged.
5. Add configuration validation and active registry.

Exit criteria:

- Inactive enum members cannot accidentally enter the scheduler registry.
- Snapshot files have one runtime-validated format.

### Work package 3 — Implement storage

1. Define `SourceSnapshotStore`.
2. Implement `JsonFileSourceSnapshotStore` with source-to-filename allowlist.
3. Create the configured directory safely.
4. Implement validated reads.
5. Implement atomic temp write/close/rename in the same directory.
6. Preserve an existing target on serialization/write/rename failure.
7. Add generated cache paths to `.gitignore`.
8. Add tests for missing, valid, corrupt, wrong-source, write failure, and atomic replacement behavior.
9. Define the object-storage adapter seam/documentation for cloud deployment.

Exit criteria:

- No parser or router imports `node:fs`.
- A failed write cannot truncate the last successful file.

### Work package 4 — Implement shared ingestion utilities

1. Add `cheerio`.
2. Implement bounded HTTP retrieval.
3. Implement text, URL, date/time, city, and category normalization.
4. Implement stable IDs.
5. Implement within-source and cross-source deduplication.
6. Implement deterministic sorting and Helsinki past-event filtering.
7. Add fixed-clock/table-driven tests.

Exit criteria:

- Utilities are deterministic and independent of host timezone/locale.
- Untrusted URLs/text cannot bypass validation.

### Work package 5 — Implement AfishaMira parser/fetcher

1. Write fixture tests before selectors.
2. Parse the upcoming section only.
3. Map fields from section 11.
4. Add empty-vs-drift detection.
5. Validate the final events.
6. Add `afishamira` to the registry.
7. Run an opt-in live parser comparison.

Exit criteria:

- Past events and non-event blocks are excluded.
- Valid listing-only events require no detail-page requests.

### Work package 6 — Implement shared Songkick parser and two fetchers

1. Add venue configurations.
2. Write shared parser tests using both venue fixtures.
3. Validate venue identity.
4. Parse upcoming event rows and mapping from section 12.
5. Add empty-vs-drift detection.
6. Instantiate two fetchers from the shared factory.
7. Register both logical sources.
8. Prove source/cache isolation in tests.
9. Run opt-in live comparisons against each URL.

Exit criteria:

- One parser implementation supports both venues.
- Each venue produces its correct source ID and cache key.

### Work package 7 — Implement independent refresh transactions

1. Implement `refreshSource` with injected fetcher/store/clock/logger.
2. Write successful snapshot replacement.
3. Write successful empty replacement.
4. Implement failed-refresh last-known-good preservation.
5. Implement failed-first-run behavior without fake empty data.
6. Add overlap/run-order protection appropriate to each store.
7. Add tests proving one source never writes another source key.

Exit criteria:

- Every source refresh is an independent transaction.
- Failure never loses a prior valid event list.

### Work package 8 — Add scheduler entry points

1. Add authenticated source-targeted POST route.
2. Add source-targeted CLI wrapper.
3. Validate bearer secret and source allowlist.
4. Return monitorable status codes.
5. Document three nightly scheduler entries and manual recovery commands.
6. Test unauthorized, unknown source, success, preserved failure, and no-snapshot failure.

Exit criteria:

- The scheduler can retry one venue without refreshing the other two.
- No resident process is required.

### Work package 9 — Implement aggregate snapshot reads

1. Implement concurrent reads through `SourceSnapshotStore`.
2. Skip missing/corrupt individual snapshots with logs.
3. Filter past events.
4. Deduplicate and sort.
5. Calculate conservative `updatedAt` from snapshot `lastSuccessAt` values.
6. Throw only when no valid snapshot exists.
7. Replace the `mockEvents` import in `eventsRouter`.
8. Remove/move `mockEvents` from the production runtime.

Exit criteria:

- `events.list` makes no external request and keeps its Phase 5 output shape.
- A failed source's old snapshot remains part of the aggregate.

### Work package 10 — Verify and deploy

1. Seed all three source snapshots through refresh jobs.
2. Run automated verification.
3. Test a failed refresh for each source and compare snapshot hashes/events before and after.
4. Test corrupt and missing one-source files.
5. Deploy to preview with an appropriate persistent store.
6. Configure three nightly schedules.
7. Trigger and inspect each schedule manually.
8. Confirm the public page never causes upstream website requests.
9. Document actual selectors, cache driver, paths/keys, schedule, event counts, and observed timings.

Exit criteria:

- Preview and production-like runs retain last-known-good data through a forced source failure.
- Deployment storage survives process restart/cold start.

## 19. Test plan

### 19.1 Parser fixture tests

AfishaMira:

- upcoming section parsed;
- past events excluded;
- category precedence;
- full date/time;
- optional fields absent;
- promotional/non-event nodes ignored;
- one malformed card dropped;
- genuine empty result;
- structural drift failure.

Songkick shared parser:

- Ääniwalli mapping;
- Apollo mapping;
- venue mismatch failure;
- multiple artists/headliner;
- unknown time;
- canonical event URL;
- ticket link not mistaken for canonical URL;
- past concerts excluded;
- genuine empty result;
- JavaScript warning does not hide server-rendered data;
- structural drift failure.

### 19.2 Snapshot store tests

- missing file returns null;
- valid file passes schema;
- invalid JSON is rejected;
- schema-invalid file is rejected;
- source/file mismatch is rejected;
- atomic success replaces target;
- serialization/temp-write/rename failure preserves target;
- three sources map to three distinct keys;
- traversal-like source input cannot become a path;
- file and object-store test doubles satisfy the same contract suite.

### 19.3 Refresh transaction tests

- first success creates snapshot;
- later success replaces only the target source;
- success with zero events clears target events;
- fetch failure preserves target events and `lastSuccessAt`;
- parse failure preserves target events;
- validation failure preserves target events;
- first-ever failure creates no successful snapshot;
- failure metadata is sanitized;
- older overlapping run cannot replace a newer success;
- Apollo failure does not mutate Ääniwalli/Afisha snapshots.

### 19.4 Aggregation tests

- all three valid snapshots aggregate;
- one missing snapshot is tolerated;
- one corrupt snapshot is tolerated;
- no valid snapshot fails the query;
- stale-after-error snapshot is still used;
- past events from stale files are removed;
- cross-source duplicates merge conservatively;
- distinct same-day concerts remain distinct;
- output ordering and IDs are stable;
- `updatedAt` uses the oldest included `lastSuccessAt`;
- output passes the unchanged public schema.

### 19.5 HTTP and security tests

- timeout;
- response body limit with and without `Content-Length`;
- non-HTML response;
- 4xx/429/5xx mapping;
- redirect limit;
- redirect to disallowed host;
- no inbound auth/cookie forwarding;
- refresh route unauthorized;
- refresh route unknown source;
- secrets and HTML absent from logs/responses.

### 19.6 Browser/API regression tests

- cold browser cache loads backend snapshots.
- warm browser cache appears before tRPC result.
- successful `events.list` replaces aggregate browser cache.
- total backend snapshot read failure preserves browser cache.
- current and saved filters continue to work.
- source/type/date/event card rendering remains valid.
- no client behavior expects source-status metadata.

### 19.7 Live smoke tests

Keep live tests opt-in, for example:

```text
RUN_LIVE_SOURCE_TESTS=1 npm test -- source-live
```

They should verify:

- response is reachable HTML;
- venue/page identity is correct;
- parser result passes schemas;
- structural sentinels still exist;
- event count is plausible, not fixed to a particular artist/count.

Normal CI must use fixtures and make no live network request.

### 19.8 Verification commands

```text
npm test
npx tsc --noEmit
npm run lint
npm run build
git diff --check
rg "mockEvents|puppeteer|playwright|setInterval|node-cron" app components src scripts
rg "fetch\(" src/server/routers components app/page.tsx
```

The second scan should confirm source fetches exist only in the refresh-side HTTP adapter, never the public router or client.

## 20. Deployment portability

### 20.1 Local development

- `json-file` cache driver.
- Project-local ignored cache directory.
- Manual CLI refreshes.
- Fixture tests for normal development.

### 20.2 Traditional server or container

- `json-file` cache driver.
- Absolute cache directory on a persistent mounted volume.
- Scheduler invokes CLI or protected HTTP route.
- Process restarts preserve snapshots.

### 20.3 Stateless/serverless cloud

- Object/blob storage implementation of `SourceSnapshotStore`.
- Managed scheduler invokes the protected source-targeted routes.
- No reliance on ephemeral function filesystem.
- Conditional object writes prevent old overlapping runs from replacing newer data.
- Parser/fetcher/aggregator code is unchanged.

### 20.4 Portability invariant

Only composition/configuration selects storage and scheduling. The following must remain deployment-independent:

- HTML parsers;
- event normalization;
- stable IDs;
- deduplication;
- source refresh transaction semantics;
- public tRPC contract;
- browser behavior.

## 21. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Source HTML changes | Minimal fixtures, structural sentinels, parsed/dropped counts, opt-in live smoke tests. |
| Parser drift incorrectly writes `[]` | Require positive empty-state identification; otherwise treat zero parse as failure and preserve old snapshot. |
| Nightly request fails | Preserve source events and `lastSuccessAt`; record failed attempt and return monitorable failure. |
| One source corrupts another | Hard-coded source-to-key map and one-source transaction tests. |
| Partial source failure reaches browser | Public API reads last-known-good snapshots; no client-side partial merge is needed. |
| JSON write truncates cache | Same-directory temp file plus atomic rename; preserve target on failure. |
| Serverless filesystem disappears | Use `SourceSnapshotStore` object-storage implementation in stateless deployments. |
| In-process cron never runs in cloud | External managed scheduler calls protected source-specific routes. |
| Two jobs overlap | Stagger schedules, run IDs, serialization locally, conditional writes/leases in distributed storage. |
| Old cache contains past events | Remove past events on aggregate read using `Europe/Helsinki`. |
| Stale data contains a future canceled/rescheduled event | Nightly retry and stale/error logs; later add stale UI/monitoring if needed. |
| Songkick venue markup differs subtly | Shared parser with two fixtures plus venue identity validation and configuration-specific tests. |
| Artist extraction is unreliable | Prefer explicit headliner metadata; leave optional field absent; Phase 7 searches titles. |
| Public traffic triggers upstream rate | Public API never scrapes; only three scheduled nightly requests plus controlled retries/manual runs. |
| Refresh endpoint is abused | Bearer secret, POST only, source allowlist, rate control at deployment edge, sanitized output. |
| Host timezone changes results | Explicit Helsinki calendar logic with fixed-clock tests. |

## 22. Acceptance criteria

### Sources and parsers

- AfishaMira parser returns normalized upcoming events from its city page fixture/live smoke test.
- One shared Songkick parser supports both configured venue pages.
- Songkick venue identity mismatch fails safely.
- Tochka and EventCartel are not in the active registry.
- No browser automation or live detail-page fan-out is used.

### Backend cache

- Three independent versioned snapshots exist after successful refreshes.
- Each refresh writes only its own source.
- Successful empty results replace old data.
- Failed refreshes preserve last successful events/timestamp.
- Writes are atomic.
- Missing/corrupt individual snapshots do not destroy valid snapshots.
- Snapshot store is injectable and has a cloud object-storage path.

### Scheduling

- Each source can be refreshed independently through the same application service.
- Protected HTTP and CLI entry points exist.
- Three nightly jobs are documented/configured.
- No in-process timer is required.
- Scheduler failure is externally observable.

### API and UI

- `events.list` keeps `{ events, updatedAt }`.
- `events.list` performs no external HTTP request.
- `updatedAt` does not falsely renew stale data.
- Existing aggregate browser cache remains unchanged.
- Browser-cache fallback still works when no backend snapshot can be read.
- Filters and event cards work with real events.
- No production path returns `mockEvents`.

### Portability and security

- Core parser/aggregation code does not depend on local hardware, browser binaries, host timezone, or machine paths.
- JSON files work on a persistent filesystem.
- Stateless hosting can swap in object storage without changing domain logic.
- Source URLs/filenames are allowlisted and cannot be supplied by users.
- Refresh secrets and raw HTML are not exposed.

### Verification

- Parser, store, refresh, aggregation, route, and UI tests pass.
- Typecheck, lint, build, and diff checks pass.
- Forced failure of each source proves last-known-good preservation.
- Restart/cold-start test proves snapshot durability for the selected deployment store.

## 23. Suggested commit sequence

1. `add-source-snapshot-contracts`
2. `add-json-file-source-snapshot-store`
3. `add-event-normalization-and-deduplication`
4. `add-bounded-source-http-client`
5. `add-afishamira-html-parser`
6. `add-shared-songkick-venue-parser`
7. `add-three-independent-source-fetchers`
8. `add-last-known-good-refresh-service`
9. `add-source-refresh-route-and-cli`
10. `read-source-snapshots-in-events-router`
11. `remove-production-mock-events`
12. `configure-nightly-refresh-and-verify`

Each commit should keep deterministic tests and type checking green. Generated cache JSON and raw complete third-party pages must not be committed.

## 24. Explicit implementation decisions

1. Active sources are AfishaMira, Songkick Ääniwalli, and Songkick Apollo.
2. The two Songkick venues are separate source/cache/job instances using one shared parser.
3. Tochka and EventCartel are inactive for now.
4. HTML is fetched only by scheduled/manual refresh jobs, never by page requests.
5. Every source has an independent last-known-good backend snapshot.
6. A failed refresh keeps old events and does not renew `lastSuccessAt`.
7. A positively identified successful empty source replaces old events with `[]`.
8. Backend cache uses versioned serialized JSON with a filesystem implementation first.
9. Persistence is behind `SourceSnapshotStore`; serverless cloud deployment uses object storage rather than ephemeral local disk.
10. Scheduling is external and source-targeted; no in-process cron loop is used.
11. The public Phase 5 response and aggregate browser cache remain unchanged.
12. `updatedAt` is conservative and derived from stored source success timestamps.
13. `Europe/Helsinki` is the explicit business timezone.
14. Mock events are not a production fallback after cutover.

## 25. Definition of done

Phase 6 is done when three independent nightly HTML refresh jobs populate durable, versioned last-known-good source snapshots; failures preserve the affected source's prior events without touching the other sources; the unchanged `events.list` procedure reads, validates, filters, deduplicates, and sorts those snapshots without accessing upstream websites; the UI retains its Phase 5 aggregate browser fallback; and the selected deployment store survives process restarts while remaining replaceable with cloud object storage for stateless hosting.
