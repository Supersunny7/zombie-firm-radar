# Tag census FY2019

Data: SEC EDGAR. Not investment advice.

This file changes nothing. It shows which XBRL tags the core firms that miss a value in the year do report, so the tag lists can be chosen from facts. It describes the panel as it was when the census ran.

## Source

Run date: 2026-11-20

- `companyfacts.zip`: downloaded 2026-11-20T19:31:19.182033+00:00, 1,428,741,488 bytes, SHA-256 `5ae31e097c67fd5b6febb55ea3bcea83bb1f806f92dd5553ce1e486cf8ee1ff6`, Last-Modified Fri, 20 Nov 2026 04:52:50 GMT
- `submissions.zip`: downloaded 2026-11-20T19:31:19.182033+00:00, 1,577,210,152 bytes, SHA-256 `2697889219e852d4e9f0f1fcfb97a5fc53cf0d8fb06eaa87fa94efac228edae0`, Last-Modified Fri, 20 Nov 2026 05:00:09 GMT

## Population and method

- Census population: core firms (not financial, not utility, age at FY2019 of 10 or more) with a present FY2019 row: **2736**.
- Missing total_debt in the panel: **1174**.
- Missing revenue in the panel: **409**.
- Missing interest_expense in the panel: **793**.
- A firm *reports* a tag when the tag has an annual-form (10-K, 10-K/A) USD value for the firm's fiscal year: a flow of 350 to 380 days ending on the fiscal year end, or a balance-sheet value within 7 days of it. These are the extractor's rules.
- Tags are those on Frank's list (`candidate`), the tags in the priority list when the census ran (`existing`), and tags whose names match a keyword pattern and are not obviously something else (`found by name`). The keyword patterns are heuristics: expect some noise.
- `firms_missing_field_reporting` counts firms that miss the field in the panel and report the tag. `both_reported`, `within_1pct`, `tag_below_panel` and `tag_above_panel` are measured on all census firms that have a panel value and also report the tag: they show whether the tag is the same number as the existing value (within 1%), a part of it (below) or something larger (above).
- `existing` tags can still show firms missing the field: their value was rejected by a rule (for example two different periods on the same end date).
- Members read: 2736; not selected: 17870; parse failures: 0.

## Total debt

1174 census firms miss total_debt.

### Top 30 tags reported by those firms

| tag | status | firms_missing_field_reporting | share_of_missing | firms_reporting_all | both_reported | within_1pct | tag_below_panel | tag_above_panel |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| NotesPayableCurrent | candidate | 175 | 14.9% | 304 | 111 | 13 | 86 | 12 |
| LongTermDebtAndCapitalLeaseObligations | candidate | 122 | 10.4% | 374 | 249 | 61 | 105 | 83 |
| ConvertibleNotesPayableCurrent | found by name | 116 | 9.9% | 179 | 54 | 3 | 34 | 17 |
| NotesPayableRelatedPartiesClassifiedCurrent | found by name | 97 | 8.3% | 160 | 55 | 0 | 43 | 12 |
| LongTermDebtAndCapitalLeaseObligationsCurrent | candidate | 94 | 8.0% | 295 | 198 | 16 | 154 | 28 |
| LongTermNotesPayable | candidate | 83 | 7.1% | 169 | 79 | 11 | 56 | 12 |
| LinesOfCreditCurrent | candidate | 71 | 6.0% | 182 | 104 | 7 | 77 | 20 |
| NotesPayable | candidate | 70 | 6.0% | 158 | 78 | 24 | 27 | 27 |
| LineOfCredit | found by name | 61 | 5.2% | 205 | 135 | 13 | 97 | 25 |
| ConvertibleLongTermNotesPayable | found by name | 59 | 5.0% | 108 | 44 | 6 | 25 | 13 |
| ConvertibleDebtNoncurrent | found by name | 58 | 4.9% | 96 | 32 | 5 | 17 | 10 |
| DebtInstrumentCarryingAmount | candidate | 57 | 4.9% | 581 | 514 | 202 | 45 | 267 |
| ConvertibleDebtCurrent | found by name | 57 | 4.9% | 103 | 41 | 1 | 20 | 20 |
| DebtAndCapitalLeaseObligations | found by name | 55 | 4.7% | 156 | 100 | 47 | 11 | 42 |
| LoansPayableCurrent | found by name | 54 | 4.6% | 99 | 38 | 2 | 31 | 5 |
| ConvertibleNotesPayable | candidate | 50 | 4.3% | 89 | 34 | 2 | 16 | 16 |
| ConvertibleDebt | found by name | 44 | 3.7% | 78 | 33 | 4 | 14 | 15 |
| DebtCurrent | candidate | 42 | 3.6% | 256 | 210 | 17 | 173 | 20 |
| LongTermLineOfCredit | found by name | 42 | 3.6% | 99 | 51 | 12 | 27 | 12 |
| NotesPayableRelatedPartiesNoncurrent | found by name | 42 | 3.6% | 80 | 33 | 2 | 25 | 6 |
| LoansPayable | found by name | 30 | 2.6% | 46 | 13 | 4 | 5 | 4 |
| LongTermLoansPayable | found by name | 26 | 2.2% | 67 | 34 | 4 | 27 | 3 |
| OtherNotesPayableCurrent | found by name | 26 | 2.2% | 40 | 14 | 2 | 11 | 1 |
| NotesPayableRelatedPartiesCurrentAndNoncurrent | found by name | 24 | 2.0% | 48 | 21 | 0 | 20 | 1 |
| DebtLongtermAndShorttermCombinedAmount | found by name | 21 | 1.8% | 148 | 127 | 62 | 14 | 51 |
| LiabilitiesOtherThanLongtermDebtNoncurrent | found by name | 20 | 1.7% | 68 | 47 | 0 | 38 | 9 |
| SeniorLongTermNotes | found by name | 19 | 1.6% | 30 | 10 | 0 | 8 | 2 |
| SecuredLongTermDebt | found by name | 16 | 1.4% | 47 | 31 | 4 | 25 | 2 |
| NotesAndLoansPayableCurrent | found by name | 16 | 1.4% | 31 | 13 | 0 | 12 | 1 |
| NotesAndLoansPayable | found by name | 14 | 1.2% | 32 | 18 | 5 | 8 | 5 |

