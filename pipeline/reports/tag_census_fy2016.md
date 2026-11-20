# Tag census FY2016

Data: SEC EDGAR. Not investment advice.

This file changes nothing. It shows which XBRL tags the core firms that miss a value in the year do report, so the tag lists can be chosen from facts. It describes the panel as it was when the census ran.

## Source

Run date: 2026-11-20

- `companyfacts.zip`: downloaded 2026-11-20T19:31:19.182033+00:00, 1,428,741,488 bytes, SHA-256 `5ae31e097c67fd5b6febb55ea3bcea83bb1f806f92dd5553ce1e486cf8ee1ff6`, Last-Modified Fri, 20 Nov 2026 04:52:50 GMT
- `submissions.zip`: downloaded 2026-11-20T19:31:19.182033+00:00, 1,577,210,152 bytes, SHA-256 `2697889219e852d4e9f0f1fcfb97a5fc53cf0d8fb06eaa87fa94efac228edae0`, Last-Modified Fri, 20 Nov 2026 05:00:09 GMT

## Population and method

- Census population: core firms (not financial, not utility, age at FY2016 of 10 or more) with a present FY2016 row: **2777**.
- Missing total_debt in the panel: **1241**.
- Missing revenue in the panel: **367**.
- Missing interest_expense in the panel: **751**.
- A firm *reports* a tag when the tag has an annual-form (10-K, 10-K/A) USD value for the firm's fiscal year: a flow of 350 to 380 days ending on the fiscal year end, or a balance-sheet value within 7 days of it. These are the extractor's rules.
- Tags are those on Frank's list (`candidate`), the tags in the priority list when the census ran (`existing`), and tags whose names match a keyword pattern and are not obviously something else (`found by name`). The keyword patterns are heuristics: expect some noise.
- `firms_missing_field_reporting` counts firms that miss the field in the panel and report the tag. `both_reported`, `within_1pct`, `tag_below_panel` and `tag_above_panel` are measured on all census firms that have a panel value and also report the tag: they show whether the tag is the same number as the existing value (within 1%), a part of it (below) or something larger (above).
- `existing` tags can still show firms missing the field: their value was rejected by a rule (for example two different periods on the same end date).
- Members read: 2777; not selected: 17829; parse failures: 0.

## Total debt

1241 census firms miss total_debt.

### Top 30 tags reported by those firms

