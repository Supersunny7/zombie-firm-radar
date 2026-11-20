# Tag census FY2024

Data: SEC EDGAR. Not investment advice.

This file changes nothing. It shows which XBRL tags the core firms that miss a value in the year do report, so the tag lists can be chosen from facts. It describes the panel as it was when the census ran.

## Source

Run date: 2026-11-20

- `companyfacts.zip`: downloaded 2026-11-20T19:31:19.182033+00:00, 1,428,741,488 bytes, SHA-256 `5ae31e097c67fd5b6febb55ea3bcea83bb1f806f92dd5553ce1e486cf8ee1ff6`, Last-Modified Fri, 20 Nov 2026 04:52:50 GMT
- `submissions.zip`: downloaded 2026-11-20T19:31:19.182033+00:00, 1,577,210,152 bytes, SHA-256 `2697889219e852d4e9f0f1fcfb97a5fc53cf0d8fb06eaa87fa94efac228edae0`, Last-Modified Fri, 20 Nov 2026 05:00:09 GMT

## Population and method

- Census population: core firms (not financial, not utility, age at FY2024 of 10 or more) with a present FY2024 row: **2565**.
- Missing total_debt in the panel: **1148**.
- Missing revenue in the panel: **410**.
- Missing interest_expense in the panel: **820**.
- A firm *reports* a tag when the tag has an annual-form (10-K, 10-K/A) USD value for the firm's fiscal year: a flow of 350 to 380 days ending on the fiscal year end, or a balance-sheet value within 7 days of it. These are the extractor's rules.
- Tags are those on Frank's list (`candidate`), the tags in the priority list when the census ran (`existing`), and tags whose names match a keyword pattern and are not obviously something else (`found by name`). The keyword patterns are heuristics: expect some noise.
- `firms_missing_field_reporting` counts firms that miss the field in the panel and report the tag. `both_reported`, `within_1pct`, `tag_below_panel` and `tag_above_panel` are measured on all census firms that have a panel value and also report the tag: they show whether the tag is the same number as the existing value (within 1%), a part of it (below) or something larger (above).
- `existing` tags can still show firms missing the field: their value was rejected by a rule (for example two different periods on the same end date).
- Members read: 2565; not selected: 18041; parse failures: 0.

## Total debt

1148 census firms miss total_debt.

### Top 30 tags reported by those firms

| tag | status | firms_missing_field_reporting | share_of_missing | firms_reporting_all | both_reported | within_1pct | tag_below_panel | tag_above_panel |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| NotesPayableCurrent | candidate | 140 | 12.2% | 234 | 90 | 11 | 69 | 10 |
| LongTermDebtAndCapitalLeaseObligations | candidate | 108 | 9.4% | 318 | 205 | 44 | 91 | 70 |
| LongTermDebtAndCapitalLeaseObligationsCurrent | candidate | 87 | 7.6% | 258 | 168 | 16 | 128 | 24 |
| ConvertibleNotesPayableCurrent | found by name | 81 | 7.1% | 128 | 44 | 4 | 27 | 13 |
| NotesPayable | candidate | 79 | 6.9% | 144 | 63 | 25 | 26 | 12 |
| LongTermNotesPayable | candidate | 74 | 6.4% | 152 | 76 | 7 | 60 | 9 |
| LinesOfCreditCurrent | candidate | 64 | 5.6% | 145 | 77 | 2 | 62 | 13 |
| ConvertibleDebtCurrent | found by name | 60 | 5.2% | 99 | 37 | 1 | 25 | 11 |
| LineOfCredit | found by name | 58 | 5.1% | 155 | 97 | 9 | 74 | 14 |
| ConvertibleNotesPayable | candidate | 54 | 4.7% | 77 | 22 | 1 | 8 | 13 |
| DebtCurrent | candidate | 52 | 4.5% | 232 | 177 | 10 | 149 | 18 |
| DebtAndCapitalLeaseObligations | found by name | 50 | 4.4% | 132 | 79 | 34 | 8 | 37 |
| ConvertibleLongTermNotesPayable | found by name | 46 | 4.0% | 77 | 29 | 3 | 19 | 7 |
| DebtInstrumentCarryingAmount | candidate | 45 | 3.9% | 593 | 537 | 236 | 63 | 238 |
| ConvertibleDebtNoncurrent | found by name | 42 | 3.7% | 72 | 28 | 8 | 17 | 3 |
| LoansPayableCurrent | found by name | 41 | 3.6% | 88 | 44 | 6 | 33 | 5 |
| LongTermLineOfCredit | found by name | 36 | 3.1% | 97 | 59 | 8 | 46 | 5 |
| ConvertibleDebt | found by name | 29 | 2.5% | 49 | 20 | 0 | 13 | 7 |
| DebtLongtermAndShorttermCombinedAmount | found by name | 23 | 2.0% | 151 | 124 | 78 | 6 | 40 |
| LongTermLoansPayable | found by name | 23 | 2.0% | 69 | 44 | 8 | 28 | 8 |
| LoansPayable | found by name | 23 | 2.0% | 55 | 30 | 12 | 11 | 7 |
| OtherNotesPayableCurrent | found by name | 21 | 1.8% | 31 | 10 | 1 | 9 | 0 |
| SecuredDebtCurrent | found by name | 20 | 1.7% | 38 | 18 | 1 | 16 | 1 |
| SecuredLongTermDebt | found by name | 19 | 1.7% | 48 | 27 | 7 | 18 | 2 |
| OtherLongTermDebtNoncurrent | found by name | 16 | 1.4% | 43 | 26 | 3 | 22 | 1 |
| OtherLongTermDebt | candidate | 15 | 1.3% | 66 | 51 | 0 | 47 | 4 |
| OtherNotesPayable | found by name | 15 | 1.3% | 28 | 12 | 0 | 8 | 4 |
| OtherLongTermNotesPayable | found by name | 15 | 1.3% | 19 | 4 | 0 | 4 | 0 |
| SeniorLongTermNotes | found by name | 14 | 1.2% | 27 | 13 | 2 | 10 | 1 |
| LiabilitiesOtherThanLongtermDebtNoncurrent | found by name | 13 | 1.1% | 22 | 9 | 0 | 7 | 2 |

