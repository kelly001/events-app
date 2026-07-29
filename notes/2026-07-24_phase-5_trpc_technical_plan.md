# Phase 5 Technical Plan — tRPC Backend with Mock Data

Date: 2026-07-24  
Project: RU Events Helsinki  
Phase status: implemented and verified on 2026-07-24

## 1. Objective

Replace the page's direct `fetch('/api/events')` request with an end-to-end typed tRPC query while preserving the behavior completed in Phases 3 and 4:

1. Render a valid browser-cached event snapshot as soon as it has been read after mount.
2. Start a backend refresh in the background on every page mount.
3. Replace the cached snapshot with the backend result when the query succeeds.
4. Persist the successful result back to `localStorage`.
5. Keep cached events visible if the refresh fails.
6. Keep the public `useEvents()` result and `app/page.tsx` behavior stable.

The phase is complete when the only frontend-to-backend event path is `events.list` through `/api/trpc`, the old REST-like `/api/events` route is removed, and all cache, filter, loading, timestamp, and error behaviors still work.

## 2. Inputs reviewed

This plan is based on:

- `notes/ru_events_helsinki_implementation_plan.md`
- `notes/2026-06-17_progress.md`
- `notes/2026-07-01_progress.md`
- `notes/web app design.png`
- The repository implementation as of 2026-07-24

The design image is a visual-regression reference for the event discovery page. Phase 5 does not add the logo, sorting control, free-event filter, new saved-filter model, or other visual features shown in the image but absent from the current scope.

## 3. Current technical baseline

| Area | Current state | Phase 5 implication |
| --- | --- | --- |
| Framework | Next.js 14.2.35 App Router, React 18.3.1, TypeScript 5.9.3 | Use a catch-all App Router route handler and the Fetch adapter. |
| Validation | Zod 4.4.3 is installed | Reuse it for the event response and cache runtime contract. |
| tRPC | Not installed | Add the tRPC 11 server, client, and classic React Query integration packages. |
| Query state | `useEvents` owns request and event state manually | Move request lifecycle to React Query but keep the hook as the page-facing adapter. |
| Backend | `GET /api/events` returns mock events and `updatedAt` | Reproduce this semantic response through `events.list`. |
| Browser cache | `ru-events-helsinki.cached-events`, shape `{ events, updatedAt }` | Preserve both names in this phase to avoid invalidating existing caches. |
| Cache hydration | Cache is read in an effect after mount | Preserve this to avoid a server/client hydration mismatch. |
| Cache policy | Six-hour freshness calculation, but refresh always runs | Preserve both facts; freshness is metadata, not a reason to skip the query. |
| Error policy | Cached events survive refresh failure | Preserve cached data and show the existing refresh warning. |
| Filtering | Client-side and independent of transport | Do not move filters into tRPC in Phase 5. |
| Tests | No automated test runner or test script | Use type/lint/build checks plus explicit browser and endpoint scenarios. |

## 4. Architecture decisions

### 4.1 Use the classic tRPC React Query integration

Install compatible majors:

```text
@trpc/server@^11
@trpc/client@^11
@trpc/react-query@^11
@tanstack/react-query@^5
```

All three `@trpc/*` packages must resolve to the same version in `package-lock.json`. Keep the already installed Zod 4 dependency. Do not add `@trpc/next`; its Next.js integration is for the Pages Router, while this project uses App Router route handlers.

Use `createTRPCReact<AppRouter>()` from `@trpc/react-query`. The newer TanStack-native integration is not needed for this small migration, and the classic hook API maps directly to the desired `trpc.events.list.useQuery()` call.

### 4.2 Return a timestamped response envelope

`events.list` should return:

```ts
type EventsListResponse = {
  events: Event[]
  updatedAt: string
}
```

Do not return only `Event[]`. The current route and page already use a backend-generated timestamp, and the complete response has the same shape as the browser cache. Using one shape prevents adapter code and timestamp fabrication in `useEvents`.

### 4.3 Keep React Query and localStorage responsibilities separate

- React Query owns the live request state and the successful in-memory backend result.
- `localStorage` remains the cross-session fallback cache required by the MVP.
- `useEvents` selects the newest successful tRPC response first, then falls back to the browser snapshot.
- Do not install a React Query persistence package in this phase. The existing small cache helper is sufficient and changing persistence formats would expand the migration.

### 4.4 Do not add server prefetching in this phase

