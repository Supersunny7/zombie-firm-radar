# Table Caption Data Source Fix Bugfix Design

## Overview

The Table view caption is hardcoded to "Firms from SEC EDGAR filings. Sort by activating a column header." in `TableDialog`. When the app runs on mock or fixture data, every firm is fictional, so the caption wrongly claims SEC EDGAR as the source. The loader already stores the origin in `data.source` (`real`, `mock` or `fixture`) and the HUD reads it; the table does not.

The fix is small and local to `web/src/ui/table/TableView.tsx`. `TableDialog` reads `data.source` from the zustand store and derives the caption with a pure helper, `captionFor(source)`. Mock and fixture sources get "Fictional firms (mock data). Sort by activating a column header." Everything else keeps the existing SEC EDGAR caption. No other file, data contract, schema or type changes.

A working-tree draft of the fix and its tests already exists (`TableView.tsx` and `TableView.test.tsx`). This design reviews that draft and treats it as the intended implementation. This phase does not edit source or test files.

## Glossary

- **Bug_Condition (C)**: The Table view is open and `Data_Source` is `mock` or `fixture`.
- **Property (P)**: The caption reads "Fictional firms (mock data). Sort by activating a column header." and does not contain "SEC EDGAR".
- **Preservation**: For `real` data the caption stays exactly as before. Sorting, announcements, focus trap, selection rules, the footer notice and axe results do not change.
- **TableDialog**: The component in `web/src/ui/table/TableView.tsx` that renders the table, caption, sort state and live message.
- **captionFor**: The new pure helper in `TableView.tsx` that maps a `DataSource | null` to the caption text.
- **Data_Source / data.source**: The `DataSource` union (`'real' | 'mock' | 'fixture'`) from `web/src/data/source.ts`, stored at `useStore().data.source`.

## Bug Details

### Bug Condition

The bug appears whenever the Table view is open and the loaded data is not real. `TableDialog` renders a string literal inside `<caption>` and never subscribes to `data.source`, so the caption cannot change with the source. The lights mode has no effect on it, so the defect is identical in lights off and lights on.

**Formal Specification:**
```
FUNCTION isBugCondition(X)
  INPUT: X of type TableViewState { dataSource: 'real' | 'mock' | 'fixture', mode: 'lights_off' | 'lights_on' }
  OUTPUT: boolean

  RETURN X.dataSource IN { 'mock', 'fixture' }
END FUNCTION
```

**Expected behavior specification:**
```
FUNCTION expectedBehavior(caption)
  INPUT: caption of type string (text of the table's <caption>)
  OUTPUT: boolean

  RETURN caption = "Fictional firms (mock data). Sort by activating a column header."
         AND "SEC EDGAR" NOT IN caption
END FUNCTION
```

### Examples

- `source = 'mock'`, lights off: expected "Fictional firms (mock data). Sort by activating a column header."; actual "Firms from SEC EDGAR filings. ..." (bug).
- `source = 'fixture'` (`pnpm dev` with no `/data/mock`): same expected and actual as above (bug).
- `source = 'mock'`, lights on: same wrong caption as lights off (bug), and the same corrected caption after the fix.
- `source = 'real'`: "Firms from SEC EDGAR filings. Sort by activating a column header." both before and after (not buggy).
- Edge case: `data` is `null` (not loaded). `source` resolves to `null` and the caption falls back to the SEC EDGAR text, same as before. See the review notes below.

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Real data shows the SEC EDGAR caption, identical in lights off and lights on.
- Activating a column header sorts the rows and announces the sort; the caption still ends in "Sort by activating a column header."
- Opening, closing, focus trap, Escape to close, selection only in the graveyard, row contents and columns.
- The footer notice "Data: SEC EDGAR. Not investment advice." and the HUD data-source label.
- No axe violations.

**Scope:**
All inputs where `Data_Source` is `real` are unaffected. So is every interaction other than reading the caption: sorting, selection, open and close, keyboard handling and the HUD.

## Hypothesized Root Cause

The root cause is confirmed by the code and by the failing test on HEAD, not just hypothesized:

1. **Hardcoded caption**: `TableDialog` renders a literal string in `<caption>` instead of deriving it from state.
2. **No store subscription to source**: `TableDialog` selects `s.data?.index.firms` but not `s.data?.source`, so the component has no input that could change the caption.
3. **Origin not threaded to presentation**: the loader and HUD handle `data.source`, but the table was written assuming real data only.

Ruled out: the loader setting the wrong `source` (the HUD reads the same field correctly) and a lights-mode dependency (the caption never reads the mode).

## Correctness Properties

Property 1: Bug Condition - Caption follows the Data_Source

_For any_ Table view state where the bug condition holds (`dataSource` is `mock` or `fixture`, in lights off or lights on), the fixed `TableDialog` SHALL render the caption "Fictional firms (mock data). Sort by activating a column header." and the table text SHALL NOT contain "SEC EDGAR".

**Validates: Requirements 2.1, 2.2, 2.3, 2.4**

Property 2: Preservation - Real data and all other behavior unchanged

_For any_ Table view state where the bug condition does NOT hold (`dataSource` is `real`), the fixed `TableDialog` SHALL render the same caption as the original, "Firms from SEC EDGAR filings. Sort by activating a column header.", in both lights modes, and sorting, announcements, focus handling, selection rules, the footer notice and the axe result SHALL stay as before.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

