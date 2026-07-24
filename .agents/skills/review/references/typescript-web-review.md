# TypeScript web application review

Apply this reference with `review-rubric.md` when reviewing this repository or another TypeScript web application. Use the versions and settings declared by the repository; do not assume behavior from a newer framework release.

## Contents

- Current repository stack
- Trace API integration end to end
- Review TypeScript as a runtime contract
- Review web security threats
- Review performance with evidence
- Review framework and browser compatibility
- Verification selection

## Current repository stack

This repository currently declares:

- Next.js 14 App Router and React 18.
- TypeScript 5 with `strict`, `noEmit`, `isolatedModules`, and bundler module resolution.
- tRPC 11 over a Next.js route handler.
- TanStack Query 5 through the tRPC React integration.
- Zod 4 runtime schemas.
- Tailwind CSS 4 and the Next.js Core Web Vitals ESLint rules.

Re-read `package.json`, lockfiles, TypeScript, Next.js, lint, test, and build configuration during every review because the stack can change.

## Trace API integration end to end

For every changed API query or mutation, inspect this complete path when present:

1. Component or hook invocation and the state rendered for pending, success, empty, stale, and error results.
2. tRPC React call, query options, input, inferred output, query identity, cancellation, and invalidation.
3. Client link configuration, batching behavior, endpoint construction, headers, credentials, and server-versus-browser URL selection.
4. Next.js route handler exports, endpoint agreement, runtime assumptions, request context creation, and error handling.
5. Router registration, procedure visibility, authentication and resource authorization, input/output schemas, and error mapping.
6. Upstream API or data source requests, including schema validation, timeouts, abort propagation, retries, pagination, rate-limit handling, and partial failures.
7. Response consumption and persistence, including cache freshness, race ordering, stale overwrite, optimistic rollback, and compatibility with stored data.

Check both directions of the contract. A request can be well typed while still sending the wrong runtime value, and a response can satisfy a compile-time type while containing unvalidated external data.

Verify endpoint paths, HTTP methods, headers, credentials, environment-derived base URLs, serialization, status and error mapping, timeouts, cancellation, retries, idempotency, pagination, rate limits, and partial failures where relevant. Confirm contract changes remain compatible with every consumer or include a deliberate migration, and require focused contract or integration tests for risky boundary changes.

Report concrete issues such as:

- A client endpoint, procedure path, method, input, or response shape that disagrees with the server.
- A new router that is not registered or a renamed procedure with remaining consumers.
- Missing or overly permissive Zod validation at an untrusted boundary.
- Output validation that rejects realistic server data or silently strips required data.
- Retrying a non-idempotent operation, ignoring cancellation, or omitting a material timeout.
- Query invalidation that leaves changed data stale or a race that lets an older response win.
- Errors that collapse authentication, authorization, validation, availability, and empty results into the same UI state.

## Review TypeScript as a runtime contract

Use the compiler configuration as the baseline, then inspect places where the type system can be bypassed.

- Follow values originating from `Request`, route params, search params, forms, environment variables, `localStorage`, JSON parsing, and external APIs until runtime validation occurs.
- Check that strict types preserve domain invariants and distinguish absent, `undefined`, `null`, empty, loading, error, and success states where behavior differs.
- Flag unjustified `any`, unsafe assertions, non-null assertions, double casts, broad index signatures, unchecked generic defaults, unsafe `unknown` narrowing, `JSON.parse`, and unchecked property access only when they permit a specific invalid state or hide a contract mismatch.
- Prefer one source of truth: infer TypeScript types from Zod schemas or tRPC routers when practical. Identify duplicated types only when drift is possible or already visible.
- Check optional and nullable properties against update and serialization semantics. An omitted field, an explicit `undefined`, `null`, and an empty string can produce different API or UI behavior.
- Verify discriminated unions are narrowed and handled exhaustively when a new state or variant is added.
- Check generic constraints, safe key access, and `readonly` intent where they protect invariants. Check that hooks and helpers return types prevent impossible combinations, such as data marked available while the operation is still unresolved.
- Ensure values crossing the React Server Component or route boundary are serializable and that client modules do not import server implementations at runtime. Type-only router imports are acceptable when erased from the client bundle.

Do not recommend annotations that merely restate good inference or cosmetic type aliases that add no safety.

## Review web security threats

Identify the trust boundary and a plausible attacker-controlled value before raising a security finding.

### Server and API