The current page is a Client Component and its cache is browser-only. Server prefetching, dehydration, Suspense streaming, and a server tRPC caller would add a second hydration source without improving the required cache-first behavior.

The provider must still be structured so server prefetching can be added later, but Phase 5 should use a normal client query after hydration.

### 4.5 Keep the current cache format canonical for now

The older implementation plan names the key `ru-events-helsinki.events-cache` and timestamp `fetchedAt`; the running code uses `ru-events-helsinki.cached-events` and `updatedAt`.

Phase 5 should retain the running code's names. A rename would silently discard the current cache unless a migration were added, and it is unrelated to introducing tRPC. Record the current names as the implemented contract and handle any rename in a separate migration.

### 4.6 Use plain JSON transport

The event contract contains only strings, optional strings, and arrays. Do not add SuperJSON or another transformer. It can be introduced later if the API starts returning `Date`, `Map`, `BigInt`, or other non-JSON values.

## 5. Target request and data flow

```text
app/layout.tsx
  -> TrpcProvider
       -> QueryClientProvider
       -> tRPC client using httpBatchLink('/api/trpc')
            -> app/api/trpc/[trpc]/route.ts
                 -> appRouter
                      -> eventsRouter.list
                           -> mockEvents

app/page.tsx
  -> useEvents()
       -> read and validate localStorage snapshot after mount
       -> trpc.events.list.useQuery() in parallel
       -> prefer successful query data over cached data
       -> save successful query response to localStorage
       -> expose the existing hook result to the page
```

## 6. Planned file changes

| File | Change |
| --- | --- |
| `package.json` | Add the four tRPC/React Query runtime dependencies. Optionally add a `typecheck` script for repeatable verification. |
| `package-lock.json` | Lock the installed dependency graph and verify matching tRPC versions. |
| `src/types/events.ts` | Add Zod schemas and derive or check the existing event/response/cache types from one runtime contract. |
| `src/mockEvents.ts` | Keep mock data in place; change the `Event` import to type-only if needed. |
| `src/helpers/loadSaveEventCache.ts` | Validate parsed browser data with the shared response/cache schema instead of using an unchecked cast. Keep the existing key. |
| `src/server/trpc.ts` | Initialize tRPC and export `router` and `publicProcedure`. |
| `src/server/context.ts` | Export a minimal request-context factory returning an empty object; leave the seam ready for future auth/logging. |
| `src/server/routers/events.ts` | Define `eventsRouter.list`, validate its output, and return mock events with a server timestamp. |
| `src/server/routers/root.ts` | Merge `eventsRouter` under `events` and export `AppRouter`. |
| `app/api/trpc/[trpc]/route.ts` | Expose the root router through `fetchRequestHandler` for both GET and POST. |
| `src/trpc/client.ts` | Export the typed `trpc` React hook factory using a type-only `AppRouter` import. |
| `components/providers/TrpcProvider.tsx` | Create stable QueryClient/tRPC client instances and mount both providers. |
| `app/layout.tsx` | Wrap `children` in `TrpcProvider`; keep metadata and page markup unchanged. |
| `components/hooks/useEvents.ts` | Replace manual `fetch` with `trpc.events.list.useQuery()` and bridge query data to the browser cache. |
| `app/api/events/route.ts` | Delete after the tRPC path passes verification. |
| `notes/ru_events_helsinki_implementation_plan.md` | After implementation, mark Phase 5 complete and record the actual cache contract. |

## 7. Implementation sequence

### Work package 1 — Establish a verified baseline

1. Run `npx tsc --noEmit` before changing code.
2. Run `npm run lint` and record whether it passes with the current Next.js version.
3. Run `npm run build` once with a practical timeout and record the known timeout separately from code failures.
4. Confirm the browser currently calls `/api/events` and shows the seven mock events when no filters are applied.

Exit criteria:

- Pre-existing errors are distinguished from Phase 5 regressions.
- The starting REST response and cache behavior have been observed.

### Work package 2 — Install compatible dependencies

1. Install the four packages listed in section 4.1.
2. Inspect `npm ls @trpc/server @trpc/client @trpc/react-query @tanstack/react-query`.
3. Confirm all tRPC packages use the same resolved version and React Query is major version 5.
4. Do not add SuperJSON, a persistence adapter, devtools, or an extra Next.js adapter.

Exit criteria:

- The lockfile is deterministic.
- TypeScript can resolve all planned imports.

