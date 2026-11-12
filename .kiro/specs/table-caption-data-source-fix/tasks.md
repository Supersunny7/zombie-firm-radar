# Implementation Plan

Note: a working-tree draft of the fix and test already exists (`web/src/ui/table/TableView.tsx`, `web/src/ui/table/TableView.test.tsx`). These tasks review and verify it. Do not edit source or test files unless a review finding requires it and the user agrees. Run commands from `web` in PowerShell, chained with `;`.

- [x] 1. Write bug condition exploration test (review the existing draft test)
  - **Property 1: Bug Condition** - Caption follows the Data_Source
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **GOAL**: Confirm the draft test in `web/src/ui/table/TableView.test.tsx` encodes the expected behavior and detects the bug on HEAD
  - Review the draft test: for `fc.constantFrom('mock', 'fixture')` (`numRuns: 10`) it sets `data.source`, opens the overlay, and expects the caption "Fictional firms (mock data). Sort by activating a column header." and no "SEC EDGAR" in the table text
  - Check that `cleanup()` and `reset()` run per property iteration so DOM and store state do not leak
  - Run the draft test against the original HEAD `TableView.tsx` without touching the working tree: create a temporary git worktree at HEAD, copy only the draft `TableView.test.tsx` into it, link or install dependencies, then run `pnpm vitest run src/ui/table/TableView.test.tsx`
  - **EXPECTED OUTCOME**: Test FAILS (1 of 15 tests: hardcoded SEC EDGAR caption for `mock`); the `real` caption test passes as a control
  - Document the counterexample, then remove the temporary worktree (`git worktree remove`)
  - _Requirements: 1.1, 1.2, 1.3, 2.4_

- [x] 2. Write preservation property tests (BEFORE verifying the fix)
  - **Property 2: Preservation** - Real data and all other behavior unchanged
  - **IMPORTANT**: Follow observation-first methodology
  - Observe on HEAD (same temporary worktree as task 1): with `source = 'real'` the caption is "Firms from SEC EDGAR filings. Sort by activating a column header."
  - Observe on HEAD: the other 13 existing `TableView` tests (sorting, announcements, focus trap, Escape, selection, axe) pass
  - Confirm the draft test file keeps the real-data caption test and does not alter the existing 13 tests
  - **EXPECTED OUTCOME**: Real-data test and the 13 existing tests PASS on HEAD (baseline to preserve)
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 3. Fix for hardcoded Table view caption

  - [x] 3.1 Review the draft fix in `web/src/ui/table/TableView.tsx`
    - Confirm `import type { DataSource } from '../../data/source';` is type-only
    - Confirm the pure helper `captionFor(source: DataSource | null): string` returns the fictional caption for `mock` and `fixture` and the SEC EDGAR caption otherwise
    - Confirm a shared `SORT_HINT` constant keeps the "Sort by activating a column header." suffix identical in both branches
    - Confirm `TableDialog` reads `useStore((s) => s.data?.source ?? null)` and renders `{captionFor(source)}`; `<caption>` element and class are unchanged and it is still the first child of `<table>`
    - Confirm the diff touches only `TableView.tsx` and its test (no store, loader, data contract, JSON Schema or `web/src/types` changes)
    - Confirm caption strings match requirements 2.1 and 3.1 exactly
    - Note the accepted null-source fallback to the SEC EDGAR caption (same as HEAD)
    - _Bug_Condition: isBugCondition(X) where X.dataSource IN { 'mock', 'fixture' }_
    - _Expected_Behavior: caption = "Fictional firms (mock data). Sort by activating a column header." AND "SEC EDGAR" NOT IN caption_
    - _Preservation: real data caption, sorting, announcements, focus trap, selection, footer notice, axe unchanged_
    - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Caption follows the Data_Source
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - From `web`, run `pnpm vitest run src/ui/table/TableView.test.tsx` against the working-tree fix
    - **EXPECTED OUTCOME**: Test PASSES for `mock` and `fixture` (confirms bug is fixed)
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Real data and all other behavior unchanged
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Confirm the real-data caption test and all 13 existing `TableView` tests pass on the fix (15 of 15 in the file)
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 4. Extra coverage (user approved editing the test file)
  - [x] 4.1 Check lights off and lights on
    - Repeat the mock and fixture caption check, and the real caption check, in both lights modes
    - The caption never reads the mode, so this guards against future coupling
    - _Requirements: 2.3, 3.2_

  - [x] 4.2 Check all three sources in one property
    - Extend the property to `fc.constantFrom('real', 'mock', 'fixture')` with an expected-caption lookup
    - Optionally assert the trailing "Sort by activating a column header." hint is identical for all sources
    - _Requirements: 2.1, 2.2, 3.1, 3.3_

- [x] 5. Run the full check
  - From `web`, run: `pnpm typecheck; pnpm lint; pnpm format; pnpm test; pnpm build`
  - Fix any failure at its root cause; if a format check fails, `pnpm format:write` may be used on the two touched files only
  - Commit (only when the user asks) with scope: `fix(table-caption-data-source-fix): show fictional-data caption for mock and fixture sources`
  - _Requirements: 2.4, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks 4.1 and 4.2 were optional and are now required; the user approved editing the test file
- Each task references specific requirements for traceability
- Source and test files are not edited in this phase; tasks review and verify the existing draft
- Temporary git worktrees used for the HEAD run must be removed afterwards

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1", "2"] },
    { "id": 1, "tasks": ["3.1"] },
    { "id": 2, "tasks": ["3.2", "3.3", "4.1", "4.2"] },
    { "id": 3, "tasks": ["5"] },
    { "id": 4, "tasks": ["6"] }
  ]
}
```