## Fix Implementation

### Changes Required

**File**: `web/src/ui/table/TableView.tsx`

**Function**: `TableDialog` (plus one new module-level helper)

**Specific Changes**:
1. **Import the type**: `import type { DataSource } from '../../data/source';`. Type-only, so there is no runtime dependency on the data module.
2. **Add the caption helper**: a pure `captionFor(source: DataSource | null): string` returns the fictional caption for `mock` and `fixture` and the SEC EDGAR caption otherwise. A shared `SORT_HINT` constant keeps the "Sort by activating a column header." suffix identical in both branches (requirement 3.3).
3. **Read the source from the store**: `const source = useStore((s) => s.data?.source ?? null);` in `TableDialog`. This is a primitive selector, so it triggers a re-render only when the source changes.
4. **Render the derived caption**: replace the literal with `{captionFor(source)}`. The `<caption>` element and its class are unchanged.

No changes to the store, loader, data contract, JSON Schemas or `web/src/types`, so the data-contract rule is not triggered. The change is under `web/src/ui`, not `scenes` or `fx`, so no scene-critic check is needed.

### Review Notes on the Draft

- The draft matches the planned fix. The diff is minimal and the caption strings match requirements 2.1 and 3.1 exactly.
- Unknown or null source falls back to the SEC EDGAR caption. This preserves HEAD behavior. `TableDialog` can only appear with loaded data in practice, so this is acceptable. If a "no data" state ever becomes reachable, a neutral caption would be safer than claiming EDGAR.
- `captionFor` is not exported. The tests assert through the rendered DOM, which is the behavior users see, so exporting is not needed.
- The draft tests do not toggle lights on and lights off. That is acceptable because the caption never reads the mode; see the optional coverage note in the Testing Strategy.

## Testing Strategy

### Validation Approach

Tests live in `web/src/ui/table/TableView.test.tsx` (Vitest, Testing Library, fast-check). They render `TableView`, set the store's `data.source`, open the overlay, and assert on the rendered `<caption>`. The core requirement is that the new tests fail on the original `TableView.tsx` and pass on the fixed one.

### Exploratory Bug Condition Checking

**Goal**: Show the bug on unfixed code and confirm the root cause (hardcoded caption, no source subscription).

**Test Plan**: Run the draft tests against the original HEAD `TableView.tsx`, for example in a temporary git worktree with only the draft test file copied over, so the working tree is not touched.

**Test Cases**:
1. **Mock and fixture property test**: for `source` in `{mock, fixture}`, expect the fictional caption and no "SEC EDGAR" in the table text (fails on unfixed code).
2. **Real data test**: expect the SEC EDGAR caption (passes on unfixed code, as a control).

**Expected Counterexamples**:
- Recorded result from the bug analysis: 1 of 15 tests failed on HEAD. The property test found the hardcoded SEC EDGAR caption for `mock` (the first generated value), and the real-data test passed.
- This confirms the cause is the hardcoded caption and not state wiring.

### Fix Checking

**Goal**: For every state where the bug condition holds, the fixed component renders the expected caption.

**Pseudocode:**
```
FOR ALL X WHERE isBugCondition(X) DO
  caption := renderedCaption(TableDialog_fixed, X)
  ASSERT expectedBehavior(caption)
END FOR
```

### Preservation Checking

**Goal**: For every state where the bug condition does not hold, the fixed component matches the original.

**Pseudocode:**
```
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT renderedCaption(TableDialog_original, X) = renderedCaption(TableDialog_fixed, X)
END FOR
```

**Testing Approach**: Property-based testing fits the source domain well, but it has only three values, so it is exhaustive here. The existing 13 `TableView` tests already cover the rest of the behavior (sorting, announcements, focus trap, Escape, selection, axe) and act as the regression net.

**Test Plan**: Run the full existing `TableView` suite on the fixed code and confirm it is unchanged and green. The real-data test passes both before and after, which shows preservation of the caption.

**Test Cases**:
1. **Real caption preserved**: with `source = 'real'`, the SEC EDGAR caption is present.
2. **Existing sort tests**: sorting and the live announcement still work with the new caption.
3. **Existing axe test**: no violations, since `<caption>` stays the first child of `<table>`.
4. **Existing open/close/focus/selection tests**: unchanged.

### Unit Tests

- Fixture and mock sources show the fictional caption and no "SEC EDGAR" in the table text.
- Real source shows the SEC EDGAR caption.
- Optional: assert the caption's trailing hint is identical for all three sources.

### Property-Based Tests

- `fc.constantFrom('mock', 'fixture')` with `numRuns: 10`: caption equals the fictional text and the table text does not contain "SEC EDGAR". The test calls `cleanup()` and `reset()` per run so iterations do not leak DOM or store state.
- Optional: extend the property to `fc.constantFrom('real', 'mock', 'fixture')` with an expected-caption lookup, to cover Property 2 in the same test.

### Integration Tests

- Render `TableView` with the store set to each source, toggle the overlay, and read the caption through the accessible table role (done by the draft).
- Optional: repeat the mock and fixture check in lights off and lights on (requirements 2.3 and 3.2). The caption does not read the mode, so this is a guard against future coupling, not a fix requirement.
- Full gate before commit: `pnpm typecheck; pnpm lint; pnpm format; pnpm test; pnpm build` from `web`. Commit scope: `fix(table-caption-data-source-fix): ...`.