### Named candidates and the tags in use, with double-count notes

| tag | status | firms_missing_field_reporting | firms_reporting_all | double_count_note |
| --- | --- | --- | --- | --- |
| NotesPayableCurrent | candidate | 175 | 304 | Current notes payable. Overlaps ShortTermBorrowings, DebtCurrent and LongTermDebtCurrent. Fallback only. |
| LongTermDebtAndCapitalLeaseObligations | candidate | 122 | 374 | Noncurrent debt including finance leases. Same role as LongTermDebtNoncurrent: use instead of it, never both. May include leases that tag excludes. |
| LongTermDebtAndCapitalLeaseObligationsCurrent | candidate | 94 | 295 | Current debt including finance leases. Same role as LongTermDebtCurrent: instead of it, never both. |
| LongTermNotesPayable | candidate | 83 | 169 | Noncurrent notes payable. Same role as LongTermDebtNoncurrent when a filer lacks that tag; a component of it if both exist. |
| LinesOfCreditCurrent | candidate | 71 | 182 | Drawn lines of credit due within a year. A component of ShortTermBorrowings and DebtCurrent. |
| NotesPayable | candidate | 70 | 158 | Notes payable, current and noncurrent as the filer shows them. Overlaps every other debt tag. Fallback only. |
| DebtInstrumentCarryingAmount | candidate | 57 | 581 | Carrying amount of debt instruments, often one table of a note. May overlap every other tag. Last fallback only. |
| ConvertibleNotesPayable | candidate | 50 | 89 | Convertible notes. A component of long-term debt: add only when no parent tag exists. |
| DebtCurrent | candidate | 42 | 256 | All debt due within a year (short-term borrowings plus the current portion of long-term debt). Overlaps LongTermDebtCurrent and ShortTermBorrowings: use instead of them, never on top. |
| SeniorNotes | candidate | 13 | 45 | Senior notes, one class of debt. A component of LongTermDebt: double counts if added to a parent. |
| OtherLongTermDebt | candidate | 12 | 92 | Other long-term debt. A component when the filer shows classes, the whole amount for a small filer. |
| SecuredDebt | candidate | 6 | 32 | Secured debt, one class. A component of LongTermDebt: double counts if added to a parent. |
| CommercialPaper | candidate | 3 | 56 | Commercial paper outstanding. A component of ShortTermBorrowings and DebtCurrent. |
| LongTermDebtNoncurrent | existing | 0 | 1137 | Long-term debt without the current portion. Part of today's sum. |
| LongTermDebt | existing | 0 | 1055 | Total long-term debt, usually including the current portion. Used only when no part exists, so it cannot double count. |
| LongTermDebtCurrent | existing | 0 | 926 | Current portion of long-term debt. Part of today's sum. |
| ShortTermBorrowings | existing | 0 | 281 | Bank loans, commercial paper and lines of credit due within a year. Part of today's sum. |

