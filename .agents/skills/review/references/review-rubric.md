# Review rubric

Apply every section to changed behavior. Report only genuine issues with evidence. For a Low finding, a specific readability, consistency, maintainability, or test-coverage deficiency is sufficient even when it creates no immediate failure risk.

## Severity

- **Critical**: The change can cause data loss or corruption, a severe exploitable security failure, widespread outage, unrecoverable state, or a build/deployment failure that blocks all intended use. It must be fixed before merge when a fix is available, and must always be reported even when no direct remediation is currently known or within the developer's control.
- **Important**: The change causes incorrect behavior on a realistic path, breaks a public or repository contract, creates a meaningful security or performance risk, or introduces a structural violation likely to cause defects. It normally must be fixed before merge.
- **Mid**: The change has a bounded edge-case defect or a concrete maintainability, testability, readability, or design cost that should be addressed but is unlikely to block the main path.
- **Low**: Optional, localized improvement with a small but real benefit, including incorrect or unclear naming, misleading or stale comments, unexplained magic values, inappropriate abstraction, or missing tests when no immediate bug or material risk is evident. It is explicitly nice to do and not required for correctness.

Classify by impact and likelihood, not by the size of the edit. Report genuine missing-test and code-quality issues as Low by default when no immediate risk is evident; raise them when unprotected behavior or maintenance impact justifies it. Do not report personal style preferences—show the repository/language convention or the specific quality deficiency.

## Correctness and reliability

- Validate normal, boundary, empty, null/missing, malformed, error, cancellation, retry, and recovery paths that are relevant to the change.
- Check invariants, ordering, state transitions, lifecycle, initialization, cleanup, ownership, resource disposal, concurrency, reentrancy, and idempotency.
- Check off-by-one errors, wrong conditions, stale state, partial updates, precision/overflow, time zones, locale/encoding, nondeterminism, and exception handling.
- Follow data across serialization, persistence, migrations, caches, queues, network boundaries, and API contracts.
- Confirm deleted or renamed symbols, files, configuration, assets, and registrations have no remaining consumers.

## Security and privacy

- Check trust boundaries, input validation, authorization versus authentication, secret exposure, unsafe data handling, insecure randomness, logging of sensitive data, and dependency or configuration changes.
- Demand a plausible attack or exposure path. Avoid generic security warnings.

## Performance and scalability

- Look for algorithmic regressions, blocking work on latency-sensitive threads, avoidable allocations, unbounded growth, leaked resources, excessive I/O, and changed hot paths.
- Distinguish measured or structurally evident problems from speculative micro-optimizations. Request benchmarks or profiling only where they can decide a material risk.

## Design and repository fit

- Verify the folder, namespace/module, assembly/package, layer, ownership boundary, and dependency direction against repository patterns.
- Apply functional principles where the code is function-oriented: explicit data flow, controlled side effects, immutability where useful, composable units, and deterministic behavior.
- Apply object-oriented principles where the code is object-oriented: cohesive responsibilities, valid encapsulation, substitutable contracts, appropriate interfaces, and dependency direction.
- Prefer the paradigm and abstraction level already appropriate to the surrounding code. Do not demand functional or object-oriented purity.
- Flag duplication, dead code, premature abstraction, excessive coupling, or misplaced responsibility only when the consequence is concrete.

## Readability and maintainability

- Flag incorrect, unclear, or convention-breaking names. Use Low when the issue is limited to clarity or consistency.
- Flag misleading, stale, contradictory, or necessary-but-missing comments. Use Low when the issue does not change runtime behavior.
- Check complexity, nesting, function/class size, hidden control flow, inappropriate abstraction, and unclear error semantics.
- Flag magic values when a literal hides domain meaning, units, constraints, configuration, or a value that should be named or centralized. Do not misclassify self-evident local literals as magic values.
- Check that constants, configuration, and feature flags live at the appropriate scope and have correct units and names.
- Prefer code that is easy to delete, test, and change; avoid subjective rewrites with no measurable benefit.

## Language, framework, and compatibility

- Identify versions from repository files before applying current guidance.
- Check framework lifecycle rules, threading models, ownership APIs, deprecations, platform restrictions, and idiomatic resource handling.
- Check source, binary, API, schema, save-data, configuration, deployment, and backward compatibility where relevant.
- Use primary documentation for claims about language or framework behavior.

## Tests and observability

- Confirm tests assert externally meaningful behavior and would fail for the suspected regression.
- Flag missing tests for changed behavior as Low when no immediate risk is evident. Raise severity for unprotected high-risk, boundary, failure, or regression behavior. Also check brittle timing, false positives, shared-state leakage, and assertions that do not exercise the change.
- Check logs, metrics, traces, diagnostics, and error messages only where the changed operational behavior needs them.
- Never claim verification that was not actually run; distinguish inspection from execution.

## Finding acceptance test

For Important, Mid, and Low findings, keep a finding only when all answers are yes:

1. Is it introduced or materially worsened by the reviewed change?
2. Is there a specific code location and an explainable failure, maintenance cost, clarity/consistency defect, or test-coverage gap?
3. Does surrounding code fail to mitigate it?
4. Is the severity supported by realistic impact and likelihood?
5. Is there a practical fix or investigation path?
6. If the claim depends on a rule or API behavior, is there an authoritative repository or external reference?

For a Critical finding, require yes answers to 1-4 and 6, but do not discard it when question 5 is no. State that no practical fix is currently known, explain the limitation, and provide any available containment, escalation, investigation, or verification path.
