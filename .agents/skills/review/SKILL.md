---
name: review-branch
description: Review committed and local code changes in the current Git branch, a specified branch or ref, an explicit revision range, or a pull request against main or another requested base. Use for professional pre-merge reviews of TypeScript web applications, especially Next.js, React, tRPC, TanStack Query, and Zod projects; branch-vs-base audits; API-contract and integration checks; type-safety, security, performance, regression, architecture, and repository-convention checks; and concise severity-ranked feedback with exact code locations, fixes, and supporting documentation links.
---

# Review Branch

Perform an evidence-driven, read-only review of the requested change set. Prioritize correctness and risk over commentary volume. Report only actionable findings, except never suppress an evidenced Critical finding because no direct fix is currently known or available to the developer.

Always read [references/review-rubric.md](references/review-rubric.md) before reviewing.

When the repository declares a TypeScript web stack in files such as `package.json`, `tsconfig.json`, `next.config.*`, or application `.ts`/`.tsx` files, also read [references/typescript-web-review.md](references/typescript-web-review.md) completely. Apply both the general rubric and the web-specific checks. Treat the repository's installed versions and configuration as authoritative when selecting framework rules.

## Interpret the request

Accept natural-language requests and these optional prompt parameters:

- `target=<branch|tag|commit>`: review this ref; default to the current `HEAD`.
- `base=<branch|tag|commit>`: compare against this ref; default to `main`.
- `range=<git-revision-range>`: review this exact range and ignore `target`/`base`.
- `pr=<number|URL>`: use the pull request's head and base when an available authenticated provider or CLI can resolve them.
- `include-local=<true|false>`: include staged, unstaged, and relevant untracked files when reviewing the checked-out branch; default to `true` only when no explicit target, range, or PR is supplied.

Treat equivalent prose, such as "review feature/x against develop," as parameters. State the resolved scope in one short line. If an explicit ref or PR cannot be resolved without changing repository state, stop and ask for the missing ref or access rather than guessing.

## Preserve repository state

Use read-only inspection commands. Do not checkout or switch branches, fetch, pull, install dependencies, modify files, stage changes, or update a PR. Do not use destructive Git commands. Work from existing refs and disclose when the local base may be stale.

Running an already-configured formatter in write mode is prohibited. Run existing tests, linters, analyzers, or builds only when they are relevant, use available local dependencies, and do not require installation or network access. Report commands and results briefly.

## Resolve the change set

1. Confirm the repository root, current branch, `HEAD`, worktree status, and available refs.
2. Prefer the requested local base ref. If default `main` is absent but `origin/main` exists, use `origin/main` and say so. Do not silently substitute another branch.
3. For `base` and `target`, compare from their merge base, equivalent to `git diff base...target`. Record the merge-base commit.
4. For `range`, honor Git's range semantics exactly and echo the range used.
5. For the current checked-out branch with `include-local=true`, inspect committed changes plus staged, unstaged, and relevant untracked source or test files. Label local-only findings. Never attribute local-only lines to the committed diff.
6. Inspect the name/status list, diff statistics, full patch, renames, deleted files, binary/generated files, and submodule changes before reading individual files.

Exclude unchanged code from the review scope unless it is needed to prove or disprove an issue in changed code.

## Learn the repository before judging it

Read applicable instructions and conventions before evaluating design:

- Root and nested `AGENTS.md` files governing changed paths.
- README, contribution guidance, architecture notes, and coding standards.
- Formatting, linting, compiler, dependency, build, and test configuration.
- Neighboring implementations, tests, namespaces/modules, and folder layout.
- Language and framework versions actually declared by the repository.

Use established repository patterns as evidence, but do not perpetuate a pattern that is demonstrably unsafe or obsolete. Distinguish an enforced convention from a personal preference.

## Review behavior, not just the patch

For each changed behavior:

1. Trace callers, consumers, contracts, state transitions, data flow, and failure paths outside the diff as needed.
2. For API-facing changes, trace the complete contract from the UI caller through the client transport, route handler, context, procedure, runtime validation, response shape, cache, and any upstream service. Verify error, retry, cancellation, authorization, and invalidation behavior at each boundary.
3. Check relevant tests and determine whether they exercise success, boundary, failure, authorization, malformed-data, and regression cases.
4. Search for analogous code and confirm the change belongs in the chosen folder, module, client/server boundary, and application layer.
5. Check every area in the rubric, emphasizing correctness, API integration, type safety, security, performance, compatibility, and architecture before style.
6. Run the smallest relevant existing verification commands when safe. Prefer the configured type checker, linter, tests, and production build where each is material to the change. Do not claim a bug from a failed command until separating product failure from environment or setup failure.
7. Validate each candidate finding against the complete context. Remove speculative, duplicate, preference-only, or already-mitigated findings.

Retain every evidenced Critical finding even when it is not directly actionable. Clearly distinguish "no known direct fix" from "not worth fixing," and provide containment, escalation, further investigation, or verification guidance when any is available.

Review newly introduced code and changed behavior. Do not report unrelated pre-existing defects unless the change makes them reachable or materially worse; list such cases explicitly as change-induced.

## Support conclusions

Use repository documents, specifications, tests, and authoritative current documentation from the language, framework, platform, or library owner. Browse official sources when a conclusion depends on version-sensitive guidance. Prefer the repository's pinned-version documentation when available.

Add a direct Markdown link when a finding relies on a documented contract or guideline. Link to the exact repository file or documentation page, not a search result or generic homepage. Do not invent URLs or add decorative citations. For self-evident logic errors, cite the violated local contract, test, or specification when one exists; otherwise explain the failing execution path precisely.

Quote only the minimum related code needed to identify the problem. Respect source quotation limits for external documentation.

## Write the review

Start with the resolved scope and verification performed. Then use these headings in this order, omitting empty categories:

1. `## Critical`
2. `## Important`
3. `## Mid`
4. `## Low`

Format every finding as:

```markdown
- **[IMPORTANT-01] Short defect title** — `path/to/file.ext:42`
  - **Problem:** What the changed code does, including a compact snippet or exact symbol when useful.
  - **Impact:** The concrete failure mode, affected case, and why the severity fits.
  - **Fix:** A specific correction or a short, viable resolution path; mention tests to add or update. For a Critical finding with no known direct fix, state that explicitly and give any containment, escalation, investigation, or verification path available.
  - **Reference:** Direct Markdown link to the exact authoritative guideline, API contract, specification, test, or repository rule.
```

Keep each finding compact while preserving enough evidence to reproduce and fix it. Use the smallest useful line range, preferably the changed line that causes the defect. Number findings independently and consistently.

After findings, add `## Verification and residual risk` with only:

- Commands run and their outcomes.
- Material checks that could not be run and why.
- Remaining uncertainty that could conceal defects.

If there are no findings, say `No reportable findings.` and still include verification and residual risk. Do not add praise, a prose diff summary, or a list of files merely reviewed.

## Quality bar

- Focus on issues introduced by the change and actionable before merge, while always reporting evidenced Critical risks even when no direct action is known.
- Prefer one root-cause finding over several symptoms.
- Never inflate severity to make feedback look substantial.
- Flag genuine incorrect or unclear naming, misleading or stale comments, unexplained magic values, inappropriate abstractions, and missing tests. Classify them as Low when they create no immediate bug or material risk, and raise severity only when supported by concrete maintenance or failure impact.
- Do not turn personal stylistic preference into a finding; identify the violated repository/language convention or explain why the code-quality issue is genuine.
- Do not request broad rewrites when a local fix is sufficient.
- Treat "modern practice" as version- and repository-specific; support it with authoritative evidence.
- Keep the whole response compact. A developer must be able to locate, understand, reproduce, and resolve every finding without asking what it means.