### Firms missing total debt that report no debt-like tag

Of the 1174 firms, **326** report no debt-like tag at all (not on the list and no keyword match) and have FY2019 interest expense of 0 or missing: these are **likely debt-free, not missing data**. The second pair of columns uses only the named tags.

| interest_expense_fy2024 | no_debt_like_tag | reports_a_debt_like_tag | no_named_debt_tag | reports_a_named_debt_tag |
| --- | --- | --- | --- | --- |
| zero | 20 | 19 | 31 | 8 |
| missing | 306 | 188 | 392 | 102 |
| positive | 132 | 503 | 306 | 329 |
| negative | 0 | 6 | 3 | 3 |

Firms with **positive interest expense and no debt-like tag**: 132 (`tag_census_fy2019_positive_interest_no_debt_tag.csv`).

## Revenue

409 census firms miss revenue.

### Top 30 tags reported by those firms

| tag | status | firms_missing_field_reporting | share_of_missing | firms_reporting_all | both_reported | within_1pct | tag_below_panel | tag_above_panel |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| RevenueFromContractWithCustomerIncludingAssessedTax | candidate | 226 | 55.3% | 460 | 231 | 150 | 66 | 15 |
| EquityMethodInvestmentSummarizedFinancialInformationRevenue | found by name | 6 | 1.5% | 80 | 74 | 1 | 63 | 10 |
| SalesCommissionsAndFees | found by name | 5 | 1.2% | 37 | 31 | 0 | 31 | 0 |
| ExciseAndSalesTaxes | found by name | 4 | 1.0% | 18 | 14 | 0 | 13 | 1 |
| FairValueMeasurementWithUnobservableInputsReconciliationRecurringBasisLiabilitySales | found by name | 3 | 0.7% | 8 | 5 | 0 | 5 | 0 |
| OperatingLeasesIncomeStatementLeaseRevenue | found by name | 2 | 0.5% | 41 | 39 | 0 | 39 | 0 |
| OperatingLeasesIncomeStatementSubleaseRevenue | found by name | 2 | 0.5% | 20 | 17 | 0 | 17 | 0 |
| RevenueNotFromContractWithCustomer | found by name | 1 | 0.2% | 27 | 25 | 0 | 25 | 0 |
| ResultsOfOperationsRevenueFromOilAndGasProducingActivities | found by name | 1 | 0.2% | 26 | 25 | 10 | 13 | 2 |
| OperatingLeasesIncomeStatementContingentRevenue | found by name | 1 | 0.2% | 7 | 6 | 0 | 6 | 0 |
| RevenueFromCollaborativeArrangementExcludingRevenueFromContractWithCustomer | found by name | 1 | 0.2% | 7 | 4 | 2 | 2 | 0 |
| OperatingLeasesIncomeStatementMinimumLeaseRevenue | found by name | 1 | 0.2% | 5 | 4 | 0 | 4 | 0 |
| DefinedBenefitPlanPurchasesSalesAndSettlements | found by name | 1 | 0.2% | 3 | 2 | 0 | 2 | 0 |
| PropertyManagementFeeRevenue | found by name | 1 | 0.2% | 2 | 1 | 0 | 1 | 0 |
| RegulatedOperatingRevenue | found by name | 1 | 0.2% | 2 | 1 | 0 | 1 | 0 |
| HealthCareOrganizationRevenueNetOfPatientServiceRevenueProvisions | found by name | 1 | 0.2% | 1 | 0 | 0 | 0 | 0 |
| RevenueFromContractWithCustomerExcludingAssessedTax | existing | 0 | 0.0% | 1526 | 1509 | 1400 | 95 | 14 |
| Revenues | existing | 0 | 0.0% | 1168 | 1086 | 1086 | 0 | 0 |
| FairValueMeasurementWithUnobservableInputsReconciliationRecurringBasisAssetSales | found by name | 0 | 0.0% | 7 | 7 | 0 | 7 | 0 |
| RevenueNotFromContractWithCustomerOther | found by name | 0 | 0.0% | 6 | 6 | 0 | 6 | 0 |
| FairValueMeasurementWithUnobservableInputsReconciliationRecurringBasisAssetPurchasesSalesIssuancesSettlements | found by name | 0 | 0.0% | 5 | 5 | 0 | 5 | 0 |
| ResultsOfOperationsRevenueOther | found by name | 0 | 0.0% | 5 | 4 | 0 | 3 | 1 |
| RevenuesNetOfInterestExpense | candidate | 0 | 0.0% | 5 | 5 | 3 | 2 | 0 |
| ResultsOfOperationsSalesRevenueToUnaffiliatedEnterprises | found by name | 0 | 0.0% | 4 | 4 | 1 | 3 | 0 |
| CapitalLeasesIncomeStatementDirectFinancingLeaseRevenue | found by name | 0 | 0.0% | 3 | 3 | 0 | 3 | 0 |
| DirectFinancingLeaseRevenue | found by name | 0 | 0.0% | 3 | 3 | 0 | 3 | 0 |
| FairValueMeasurementWithUnobservableInputsReconciliationRecurringBasisLiabilityPurchasesSalesIssuancesSettlements | found by name | 0 | 0.0% | 3 | 3 | 0 | 2 | 1 |
| FairValueNetDerivativeAssetLiabilityMeasuredOnRecurringBasisUnobservableInputsReconciliationPurchasesSalesIssuesSettlements | found by name | 0 | 0.0% | 3 | 3 | 0 | 3 | 0 |
| CapitalLeasesIncomeStatementLeaseRevenue | found by name | 0 | 0.0% | 2 | 2 | 0 | 2 | 0 |
| FairValueNetDerivativeAssetLiabilityMeasuredOnRecurringBasisUnobservableInputsReconciliationSales | found by name | 0 | 0.0% | 2 | 2 | 0 | 2 | 0 |