| tag | status | firms_missing_field_reporting | share_of_missing | firms_reporting_all | both_reported | within_1pct | tag_below_panel | tag_above_panel |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| LongTermDebtAndCapitalLeaseObligations | candidate | 164 | 13.2% | 443 | 272 | 58 | 117 | 97 |
| NotesPayableCurrent | candidate | 155 | 12.5% | 287 | 130 | 8 | 97 | 25 |
| LongTermDebtAndCapitalLeaseObligationsCurrent | candidate | 133 | 10.7% | 355 | 215 | 18 | 181 | 16 |
| LineOfCredit | found by name | 97 | 7.8% | 276 | 175 | 22 | 132 | 21 |
| NotesPayableRelatedPartiesClassifiedCurrent | found by name | 96 | 7.7% | 158 | 61 | 2 | 48 | 11 |
| ConvertibleNotesPayableCurrent | found by name | 94 | 7.6% | 125 | 30 | 0 | 23 | 7 |
| DebtAndCapitalLeaseObligations | found by name | 92 | 7.4% | 227 | 134 | 55 | 17 | 62 |
| LinesOfCreditCurrent | candidate | 82 | 6.6% | 189 | 99 | 4 | 75 | 20 |
| LongTermNotesPayable | candidate | 81 | 6.5% | 175 | 91 | 11 | 62 | 18 |
| NotesPayable | candidate | 77 | 6.2% | 164 | 86 | 24 | 39 | 23 |
| DebtInstrumentCarryingAmount | candidate | 75 | 6.0% | 497 | 414 | 160 | 38 | 216 |
| LongTermLineOfCredit | found by name | 62 | 5.0% | 135 | 72 | 8 | 51 | 13 |
| ConvertibleLongTermNotesPayable | found by name | 57 | 4.6% | 96 | 37 | 4 | 25 | 8 |
| ConvertibleNotesPayable | candidate | 56 | 4.5% | 85 | 27 | 2 | 16 | 9 |
| DebtCurrent | candidate | 49 | 3.9% | 273 | 219 | 5 | 191 | 23 |
| NotesPayableRelatedPartiesNoncurrent | found by name | 42 | 3.4% | 92 | 47 | 1 | 34 | 12 |
| ConvertibleDebtCurrent | found by name | 41 | 3.3% | 67 | 24 | 0 | 12 | 12 |
| ConvertibleDebtNoncurrent | found by name | 34 | 2.7% | 66 | 27 | 3 | 17 | 7 |
| LoansPayableCurrent | found by name | 34 | 2.7% | 55 | 21 | 2 | 14 | 5 |
| ConvertibleDebt | found by name | 33 | 2.7% | 62 | 28 | 2 | 19 | 7 |
| LiabilitiesOtherThanLongtermDebtNoncurrent | found by name | 29 | 2.3% | 88 | 58 | 0 | 50 | 8 |
| LoansPayable | found by name | 25 | 2.0% | 38 | 13 | 1 | 8 | 4 |
| NotesPayableRelatedPartiesCurrentAndNoncurrent | found by name | 24 | 1.9% | 54 | 29 | 1 | 22 | 6 |
| DebtLongtermAndShorttermCombinedAmount | found by name | 22 | 1.8% | 138 | 113 | 65 | 12 | 36 |
| OtherLongTermDebt | candidate | 21 | 1.7% | 87 | 64 | 0 | 62 | 2 |
| SeniorNotes | candidate | 20 | 1.6% | 57 | 37 | 3 | 24 | 10 |
| LongTermLoansPayable | found by name | 17 | 1.4% | 35 | 18 | 2 | 15 | 1 |
| OtherNotesPayableCurrent | found by name | 17 | 1.4% | 29 | 11 | 1 | 9 | 1 |
| SeniorLongTermNotes | found by name | 16 | 1.3% | 40 | 24 | 2 | 16 | 6 |
| OtherLongTermDebtNoncurrent | found by name | 15 | 1.2% | 61 | 45 | 3 | 36 | 6 |

### Named candidates and the tags in use, with double-count notes

| tag | status | firms_missing_field_reporting | firms_reporting_all | double_count_note |
| --- | --- | --- | --- | --- |
| LongTermDebtAndCapitalLeaseObligations | candidate | 164 | 443 | Noncurrent debt including finance leases. Same role as LongTermDebtNoncurrent: use instead of it, never both. May include leases that tag excludes. |
| NotesPayableCurrent | candidate | 155 | 287 | Current notes payable. Overlaps ShortTermBorrowings, DebtCurrent and LongTermDebtCurrent. Fallback only. |
| LongTermDebtAndCapitalLeaseObligationsCurrent | candidate | 133 | 355 | Current debt including finance leases. Same role as LongTermDebtCurrent: instead of it, never both. |
| LinesOfCreditCurrent | candidate | 82 | 189 | Drawn lines of credit due within a year. A component of ShortTermBorrowings and DebtCurrent. |
| LongTermNotesPayable | candidate | 81 | 175 | Noncurrent notes payable. Same role as LongTermDebtNoncurrent when a filer lacks that tag; a component of it if both exist. |
| NotesPayable | candidate | 77 | 164 | Notes payable, current and noncurrent as the filer shows them. Overlaps every other debt tag. Fallback only. |
| DebtInstrumentCarryingAmount | candidate | 75 | 497 | Carrying amount of debt instruments, often one table of a note. May overlap every other tag. Last fallback only. |
| ConvertibleNotesPayable | candidate | 56 | 85 | Convertible notes. A component of long-term debt: add only when no parent tag exists. |
| DebtCurrent | candidate | 49 | 273 | All debt due within a year (short-term borrowings plus the current portion of long-term debt). Overlaps LongTermDebtCurrent and ShortTermBorrowings: use instead of them, never on top. |
| OtherLongTermDebt | candidate | 21 | 87 | Other long-term debt. A component when the filer shows classes, the whole amount for a small filer. |
| SeniorNotes | candidate | 20 | 57 | Senior notes, one class of debt. A component of LongTermDebt: double counts if added to a parent. |
| CommercialPaper | candidate | 8 | 65 | Commercial paper outstanding. A component of ShortTermBorrowings and DebtCurrent. |
| SecuredDebt | candidate | 7 | 51 | Secured debt, one class. A component of LongTermDebt: double counts if added to a parent. |
| LongTermDebtNoncurrent | existing | 0 | 1123 | Long-term debt without the current portion. Part of today's sum. |
| LongTermDebt | existing | 0 | 1048 | Total long-term debt, usually including the current portion. Used only when no part exists, so it cannot double count. |
| LongTermDebtCurrent | existing | 0 | 945 | Current portion of long-term debt. Part of today's sum. |
| ShortTermBorrowings | existing | 0 | 276 | Bank loans, commercial paper and lines of credit due within a year. Part of today's sum. |

