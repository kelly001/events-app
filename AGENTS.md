# AI Assistant and Agent Workflow

These instructions apply to every AI assistant and agent working in this repository.

## Phase and milestone implementation

When starting implementation of a project phase or milestone:

1. Read the relevant implementation plan, current progress notes, repository instructions, and affected code before making changes.
2. Before implementation begins, create and switch to a dedicated new Git branch for that phase or milestone. Use the `codex/` branch prefix unless the user explicitly requests another name or branch.
3. Implement the documented work packages or workstreams sequentially. Complete and verify one package before starting the next. Do not parallelize work packages.
4. Pause only when manual testing, approval, credentials, external access, or user input is genuinely required to continue safely. Clearly report what is needed and resume from the same work package afterward.
5. Continue through the final work package, including the usual validation, cleanup, progress-note, and implementation-plan updates. Do not stop after only the main code changes.
6. Run all validation required by the plan and repository, including relevant tests, type checking, linting, builds, and focused manual or integration checks when available.
7. After the final work package and validation, run the repository's `review-branch` skill against the intended base branch.
8. Fix every actionable review finding within the phase scope, rerun affected validation, and repeat the review when needed until no actionable findings remain.
9. Commit all changes belonging to the phase or milestone to its dedicated branch. Preserve unrelated user changes and do not include them in the commits.
10. Push all phase or milestone commits to the corresponding remote branch.
11. Report the completed work, validation results, review outcome, branch name, commits, and any remaining manual checks or known limitations. Then wait for further user input.

Do not merge the branch, open a pull request, deploy, or begin the next phase unless the user explicitly requests it.