### Work package 3 — Define the runtime event contract

1. Add `eventTypeSchema` and `eventSourceSchema` from the existing literal unions.
2. Add `eventSchema` matching every required and optional field in the existing `Event` model.
3. Add `eventsListResponseSchema` for `{ events, updatedAt }`; require `updatedAt` to be a valid ISO datetime string.
4. Define `EventsListResponse` from the schema and make `EventCache` an alias of the same shape, or prove both against the same schema.
5. Update type-only imports so adding schemas does not accidentally pull server-only code into client bundles.
6. Change `loadEventCache()` to return `null` when JSON parsing or schema validation fails.

Exit criteria:

- Mock data satisfies the runtime contract.
- tRPC output and browser cache cannot drift structurally.
- Malformed localStorage content cannot crash the page.

### Work package 4 — Build the server router

1. In `src/server/context.ts`, define `createTRPCContext` with no user-specific state yet.
2. In `src/server/trpc.ts`, initialize tRPC with that context type and export:
   - `router`
   - `publicProcedure`
3. In `src/server/routers/events.ts`, define:

   ```text
   eventsRouter
     list: publicProcedure
       no input
       output EventsListResponse
       query -> { events: mockEvents, updatedAt: new Date().toISOString() }
   ```

4. In `src/server/routers/root.ts`, mount it as `events: eventsRouter`.
5. Export `type AppRouter = typeof appRouter`; never import the runtime router from client code.

Exit criteria:

- The inferred client procedure path is `events.list`.
- The router returns the exact cache-compatible envelope.
- There is no external network access, scraping, filtering input, database, or authentication.

### Work package 5 — Expose the App Router endpoint

1. Create `app/api/trpc/[trpc]/route.ts`.
2. Use `fetchRequestHandler` from `@trpc/server/adapters/fetch`.
3. Configure `endpoint: '/api/trpc'`, `router: appRouter`, and `createContext: createTRPCContext`.
4. Export the same handler as both `GET` and `POST` because the batch link may use either as procedures evolve.
5. Add development-only `onError` logging with the procedure path; do not expose stack traces in production responses.

Exit criteria:

- A request to the tRPC `events.list` procedure returns a successful tRPC response.
- A missing procedure returns a tRPC error response rather than crashing the route handler.

### Work package 6 — Add the typed client and providers

1. Create `src/trpc/client.ts` with `createTRPCReact<AppRouter>()`.
2. Import `AppRouter` with `import type` so server implementation code is removed from the client build.
3. Create a client component at `components/providers/TrpcProvider.tsx`.
4. Instantiate QueryClient and the tRPC client once per mounted provider, using lazy state or the documented browser-singleton pattern.
5. Configure QueryClient to preserve current request behavior:
   - `staleTime: 0` so a mount triggers refresh
   - `retry: false` to match the existing one-attempt fetch
   - `refetchOnWindowFocus: false`
   - `refetchOnReconnect: false`
6. Configure `httpBatchLink` with the `/api/trpc` endpoint. Use an absolute origin only for server execution; use the same-origin relative URL in the browser.
7. Wrap the application body contents in `TrpcProvider` from `app/layout.tsx`.

Provider nesting:

```tsx
<trpc.Provider client={trpcClient} queryClient={queryClient}>
  <QueryClientProvider client={queryClient}>
    {children}
  </QueryClientProvider>
</trpc.Provider>
```

Exit criteria:

- `app/layout.tsx` remains a Server Component.
- Client components below it can call typed tRPC hooks.
- Initial server markup and first client render still match.

### Work package 7 — Migrate `useEvents`

Keep the hook's return shape:

```ts
{
  events,
  isLoading,
  lastUpdated,
  isCacheFresh,
  errorMessage
}
```

Implement the hook in this order:

1. Start `trpc.events.list.useQuery()` when the component mounts.
2. Keep `cachedSnapshot` and `hasReadCache` as the only local cache-hydration state.
3. In a mount effect, call `loadEventCache()`, store the valid result or `null`, and then mark the cache read complete.
4. When `query.data` changes after a successful request, persist the complete response through `saveEventCache(query.data)`.
5. Derive the visible snapshot as `query.data ?? cachedSnapshot` so a successful backend result always wins.
6. Derive the hook fields rather than copying query data into another `events` state:
   - `events`: visible snapshot events or `[]`
   - `lastUpdated`: visible snapshot timestamp or `null`
   - `isLoading`: true only while neither cache nor backend data is available and initial cache reading/query work is pending
   - `isCacheFresh`: true for a successful current response; otherwise calculate against the cached timestamp and the existing six-hour TTL
   - `errorMessage`: existing cached-data warning when the query fails with a snapshot available; existing load error when it fails without one