### Named candidates and the tags in use, with double-count notes

| tag | status | firms_missing_field_reporting | firms_reporting_all | double_count_note |
| --- | --- | --- | --- | --- |
| NotesPayableCurrent | candidate | 140 | 234 | Current notes payable. Overlaps ShortTermBorrowings, DebtCurrent and LongTermDebtCurrent. Fallback only. |
| LongTermDebtAndCapitalLeaseObligations | candidate | 108 | 318 | Noncurrent debt including finance leases. Same role as LongTermDebtNoncurrent: use instead of it, never both. May include leases that tag excludes. |
| LongTermDebtAndCapitalLeaseObligationsCurrent | candidate | 87 | 258 | Current debt including finance leases. Same role as LongTermDebtCurrent: instead of it, never both. |
| NotesPayable | candidate | 79 | 144 | Notes payable, current and noncurrent as the filer shows them. Overlaps every other debt tag. Fallback only. |
| LongTermNotesPayable | candidate | 74 | 152 | Noncurrent notes payable. Same role as LongTermDebtNoncurrent when a filer lacks that tag; a component of it if both exist. |
| LinesOfCreditCurrent | candidate | 64 | 145 | Drawn lines of credit due within a year. A component of ShortTermBorrowings and DebtCurrent. |
| ConvertibleNotesPayable | candidate | 54 | 77 | Convertible notes. A component of long-term debt: add only when no parent tag exists. |
| DebtCurrent | candidate | 52 | 232 | All debt due within a year (short-term borrowings plus the current portion of long-term debt). Overlaps LongTermDebtCurrent and ShortTermBorrowings: use instead of them, never on top. |
| DebtInstrumentCarryingAmount | candidate | 45 | 593 | Carrying amount of debt instruments, often one table of a note. May overlap every other tag. Last fallback only. |
| OtherLongTermDebt | candidate | 15 | 66 | Other long-term debt. A component when the filer shows classes, the whole amount for a small filer. |
| SecuredDebt | candidate | 9 | 23 | Secured debt, one class. A component of LongTermDebt: double counts if added to a parent. |
| CommercialPaper | candidate | 7 | 50 | Commercial paper outstanding. A component of ShortTermBorrowings and DebtCurrent. |
| SeniorNotes | candidate | 7 | 32 | Senior notes, one class of debt. A component of LongTermDebt: double counts if added to a parent. |
| LongTermDebt | existing | 0 | 997 | Total long-term debt, usually including the current portion. Used only when no part exists, so it cannot double count. |
| LongTermDebtNoncurrent | existing | 0 | 992 | Long-term debt without the current portion. Part of today's sum. |
| LongTermDebtCurrent | existing | 0 | 803 | Current portion of long-term debt. Part of today's sum. |
| ShortTermBorrowings | existing | 0 | 247 | Bank loans, commercial paper and lines of credit due within a year. Part of today's sum. |