### Named candidates and the tags in use, with double-count notes

| tag | status | firms_missing_field_reporting | firms_reporting_all | double_count_note |
| --- | --- | --- | --- | --- |
| RevenueFromContractWithCustomerIncludingAssessedTax | candidate | 226 | 460 | Same concept as the ExcludingAssessedTax tag but with sales taxes included, so slightly higher. An alternative to it, never both. |
| RevenueFromContractWithCustomerExcludingAssessedTax | existing | 0 | 1526 | Revenue from contracts, without sales taxes. Second choice today. |
| Revenues | existing | 0 | 1168 | Total revenue. First choice today. |
| RevenuesNetOfInterestExpense | candidate | 0 | 5 | Bank revenue after interest expense. A net tag, mainly financial firms, not comparable to gross revenue. |
| SalesRevenueGoodsNet | candidate | 0 | 2 | Revenue from goods only. A component: the total is goods plus services (SalesRevenueServicesNet), so one alone understates. |
| SalesRevenueNet | existing | 0 | 1 | Older total sales tag. Third choice today. |
| SalesRevenueServicesNet | candidate | 0 | 1 | Revenue from services only. A component, see SalesRevenueGoodsNet. |

### Check of the goods + services revenue rule

Core firms with no revenue in the panel, none of the first four revenue tags, and `SalesRevenueGoodsNet` and/or `SalesRevenueServicesNet`: **0** (both tags: 0; goods only: 0; services only: 0). The rule is adopted when either census year reaches 20.

## Interest expense

793 census firms miss interest_expense.

### Top 30 tags reported by those firms

