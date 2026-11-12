# Bugfix Requirements Document

## Introduction

The Table view (the accessible table alternative to the graveyard) shows the caption "Firms from SEC EDGAR filings. Sort by activating a column header." regardless of where the data came from. When the app runs on mock data (no `/data` real files, `/data/mock` served) or on the built-in fixture bundle, every firm is fictional, so the caption wrongly claims SEC EDGAR as the source. This breaks the product rule that figures stay traceable to filings and that theming or labels never mislead about the data. The loader already records the origin in `data.source` (`real`, `mock` or `fixture`) and the HUD already reads it; the table caption does not. The defect appears identically in lights off and lights on.

Reproduction: run `pnpm dev` with no `/data/mock` available, then open the Table view.

Evidence gathered before writing this spec: the working tree contains an unreviewed draft of a fix in `web/src/ui/table/TableView.tsx` and `web/src/ui/table/TableView.test.tsx`. The draft test was run against the original (HEAD) `TableView.tsx` in a temporary worktree. The property test for mock and fixture sources fails there (1 of 15 tests failed: the caption was the hardcoded SEC EDGAR text), and the test for real data passes. So the draft test does detect the bug on the original code. The draft is still unreviewed and is not part of this document.

Bug condition (C): the Table view is open and `Data_Source` is `mock` or `fixture`.

```pascal
FUNCTION isBugCondition(X)
  INPUT: X of type TableViewState { dataSource: 'real' | 'mock' | 'fixture', mode: 'lights_off' | 'lights_on' }
  OUTPUT: boolean

  RETURN X.dataSource IN { 'mock', 'fixture' }
END FUNCTION
```

```pascal
// Property: Fix Checking - caption follows the Data_Source
FOR ALL X WHERE isBugCondition(X) DO
  caption ← tableCaption'(X)
  ASSERT caption = "Fictional firms (mock data). Sort by activating a column header."
     AND "SEC EDGAR" NOT IN caption
END FOR
```

```pascal
// Property: Preservation Checking
FOR ALL X WHERE NOT isBugCondition(X) DO
  ASSERT tableCaption(X) = tableCaption'(X)
END FOR
```

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN the Table view is open and `Data_Source` is `mock` THEN the system shows the caption "Firms from SEC EDGAR filings. Sort by activating a column header.", wrongly presenting fictional firms as SEC EDGAR data

1.2 WHEN the Table view is open and `Data_Source` is `fixture` THEN the system shows the caption "Firms from SEC EDGAR filings. Sort by activating a column header.", wrongly presenting fictional firms as SEC EDGAR data

1.3 WHEN the Table view is open with mock or fixture data in either lights off or lights on mode THEN the system shows the same incorrect SEC EDGAR caption, because the caption is hardcoded and never reads `data.source` from the store

### Expected Behavior (Correct)

2.1 WHEN the Table view is open and `Data_Source` is `mock` THEN the system SHALL show the caption "Fictional firms (mock data). Sort by activating a column header."

2.2 WHEN the Table view is open and `Data_Source` is `fixture` THEN the system SHALL show the caption "Fictional firms (mock data). Sort by activating a column header."

2.3 WHEN the Table view is open with mock or fixture data in either lights off or lights on mode THEN the system SHALL show the same fictional-data caption in both modes, and the caption SHALL NOT contain the text "SEC EDGAR"

2.4 WHEN the regression test for this bug is run against the original, unfixed `TableDialog` THEN the test SHALL fail for `mock` and `fixture` sources, and WHEN it is run against the fixed code THEN it SHALL pass for `mock`, `fixture` and `real` sources

### Unchanged Behavior (Regression Prevention)

3.1 WHEN the Table view is open and `Data_Source` is `real` THEN the system SHALL CONTINUE TO show the caption "Firms from SEC EDGAR filings. Sort by activating a column header."

3.2 WHEN the Table view is open with real data in lights off or lights on mode THEN the system SHALL CONTINUE TO show identical caption text in both modes

3.3 WHEN the user activates a column header THEN the system SHALL CONTINUE TO sort the rows and announce the sort, with the caption still ending in "Sort by activating a column header."

3.4 WHEN the Table view is opened, closed, or its rows are selected THEN the system SHALL CONTINUE TO behave as before (focus trap, Escape to close, selection only in the graveyard, row contents and columns unchanged)

3.5 WHEN the Table view is open with any `Data_Source` THEN the system SHALL CONTINUE TO leave the HUD footer notice "Data: SEC EDGAR. Not investment advice." unchanged and have no accessibility violations reported by axe

3.6 WHEN the HUD reads `data.source` THEN the system SHALL CONTINUE TO show the HUD data-source label exactly as before