### Firms missing total debt that report no debt-like tag

Of the 1148 firms, **383** report no debt-like tag at all (not on the list and no keyword match) and have FY2024 interest expense of 0 or missing: these are **likely debt-free, not missing data**. The second pair of columns uses only the named tags.

| interest_expense_fy2024 | no_debt_like_tag | reports_a_debt_like_tag | no_named_debt_tag | reports_a_named_debt_tag |
| --- | --- | --- | --- | --- |
| zero | 21 | 11 | 27 | 5 |
| missing | 362 | 176 | 428 | 110 |
| positive | 144 | 415 | 269 | 290 |
| negative | 13 | 6 | 15 | 4 |

Firms with **positive interest expense and no debt-like tag**: 144 (`tag_census_positive_interest_no_debt_tag.csv`).

## Revenue

410 census firms miss revenue.

### Top 30 tags reported by those firms

| tag | status | firms_missing_field_reporting | share_of_missing | firms_reporting_all | both_reported | within_1pct | tag_below_panel | tag_above_panel |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RevenueFromContractWithCustomerIncludingAssessedTax | candidate | 195 | 47.6% | 350 | 151 | 104 | 41 | 6 |
| ExciseAndSalesTaxes | found by name | 14 | 3.4% | 37 | 23 | 0 | 22 | 1 |
| FairValueMeasurementWithUnobservableInputsReconciliationRecurringBasisAssetSales | found by name | 8 | 2.0% | 13 | 5 | 0 | 5 | 0 |
| RevenueNotFromContractWithCustomer | found by name | 2 | 0.5% | 38 | 36 | 1 | 35 | 0 |
| SalesCommissionsAndFees | found by name | 2 | 0.5% | 30 | 28 | 0 | 26 | 2 |
| RevenueFromCollaborativeArrangementExcludingRevenueFromContractWithCustomer | found by name | 2 | 0.5% | 10 | 8 | 3 | 5 | 0 |
| ResultsOfOperationsRevenueFromOilAndGasProducingActivities | found by name | 1 | 0.2% | 19 | 18 | 5 | 12 | 1 |
| DefinedBenefitPlanPurchasesSalesAndSettlements | found by name | 1 | 0.2% | 4 | 3 | 0 | 3 | 0 |
| RegulatedOperatingRevenueGas | found by name | 1 | 0.2% | 1 | 0 | 0 | 0 | 0 |
| RevenueFromContractWithCustomerExcludingAssessedTax | existing | 0 | 0.0% | 1534 | 1518 | 1424 | 73 | 21 |
| Revenues | existing | 0 | 0.0% | 906 | 850 | 850 | 0 | 0 |
| FairValueMeasurementWithUnobservableInputsReconciliationRecurringBasisLiabilityPurchasesSalesIssuancesSettlements | found by name | 0 | 0.0% | 7 | 7 | 0 | 7 | 0 |
| RevenueNotFromContractWithCustomerOther | found by name | 0 | 0.0% | 7 | 7 | 0 | 6 | 1 |
| FairValueMeasurementWithUnobservableInputsReconciliationRecurringBasisAssetPurchasesSalesIssuancesSettlements | found by name | 0 | 0.0% | 4 | 4 | 0 | 4 | 0 |
| DirectFinancingLeaseRevenue | found by name | 0 | 0.0% | 3 | 3 | 0 | 3 | 0 |
| FairValueMeasurementWithUnobservableInputsReconciliationRecurringBasisLiabilitySales | found by name | 0 | 0.0% | 3 | 3 | 0 | 3 | 0 |
| RegulatedOperatingRevenue | found by name | 0 | 0.0% | 3 | 3 | 3 | 0 | 0 |
| ResultsOfOperationsSalesRevenueToUnaffiliatedEnterprises | found by name | 0 | 0.0% | 3 | 3 | 2 | 1 | 0 |
| RevenuesNetOfInterestExpense | candidate | 0 | 0.0% | 3 | 3 | 0 | 2 | 1 |
| InsuranceServicesRevenue | found by name | 0 | 0.0% | 2 | 2 | 0 | 2 | 0 |
| NonmonetaryTransactionGrossOperatingRevenueRecognized | found by name | 0 | 0.0% | 2 | 2 | 0 | 2 | 0 |
| RevenuesExcludingInterestAndDividends | found by name | 0 | 0.0% | 2 | 2 | 2 | 0 | 0 |
| CapitalLeasesIncomeStatementLeaseRevenue | found by name | 0 | 0.0% | 1 | 1 | 0 | 1 | 0 |
| CustomerRefundableFeesRevenueRecognized1 | found by name | 0 | 0.0% | 1 | 1 | 0 | 1 | 0 |
| FairValueNetDerivativeAssetLiabilityMeasuredOnRecurringBasisUnobservableInputsReconciliationPurchasesSalesIssuesSettlements | found by name | 0 | 0.0% | 1 | 1 | 0 | 1 | 0 |
| FairValueNetDerivativeAssetLiabilityMeasuredOnRecurringBasisUnobservableInputsReconciliationSales | found by name | 0 | 0.0% | 1 | 1 | 0 | 1 | 0 |
| MarketDataRevenue | found by name | 0 | 0.0% | 1 | 1 | 0 | 1 | 0 |
| OperatingLeasesIncomeStatementLeaseRevenue | found by name | 0 | 0.0% | 1 | 1 | 0 | 1 | 0 |
| PropertyManagementFeeRevenue | found by name | 0 | 0.0% | 1 | 1 | 0 | 1 | 0 |
| RegulatedOperatingRevenueOther | found by name | 0 | 0.0% | 1 | 1 | 0 | 1 | 0 |