### Firms missing total debt that report no debt-like tag

Of the 1241 firms, **331** report no debt-like tag at all (not on the list and no keyword match) and have FY2016 interest expense of 0 or missing: these are **likely debt-free, not missing data**. The second pair of columns uses only the named tags.

| interest_expense_fy2024 | no_debt_like_tag | reports_a_debt_like_tag | no_named_debt_tag | reports_a_named_debt_tag |
| --- | --- | --- | --- | --- |
| zero | 24 | 9 | 29 | 4 |
| missing | 307 | 170 | 389 | 88 |
| positive | 150 | 560 | 328 | 382 |
| negative | 3 | 18 | 6 | 15 |

Firms with **positive interest expense and no debt-like tag**: 150 (`tag_census_fy2016_positive_interest_no_debt_tag.csv`).

## Revenue

367 census firms miss revenue.

### Top 30 tags reported by those firms

| tag | status | firms_missing_field_reporting | share_of_missing | firms_reporting_all | both_reported | within_1pct | tag_below_panel | tag_above_panel |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SalesRevenueGoodsNet | candidate | 106 | 28.9% | 733 | 622 | 220 | 385 | 17 |
| SalesRevenueServicesNet | candidate | 35 | 9.5% | 391 | 355 | 59 | 288 | 8 |
| RevenueFromContractWithCustomerIncludingAssessedTax | candidate | 31 | 8.4% | 234 | 199 | 155 | 33 | 11 |
| OilAndGasRevenue | found by name | 22 | 6.0% | 47 | 25 | 6 | 14 | 5 |
| OilAndGasSalesRevenue | found by name | 17 | 4.6% | 55 | 38 | 8 | 23 | 7 |
| EquityMethodInvestmentSummarizedFinancialInformationRevenue | found by name | 9 | 2.5% | 97 | 88 | 0 | 78 | 10 |
| ContractsRevenue | found by name | 7 | 1.9% | 72 | 64 | 10 | 52 | 2 |
| NaturalGasProductionRevenue | found by name | 7 | 1.9% | 23 | 15 | 0 | 15 | 0 |
| OilAndCondensateRevenue | found by name | 7 | 1.9% | 20 | 13 | 0 | 13 | 0 |
| OtherSalesRevenueNet | found by name | 6 | 1.6% | 193 | 186 | 2 | 182 | 2 |
| ResultsOfOperationsRevenueFromOilAndGasProducingActivities | found by name | 6 | 1.6% | 32 | 26 | 6 | 16 | 4 |
| HealthCareOrganizationRevenue | found by name | 6 | 1.6% | 18 | 12 | 5 | 3 | 4 |
| SalesCommissionsAndFees | found by name | 5 | 1.4% | 34 | 29 | 0 | 29 | 0 |
| LicensesRevenue | found by name | 4 | 1.1% | 115 | 111 | 6 | 105 | 0 |
| RoyaltyRevenue | found by name | 4 | 1.1% | 99 | 94 | 4 | 88 | 2 |
| HealthCareOrganizationPatientServiceRevenue | found by name | 4 | 1.1% | 11 | 7 | 0 | 5 | 2 |
| OperatingLeasesIncomeStatementLeaseRevenue | found by name | 3 | 0.8% | 70 | 67 | 1 | 64 | 2 |
| ShippingAndHandlingRevenue | found by name | 3 | 0.8% | 41 | 38 | 0 | 38 | 0 |
| SalesRevenueServicesGross | found by name | 3 | 0.8% | 29 | 26 | 2 | 22 | 2 |
| HomeBuildingRevenue | found by name | 3 | 0.8% | 9 | 6 | 2 | 4 | 0 |
| HealthCareOrganizationPatientServiceRevenueLessProvisionForBadDebts | found by name | 3 | 0.8% | 7 | 4 | 1 | 2 | 1 |
| LandSales | found by name | 3 | 0.8% | 7 | 4 | 0 | 4 | 0 |
| RealEstateRevenueNet | found by name | 3 | 0.8% | 7 | 4 | 1 | 3 | 0 |
| OperatingLeasesIncomeStatementSubleaseRevenue | found by name | 2 | 0.5% | 63 | 61 | 0 | 61 | 0 |
| ReimbursementRevenue | found by name | 2 | 0.5% | 56 | 54 | 0 | 54 | 0 |
| LicenseAndServicesRevenue | found by name | 2 | 0.5% | 53 | 50 | 5 | 44 | 1 |
| RevenueFromGrants | found by name | 2 | 0.5% | 50 | 47 | 8 | 39 | 0 |
| RevenueRecognitionGiftCardsBreakage | found by name | 2 | 0.5% | 44 | 42 | 0 | 42 | 0 |
| TechnologyServicesRevenue | found by name | 2 | 0.5% | 44 | 42 | 1 | 40 | 1 |
| SalesRevenueGoodsGross | found by name | 2 | 0.5% | 43 | 41 | 10 | 19 | 12 |