- Treat exported route handlers and tRPC `publicProcedure` endpoints as publicly reachable.
- Verify authentication and per-resource authorization independently. Check object identifiers for insecure direct object reference risks.
- Validate and bound strings, arrays, pagination sizes, dates, URLs, and nested data before expensive work.
- Check database, shell, template, header, path, and URL construction for injection or traversal.
- For server-side fetches influenced by users, restrict protocols and destinations to prevent server-side request forgery.
- For cookie-authenticated mutations, verify the application's same-site, origin, and cross-site request forgery protections.
- Check CORS, redirects, proxy headers, error responses, and logs for credential or internal-detail disclosure.
- Check rate limits or other abuse controls on expensive, bulk, search, upload, or mutation paths when exposure is realistic.

### Browser and rendering

- Treat `dangerouslySetInnerHTML`, HTML parsers, user-controlled links, image URLs, CSS values, and redirect targets as injection or navigation boundaries.
- Ensure secrets and server-only environment variables never enter client components or `NEXT_PUBLIC_*` values.
- Treat browser storage as attacker-modifiable and readable by scripts. Validate loaded values and do not store credentials or sensitive personal data without a documented design.
- Check new-window links and external navigation for opener and scheme risks where the framework does not already mitigate them.

### Supply chain and configuration

- Inspect dependency and lockfile changes for unexpected packages, install scripts, abandoned libraries, vulnerable versions, and unnecessary production dependencies.
- Check security headers, cookies, source maps, debug modes, and deployment configuration when the change touches them.

Do not report a generic threat list. Explain the controllable input, missing defense, execution path, and impact.

## Review performance with evidence

Start from structural evidence in the change, then use existing profiling or production signals when available.

### Network and server

- Look for serial request waterfalls, N+1 upstream calls, duplicate tRPC queries, loss of batching, unbounded lists, oversized responses, and over-fetching.
- Check TanStack Query `staleTime`, retry, refetch, polling, invalidation, and query identity together. Settings that are reasonable alone can multiply traffic when combined.
- Verify abort signals and timeouts reach slow upstream work where cancellation matters.
- Check caching for correct scope and freshness. Do not recommend caching personalized or authorization-sensitive data without a safe cache key and invalidation model.
- Check CPU-heavy parsing/filtering, synchronous work, repeated schema validation, and large serialization on request paths.

### React and Next.js

- Check whether a new `'use client'` boundary unnecessarily moves a large subtree or server-capable dependency into the browser bundle.
- Look for unstable object/function dependencies, effect loops, duplicated derived state, subscriptions without cleanup, and context values that force broad rerenders.
- Identify expensive sorting, filtering, formatting, or schema parsing repeated on every render with realistically large input. Do not prescribe memoization without a material cost or identity requirement.
- Check hydration-sensitive values such as time, locale, random IDs, and browser-only state for server/client disagreement or visible layout shifts.
- Check dynamic imports, images, fonts, and third-party scripts when the change materially affects initial JavaScript, loading priority, or Core Web Vitals.
- Check browser storage and in-memory caches for size limits, eviction, versioning, and repeated full serialization.

Classify performance findings by likely user or infrastructure impact. A measurable main-path regression can be Important; a bounded edge case is usually Mid; a speculative micro-optimization is not a finding.

## Review framework and browser compatibility

- Verify React hook, effect, and rendering semantics against the declared React version.
- Check Next.js App Router lifecycle, routing, caching, rendering, and client/server module rules against the installed Next.js version.
- Check runtime targets, browser APIs, polyfill assumptions, and supported-browser behavior before recommending newer language or platform features.
- Check migrations for persisted browser data, public route-shape changes, rendering-mode changes, and compatibility with the configured deployment runtime.
- Use primary TypeScript, React, Next.js, tRPC, TanStack Query, Zod, and web-platform documentation for version-sensitive claims.

## Verification selection

Use the smallest commands that cover the changed risk, without installing packages or changing repository state:

- Run the configured TypeScript check, or `tsc --noEmit` through the local package runner when no script exists.
- Run the configured linter for changed TypeScript and React behavior.
- Run focused tests before broad suites when tests exist.
- Run the production build when reviewing routing, client/server boundaries, environment access, bundling, static rendering, or deployment behavior.

If the repository has no test command or integration tests, report that as residual risk. Raise a missing-test finding only when changed behavior meets the general rubric's acceptance test.