### Named candidates and the tags in use, with double-count notes

| tag | status | firms_missing_field_reporting | firms_reporting_all | double_count_note |
| --- | --- | --- | --- | --- |
| RevenueFromContractWithCustomerIncludingAssessedTax | candidate | 195 | 350 | Same concept as the ExcludingAssessedTax tag but with sales taxes included, so slightly higher. An alternative to it, never both. |
| RevenueFromContractWithCustomerExcludingAssessedTax | existing | 0 | 1534 | Revenue from contracts, without sales taxes. Second choice today. |
| Revenues | existing | 0 | 906 | Total revenue. First choice today. |
| RevenuesNetOfInterestExpense | candidate | 0 | 3 | Bank revenue after interest expense. A net tag, mainly financial firms, not comparable to gross revenue. |
| SalesRevenueGoodsNet | candidate | 0 | 0 | Revenue from goods only. A component: the total is goods plus services (SalesRevenueServicesNet), so one alone understates. |
| SalesRevenueNet | existing | 0 | 0 | Older total sales tag. Third choice today. |
| SalesRevenueServicesNet | candidate | 0 | 0 | Revenue from services only. A component, see SalesRevenueGoodsNet. |

### Check of the goods + services revenue rule

Core firms with no revenue in the panel, none of the first four revenue tags, and `SalesRevenueGoodsNet` and/or `SalesRevenueServicesNet`: **0** (both tags: 0; goods only: 0; services only: 0). The rule is adopted when either census year reaches 20.

## Interest expense

820 census firms miss interest_expense.

### Top 30 tags reported by those firms