### Named candidates and the tags in use, with double-count notes

| tag | status | firms_missing_field_reporting | firms_reporting_all | double_count_note |
| --- | --- | --- | --- | --- |
| SalesRevenueGoodsNet | candidate | 106 | 733 | Revenue from goods only. A component: the total is goods plus services (SalesRevenueServicesNet), so one alone understates. |
| SalesRevenueServicesNet | candidate | 35 | 391 | Revenue from services only. A component, see SalesRevenueGoodsNet. |
| RevenueFromContractWithCustomerIncludingAssessedTax | candidate | 31 | 234 | Same concept as the ExcludingAssessedTax tag but with sales taxes included, so slightly higher. An alternative to it, never both. |
| Revenues | existing | 0 | 1506 | Total revenue. First choice today. |
| SalesRevenueNet | existing | 0 | 1199 | Older total sales tag. Third choice today. |
| RevenueFromContractWithCustomerExcludingAssessedTax | existing | 0 | 766 | Revenue from contracts, without sales taxes. Second choice today. |
| RevenuesNetOfInterestExpense | candidate | 0 | 0 | Bank revenue after interest expense. A net tag, mainly financial firms, not comparable to gross revenue. |

### Check of the goods + services revenue rule

Core firms with no revenue in the panel, none of the first four revenue tags, and `SalesRevenueGoodsNet` and/or `SalesRevenueServicesNet`: **119** (both tags: 0; goods only: 88; services only: 31). The rule is adopted when either census year reaches 20.

## Interest expense

751 census firms miss interest_expense.

### Top 30 tags reported by those firms