7. Remove the manual `fetch`, response parsing, `isMounted` flag, and request `try/catch/finally`; React Query owns that lifecycle.

Do not use a lazy localStorage read as the initial React state. It returns `null` during server rendering but cached data in the browser's first render, which can recreate the hydration issue fixed in Phase 4.

Required state behavior:

| Cache after mount | tRPC state | Visible result | Loading | Error text |
| --- | --- | --- | --- | --- |
| Not read yet | Pending | Empty | Yes | None |
| Valid snapshot | Pending/fetching | Cached events | No | None |
| Valid snapshot | Success | Fresh events | No | None |
| Valid snapshot | Error | Cached events | No | Refresh warning |
| Missing/invalid | Pending | Empty | Yes | None |
| Missing/invalid | Success | Fresh events | No | None |
| Missing/invalid | Error | Empty | No | Load error |

Exit criteria:

- `app/page.tsx` needs no behavioral changes.
- Filters continue to operate on `events` after cache and query updates.
- A failed query never replaces cached events with an empty array.

### Work package 8 — Remove the temporary route

1. Search for `/api/events` and confirm no callers remain.
2. Delete `app/api/events/route.ts`.
3. Confirm `/api/events` is no longer part of the intended backend surface.
4. Do not retain the old route as a silent fallback; localStorage is the offline fallback.

Exit criteria:

- Exactly one mock-event backend path remains: `events.list` through `/api/trpc`.

### Work package 9 — Verify and document completion

Run static checks:

1. `npx tsc --noEmit`
2. `npm run lint`
3. `npm run build`
4. `rg "/api/events|fetch\\(" app components src`

Inspect the production/client boundary:

1. Verify client files import `AppRouter` as a type only.
2. Verify `mockEvents` is executed by the server procedure and is not imported by `useEvents` or `app/page.tsx`.
3. Verify no server-only module is bundled through a client value import.

Run browser scenarios:

1. **Cold start:** clear the event cache, reload, observe loading, then seven mock events and a timestamp.
2. **Warm cache:** seed a valid cache, throttle the network, reload, and confirm cached events appear before tRPC completes.
3. **Stale cache:** set `updatedAt` older than six hours, reload, confirm cached events remain visible during refresh and `isCacheFresh` is false until success.
4. **Refresh success:** alter the cached event list, reload, and confirm the server list replaces it and overwrites localStorage.
5. **Refresh failure with cache:** block `/api/trpc`, reload, and confirm cached events remain with the refresh warning.
6. **Refresh failure without cache:** clear cache, block `/api/trpc`, reload, and confirm the load error and empty state.
7. **Malformed cache:** put invalid JSON and then structurally invalid JSON under the cache key; reload and confirm the app treats both as a cache miss.
8. **Hydration:** reload with console open and confirm there is no hydration warning.
9. **Filter regression:** apply event-type, predefined-artist, custom-artist, and saved filters before and after the backend response.
10. **Persistence regression:** reload and confirm current/saved filters are unchanged by the provider migration.
11. **Network path:** confirm the browser calls `/api/trpc/events.list` and never `/api/events`.
12. **UI regression:** confirm the filter panel, saved-filter cards, count, last-updated text, event cards, focus states, and responsive layout remain unchanged.

After verification, update the main implementation plan and add a progress note with:

- installed package versions
- final file paths
- checks that passed or timed out
- confirmation that `/api/events` was removed
- any intentionally deferred issues

## 8. Acceptance criteria

### Server and contract

- `appRouter` exposes `events.list` with no input.
- The procedure returns `{ events: Event[], updatedAt: ISO string }` from `src/mockEvents.ts`.
- The response is validated at runtime with Zod.
- `AppRouter` is exported for end-to-end type inference.
- `/api/trpc` handles the procedure through the App Router Fetch adapter.

### Client and providers

- The root layout mounts stable tRPC and QueryClient providers without becoming a Client Component.
- `useEvents` uses `trpc.events.list.useQuery()`; it contains no direct `fetch('/api/events')`.
- No client runtime import pulls in the root router or mock event module.
- No hydration warning appears.

### Cache and errors