| tag | status | firms_missing_field_reporting | share_of_missing | firms_reporting_all | both_reported | within_1pct | tag_below_panel | tag_above_panel |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| InterestPaidNet | candidate (report only) | 458 | 55.9% | 1938 | 1449 | 151 | 967 | 331 |
| FinanceLeaseInterestExpense | found by name | 141 | 17.2% | 665 | 523 | 9 | 505 | 9 |
| InterestPaid | found by name | 43 | 5.2% | 147 | 100 | 12 | 63 | 25 |
| DefinedBenefitPlanInterestCost | found by name | 41 | 5.0% | 174 | 133 | 0 | 117 | 16 |
| InterestExpenseOther | found by name | 40 | 4.9% | 126 | 83 | 18 | 53 | 12 |
| InterestExpenseOperating | candidate | 22 | 2.7% | 42 | 19 | 12 | 3 | 4 |
| FinancingInterestExpense | found by name | 10 | 1.2% | 27 | 16 | 3 | 4 | 9 |
| InterestCostsIncurred | candidate | 8 | 1.0% | 63 | 52 | 9 | 5 | 38 |
| InterestExpenseLongTermDebt | found by name | 7 | 0.9% | 21 | 14 | 0 | 11 | 3 |
| InterestExpenseBorrowings | found by name | 4 | 0.5% | 15 | 11 | 1 | 5 | 5 |
| InterestRevenueExpenseNet | found by name | 3 | 0.4% | 21 | 18 | 0 | 15 | 3 |
| DisposalGroupIncludingDiscontinuedOperationInterestExpense | found by name | 3 | 0.4% | 19 | 16 | 1 | 11 | 4 |
| InterestExpenseShortTermBorrowings | found by name | 3 | 0.4% | 9 | 6 | 0 | 5 | 1 |
| InterestExpenseOtherLongTermDebt | found by name | 1 | 0.1% | 5 | 4 | 0 | 4 | 0 |
| InterestPaidDiscontinuedOperations | found by name | 1 | 0.1% | 3 | 2 | 0 | 2 | 0 |
| RevenuesNetOfInterestExpense | found by name | 1 | 0.1% | 3 | 2 | 0 | 1 | 1 |
| DividendsAndInterestPaid | found by name | 1 | 0.1% | 2 | 1 | 0 | 1 | 0 |
| VariableInterestEntityActivityBetweenVIEAndEntityExpense | found by name | 1 | 0.1% | 2 | 1 | 0 | 0 | 1 |
| InterestExpenseNonoperating | existing | 0 | 0.0% | 1063 | 1042 | 1020 | 10 | 12 |
| InterestExpense | existing | 0 | 0.0% | 650 | 634 | 634 | 0 | 0 |
| InterestExpenseDebt | existing | 0 | 0.0% | 305 | 295 | 180 | 88 | 27 |
| InterestAndDebtExpense | existing | 0 | 0.0% | 91 | 89 | 57 | 19 | 13 |
| InterestExpenseDeposits | found by name | 0 | 0.0% | 3 | 3 | 1 | 2 | 0 |
| InterestExpenseSubordinatedNotesAndDebentures | found by name | 0 | 0.0% | 2 | 2 | 0 | 2 | 0 |
| InterestExpenseDemandDepositAccounts | found by name | 0 | 0.0% | 1 | 1 | 0 | 1 | 0 |
| InterestExpenseInterestBearingLiability | found by name | 0 | 0.0% | 1 | 1 | 0 | 1 | 0 |
| InterestExpenseSavingsDeposits | found by name | 0 | 0.0% | 1 | 1 | 0 | 1 | 0 |
| InterestExpenseTimeDeposits | found by name | 0 | 0.0% | 1 | 1 | 0 | 1 | 0 |
| InterestExpenseTimeDepositsLessThan100000 | found by name | 0 | 0.0% | 1 | 1 | 0 | 1 | 0 |
| InterestExpenseTradingLiabilities | found by name | 0 | 0.0% | 1 | 1 | 0 | 1 | 0 |

### Named candidates and the tags in use, with double-count notes

| tag | status | firms_missing_field_reporting | firms_reporting_all | double_count_note |
| --- | --- | --- | --- | --- |
| InterestPaidNet | candidate (report only) | 458 | 1938 | Cash paid for interest (cash-flow statement), net of capitalised interest. Timing differs from expense. Reported only, never proposed. |
| InterestExpenseOperating | candidate | 22 | 42 | Interest expense inside operating costs (finance arms, banks). Overlaps InterestExpense: an alternative, never both. |
| InterestCostsIncurred | candidate | 8 | 63 | Interest cost before capitalising part of it, so at least the expense. Do not mix with expense tags. |
| InterestExpenseNonoperating | existing | 0 | 1063 | Interest expense shown below operating income. Second choice today. |
| InterestExpense | existing | 0 | 650 | Interest expense. First choice today. |
| InterestExpenseDebt | existing | 0 | 305 | Interest on debt. Third choice today. |
| InterestAndDebtExpense | existing | 0 | 91 | Interest and debt expense including fees. Fourth choice today. |
| InterestExpenseRelatedParty | candidate | 0 | 0 | Interest paid to related parties. A component of total interest expense: alone it understates. |

## What to read from this

- A tag with many `firms_missing_field_reporting` and `within_1pct` near `both_reported` is the same number as the existing value in another tag: adding it as an alternative recovers firms without changing firms that already have a value.
- A tag mostly `tag_below_panel` is a part of the total: it can only be added when the parent is absent.
- A tag mostly `tag_above_panel` is a broader concept (for example lease-inclusive or gross): adding it changes definitions.