| tag | status | firms_missing_field_reporting | share_of_missing | firms_reporting_all | both_reported | within_1pct | tag_below_panel | tag_above_panel |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| InterestPaidNet | candidate (report only) | 424 | 53.5% | 1979 | 1528 | 175 | 1082 | 271 |
| FinanceLeaseInterestExpense | found by name | 118 | 14.9% | 605 | 484 | 11 | 465 | 8 |
| InterestPaid | found by name | 74 | 9.3% | 330 | 253 | 22 | 176 | 55 |
| DefinedBenefitPlanInterestCost | found by name | 46 | 5.8% | 210 | 163 | 3 | 148 | 12 |
| InterestExpenseOther | found by name | 39 | 4.9% | 126 | 86 | 21 | 53 | 12 |
| InterestExpenseRelatedParty | candidate | 20 | 2.5% | 91 | 70 | 9 | 52 | 9 |
| InterestExpenseLongTermDebt | found by name | 12 | 1.5% | 28 | 16 | 4 | 7 | 5 |
| InterestCostsIncurred | candidate | 10 | 1.3% | 66 | 55 | 12 | 7 | 36 |
| InterestExpenseBorrowings | found by name | 9 | 1.1% | 25 | 16 | 2 | 8 | 6 |
| DisposalGroupIncludingDiscontinuedOperationInterestExpense | found by name | 5 | 0.6% | 27 | 22 | 0 | 15 | 7 |
| InterestRevenueExpenseNet | found by name | 5 | 0.6% | 26 | 21 | 0 | 19 | 2 |
| FinancingInterestExpense | found by name | 5 | 0.6% | 17 | 12 | 0 | 8 | 4 |
| InterestExpenseShortTermBorrowings | found by name | 4 | 0.5% | 10 | 6 | 0 | 6 | 0 |
| DividendsAndInterestPaid | found by name | 2 | 0.3% | 5 | 3 | 0 | 2 | 1 |
| InterestExpenseLesseeAssetsUnderCapitalLease | found by name | 1 | 0.1% | 10 | 9 | 1 | 8 | 0 |
| InterestExpenseOtherLongTermDebt | found by name | 1 | 0.1% | 5 | 4 | 0 | 4 | 0 |
| InterestPaidDiscontinuedOperations | found by name | 1 | 0.1% | 5 | 4 | 0 | 4 | 0 |
| RevenuesNetOfInterestExpense | found by name | 1 | 0.1% | 5 | 4 | 0 | 3 | 1 |
| InterestExpenseJuniorSubordinatedDebentures | found by name | 1 | 0.1% | 1 | 0 | 0 | 0 | 0 |
| InterestExpense | existing | 0 | 0.0% | 1761 | 1721 | 1721 | 0 | 0 |
| InterestExpenseDebt | existing | 0 | 0.0% | 321 | 312 | 184 | 103 | 25 |
| InterestAndDebtExpense | existing | 0 | 0.0% | 79 | 77 | 53 | 11 | 13 |
| InterestExpenseDeposits | found by name | 0 | 0.0% | 3 | 3 | 1 | 2 | 0 |
| InterestExpenseSubordinatedNotesAndDebentures | found by name | 0 | 0.0% | 3 | 3 | 0 | 3 | 0 |
| InterestExpenseTradingLiabilities | found by name | 0 | 0.0% | 3 | 3 | 0 | 1 | 2 |
| ContractualInterestExpenseOnPrepetitionLiabilitiesNotRecognizedInStatementOfOperations | found by name | 0 | 0.0% | 2 | 2 | 0 | 1 | 1 |
| InterestExpenseCapitalSecurities | found by name | 0 | 0.0% | 2 | 2 | 1 | 1 | 0 |
| InterestExpenseMediumTermNotes | found by name | 0 | 0.0% | 2 | 2 | 0 | 2 | 0 |
| VariableInterestEntityActivityBetweenVIEAndEntityExpense | found by name | 0 | 0.0% | 2 | 2 | 0 | 0 | 2 |
| InterestExpenseCommercialPaper | found by name | 0 | 0.0% | 1 | 1 | 0 | 1 | 0 |

### Named candidates and the tags in use, with double-count notes

| tag | status | firms_missing_field_reporting | firms_reporting_all | double_count_note |
| --- | --- | --- | --- | --- |
| InterestPaidNet | candidate (report only) | 424 | 1979 | Cash paid for interest (cash-flow statement), net of capitalised interest. Timing differs from expense. Reported only, never proposed. |
| InterestExpenseRelatedParty | candidate | 20 | 91 | Interest paid to related parties. A component of total interest expense: alone it understates. |
| InterestCostsIncurred | candidate | 10 | 66 | Interest cost before capitalising part of it, so at least the expense. Do not mix with expense tags. |
| InterestExpense | existing | 0 | 1761 | Interest expense. First choice today. |
| InterestExpenseDebt | existing | 0 | 321 | Interest on debt. Third choice today. |
| InterestAndDebtExpense | existing | 0 | 79 | Interest and debt expense including fees. Fourth choice today. |
| InterestExpenseNonoperating | existing | 0 | 0 | Interest expense shown below operating income. Second choice today. |
| InterestExpenseOperating | candidate | 0 | 0 | Interest expense inside operating costs (finance arms, banks). Overlaps InterestExpense: an alternative, never both. |

## What to read from this

- A tag with many `firms_missing_field_reporting` and `within_1pct` near `both_reported` is the same number as the existing value in another tag: adding it as an alternative recovers firms without changing firms that already have a value.
- A tag mostly `tag_below_panel` is a part of the total: it can only be added when the parent is absent.
- A tag mostly `tag_above_panel` is a broader concept (for example lease-inclusive or gross): adding it changes definitions.