- Existing cache key and `{ events, updatedAt }` shape remain compatible.
- Valid cached events render before a delayed refresh finishes.
- Successful data updates the page and localStorage.
- Failed refreshes preserve cached events.
- Missing or invalid cache plus failed refresh produces the existing load error.
- The six-hour freshness calculation still works.

### Regression and cleanup

- Current and saved filters retain their Phase 4 behavior.
- Event filtering remains client-side.
- The page appearance is unchanged.
- `app/api/events/route.ts` and all `/api/events` callers are removed.
- Type checking and linting pass; build either passes or has a documented pre-existing infrastructure timeout with no TypeScript/build error attributable to Phase 5.

## 9. Suggested commit sequence

1. `install-trpc-and-react-query`
2. `define-event-response-schema`
3. `add-trpc-events-router-and-route`
4. `add-trpc-client-provider`
5. `migrate-events-hook-to-trpc`
6. `remove-legacy-events-route`
7. `verify-and-document-phase-5`

Each commit should type-check independently. Keep the old route only during the intermediate migration commits; it must not remain in the completed Phase 5 state.

## 10. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Mismatched tRPC package versions produce opaque generic errors | Install the packages together and verify the resolved versions with `npm ls`. |
| Provider/client objects are recreated on render | Create both with lazy initialization or the documented singleton factory. |
| A client value import bundles server code | Use `import type { AppRouter }` and inspect imports after the migration. |
| React Query's default retries delay the existing error state | Set `retry: false` for Phase 5. |
| React Query's focus/reconnect defaults introduce unexpected requests | Disable both to match the current mount-only refresh behavior. |
| Reading localStorage in the initial render causes hydration drift | Read it only after mount, as Phase 4 already does. |
| Query failure clears cached events | Derive visible data from `query.data ?? cachedSnapshot`; never clear the snapshot on error. |
| Invalid browser data causes runtime failures | Validate parsed cache values with the shared Zod schema. |
| Renaming the cache contract loses existing data | Keep the implemented key and `updatedAt` field in this phase. |
| Response changes lose the last-updated timestamp | Make the tRPC response equal to the cache envelope rather than returning a bare array. |
| New provider changes the visual page | Limit layout changes to provider wrapping and run the UI regression checklist. |

## 11. Explicitly deferred

The following work belongs to later phases or separate tasks:

- Real source fetchers and event aggregation
- Deduplication
- `events.searchArtist` or server-side filtering
- Authentication or user-specific context
- Database persistence
- React Query server prefetching/dehydration
- Persisting the entire React Query cache
- SuperJSON
- Sorting and date filters
- A free/paid event field and the “Free events” saved preset
- UI redesign, logo work, or matching elements present only in the design image
- Renaming the existing localStorage key or timestamp field
- Broad package upgrades to Next.js, React, Tailwind, or Zod

## 12. Definition of done

Phase 5 is done only when a normal page load, a warm-cache page load, and an offline refresh all produce the expected UI; the network panel shows only the tRPC event procedure; the legacy route is gone; the cache is updated only after successful tRPC data; filters still work; and the repository passes the agreed static verification.

## 13. Implementation outcome

Phase 5 was implemented with the planned architecture. The final installed versions are:

- `@trpc/server`, `@trpc/client`, and `@trpc/react-query`: 11.18.0
- `@tanstack/react-query`: 5.101.4

The legacy `app/api/events/route.ts` route was removed. A development and production-mode tRPC client call both returned seven validated mock events through `events.list`; the production root returned HTTP 200 and `/api/events` returned HTTP 404. TypeScript and the optimized Next.js production build passed.

The in-app browser runtime was unavailable in the implementation environment, so localStorage timing, blocked-network fallback messaging, and visual/hydration-console scenarios remain manual browser checks. The hook preserves the Phase 4 cache-after-mount pattern and derives visible data from the successful tRPC response with browser cache fallback.

## 14. Reference documentation

- [tRPC 11 React Query setup](https://trpc.io/docs/client/react/setup)
- [tRPC React Server Components and Next.js App Router route example](https://trpc.io/docs/client/react/server-components)
- [tRPC Fetch adapter](https://trpc.io/docs/server/adapters/fetch)
- [tRPC input and output validators](https://trpc.io/docs/server/validators)
- [TanStack Query advanced SSR and App Router guidance](https://tanstack.com/query/latest/docs/framework/react/guides/advanced-ssr)