| tag | status | firms_missing_field_reporting | share_of_missing | firms_reporting_all | both_reported | within_1pct | tag_below_panel | tag_above_panel |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| InterestPaid | found by name | 346 | 46.1% | 1671 | 1299 | 175 | 886 | 238 |
| InterestPaidNet | candidate (report only) | 272 | 36.2% | 1397 | 1110 | 128 | 777 | 205 |
| DefinedBenefitPlanInterestCost | found by name | 45 | 6.0% | 241 | 194 | 1 | 163 | 30 |
| InterestExpenseOther | found by name | 34 | 4.5% | 124 | 89 | 15 | 60 | 14 |
| InterestExpenseRelatedParty | candidate | 21 | 2.8% | 87 | 65 | 6 | 51 | 8 |
| InterestCostsIncurred | candidate | 12 | 1.6% | 66 | 51 | 5 | 2 | 44 |
| InterestExpenseLongTermDebt | found by name | 11 | 1.5% | 27 | 16 | 3 | 13 | 0 |
| FinancingInterestExpense | found by name | 9 | 1.2% | 21 | 12 | 0 | 5 | 7 |
| InterestExpenseLesseeAssetsUnderCapitalLease | found by name | 6 | 0.8% | 25 | 18 | 1 | 16 | 1 |
| InterestExpenseBorrowings | found by name | 6 | 0.8% | 21 | 15 | 4 | 8 | 3 |
| DisposalGroupIncludingDiscontinuedOperationInterestExpense | found by name | 4 | 0.5% | 43 | 39 | 1 | 33 | 5 |
| InterestPaidDiscontinuedOperations | found by name | 4 | 0.5% | 9 | 5 | 0 | 4 | 1 |
| InterestRevenueExpenseNet | found by name | 3 | 0.4% | 22 | 19 | 2 | 17 | 0 |
| InterestExpenseShortTermBorrowings | found by name | 3 | 0.4% | 6 | 3 | 1 | 2 | 0 |
| DividendsAndInterestPaid | found by name | 2 | 0.3% | 3 | 1 | 0 | 1 | 0 |
| FinanceLeaseInterestExpense | found by name | 1 | 0.1% | 6 | 5 | 1 | 4 | 0 |
| CostOfRealEstateSalesExcludingInterest | found by name | 1 | 0.1% | 1 | 0 | 0 | 0 | 0 |
| InterestExpenseBeneficialInterestsIssuedByConsolidatedVariableInterestEntities | found by name | 1 | 0.1% | 1 | 0 | 0 | 0 | 0 |
| InterestExpenseJuniorSubordinatedDebentures | found by name | 1 | 0.1% | 1 | 0 | 0 | 0 | 0 |
| InterestExpenseTrustPreferredSecurities | found by name | 1 | 0.1% | 1 | 0 | 0 | 0 | 0 |
| InterestExpense | existing | 0 | 0.0% | 1824 | 1788 | 1788 | 0 | 0 |
| InterestExpenseDebt | existing | 0 | 0.0% | 293 | 285 | 174 | 88 | 23 |
| InterestAndDebtExpense | existing | 0 | 0.0% | 109 | 107 | 76 | 21 | 10 |
| InterestExpenseSubordinatedNotesAndDebentures | found by name | 0 | 0.0% | 5 | 5 | 1 | 4 | 0 |
| InterestExpenseOtherLongTermDebt | found by name | 0 | 0.0% | 4 | 4 | 0 | 4 | 0 |
| InterestExpenseCustomerDeposits | found by name | 0 | 0.0% | 2 | 2 | 0 | 2 | 0 |
| InterestExpenseDeposits | found by name | 0 | 0.0% | 2 | 2 | 2 | 0 | 0 |
| ContractualInterestExpenseOnPrepetitionLiabilitiesNotRecognizedInStatementOfOperations | found by name | 0 | 0.0% | 1 | 1 | 0 | 0 | 1 |
| CostOfRealEstateSalesInterest | found by name | 0 | 0.0% | 1 | 0 | 0 | 0 | 0 |
| GrandfatheredESOPExpenseRecognitionActualInterestIncurredOnESOPDebt | found by name | 0 | 0.0% | 1 | 1 | 0 | 1 | 0 |

### Named candidates and the tags in use, with double-count notes

| tag | status | firms_missing_field_reporting | firms_reporting_all | double_count_note |
| --- | --- | --- | --- | --- |
| InterestPaidNet | candidate (report only) | 272 | 1397 | Cash paid for interest (cash-flow statement), net of capitalised interest. Timing differs from expense. Reported only, never proposed. |
| InterestExpenseRelatedParty | candidate | 21 | 87 | Interest paid to related parties. A component of total interest expense: alone it understates. |
| InterestCostsIncurred | candidate | 12 | 66 | Interest cost before capitalising part of it, so at least the expense. Do not mix with expense tags. |
| InterestExpense | existing | 0 | 1824 | Interest expense. First choice today. |
| InterestExpenseDebt | existing | 0 | 293 | Interest on debt. Third choice today. |
| InterestAndDebtExpense | existing | 0 | 109 | Interest and debt expense including fees. Fourth choice today. |
| InterestExpenseNonoperating | existing | 0 | 0 | Interest expense shown below operating income. Second choice today. |
| InterestExpenseOperating | candidate | 0 | 0 | Interest expense inside operating costs (finance arms, banks). Overlaps InterestExpense: an alternative, never both. |

## What to read from this

- A tag with many `firms_missing_field_reporting` and `within_1pct` near `both_reported` is the same number as the existing value in another tag: adding it as an alternative recovers firms without changing firms that already have a value.
- A tag mostly `tag_below_panel` is a part of the total: it can only be added when the parent is absent.
- A tag mostly `tag_above_panel` is a broader concept (for example lease-inclusive or gross): adding it changes definitions.
