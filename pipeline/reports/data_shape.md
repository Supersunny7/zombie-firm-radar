# Data shape report

Data: SEC EDGAR. Not investment advice.

## Source

Run date: 2026-11-20

- `companyfacts.zip`: downloaded 2026-11-20T19:31:19.182033+00:00, 1,428,741,488 bytes, SHA-256 `5ae31e097c67fd5b6febb55ea3bcea83bb1f806f92dd5553ce1e486cf8ee1ff6`, Last-Modified Fri, 20 Nov 2026 04:52:50 GMT
- `submissions.zip`: downloaded 2026-11-20T19:31:19.182033+00:00, 1,577,210,152 bytes, SHA-256 `2697889219e852d4e9f0f1fcfb97a5fc53cf0d8fb06eaa87fa94efac228edae0`, Last-Modified Fri, 20 Nov 2026 05:00:09 GMT

## Definitions

- **Present row**: a firm-year with at least one non-null money field.
- **Core**: not financial (SIC 6000-6799), not utility (SIC 4900-4999), and age at that fiscal year of 10 or more. Age is whole years from the firm's first EDGAR filing to the fiscal year end. This is an approximation of firm age.
- **Zombie flag**: age at the year of 10 or more and ICR below 1 in that year and the two years before; any missing ICR gives no flag.
- **ICR**: operating income / interest expense, from the shared `icr()` function. Missing values stay missing, never 0.
- FY2025 is incomplete for many firms. Fiscal years follow the period end date (end month January to May belongs to the prior year).

## 1. Firms per fiscal year

A firm is *present* in a year when at least one money field is not null that year. *Core* means not financial, not utility, and age at that fiscal year of 10 or more.

| fy | firms_present | core_firms_present |
| --- | --- | --- |
| 2015 | 6728 | 2836 |
| 2016 | 6372 | 2779 |
| 2017 | 6169 | 2821 |
| 2018 | 6027 | 2806 |
| 2019 | 6045 | 2737 |
| 2020 | 6191 | 2768 |
| 2021 | 6502 | 2803 |
| 2022 | 6416 | 2759 |
| 2023 | 5940 | 2640 |
| 2024 | 5587 | 2576 |
| 2025 | 5201 | 2484 |

## 2. Zombies per fiscal year, FY2017 to FY2025

Zombie: age at the fiscal year of 10 or more and ICR below 1 in that year and the two before. FY2015 and FY2016 flags look back at FY2013 and FY2014, which are not in the panel. Shares are shown both over core firms present and over core firms with a computable ICR.

| fy | core_firms_present | zombies | share_of_present | core_firms_with_icr | share_of_with_icr |
| --- | --- | --- | --- | --- | --- |
| 2017 | 2821 | 533 | 18.89% | 1904 | 27.99% |
| 2018 | 2806 | 519 | 18.50% | 1869 | 27.77% |
| 2019 | 2737 | 532 | 19.44% | 1846 | 28.82% |
| 2020 | 2768 | 563 | 20.34% | 1855 | 30.35% |
| 2021 | 2803 | 562 | 20.05% | 1839 | 30.56% |
| 2022 | 2759 | 553 | 20.04% | 1812 | 30.52% |
| 2023 | 2640 | 486 | 18.41% | 1730 | 28.09% |
| 2024 | 2576 | 496 | 19.25% | 1645 | 30.15% |
| 2025 | 2484 | 485 | 19.53% | 1545 | 31.39% |

## 3. What happened to the zombies of FY2019 and FY2020

For the zombies of FY2019 and of FY2020 (core firms), what happened up to 2024-12-31. Each firm is in exactly one category, by the first rule that matches: bankruptcy event (8-K item 1.03) after the zombie year; delisting or deregistration event (Form 25, 25-NSE, 15-12B, 15-12G, 15-15D); stopped filing (no fiscal year with data from FY2024 on); recovered (FY2024 ICR of 1 or more); still zombie (FY2024 flag); other alive.

`filed_item_2_01` counts firms that filed an 8-K item 2.01 (completion of an acquisition or disposition) in that window. The firm that files item 2.01 is mostly the **acquirer** or the seller of assets, not the company that was bought, so this column is not an "acquired" count.

Zombies in FY2019: 532.

Zombies in FY2020: 563.

| zombie_year | category | firms | filed_item_2_01 |
| --- | --- | --- | --- |
| 2019 | bankruptcy | 51 | 31 |
| 2019 | delisted_or_deregistered | 152 | 102 |
| 2019 | stopped_filing | 67 | 26 |
| 2019 | recovered | 42 | 19 |
| 2019 | still_zombie | 133 | 60 |
| 2019 | other_alive | 87 | 41 |
| 2020 | bankruptcy | 43 | 30 |
| 2020 | delisted_or_deregistered | 142 | 95 |
| 2020 | stopped_filing | 64 | 24 |
| 2020 | recovered | 42 | 16 |
| 2020 | still_zombie | 167 | 66 |
| 2020 | other_alive | 105 | 39 |

CIK lists: `s3_outcomes_cik.csv`.

## 4. Healthy in FY2019, below 1 in FY2020

Core firms with ICR of 1.5 or more in FY2019 and below 1 in FY2020: **192**. CIK list: `s4_reversals.csv`.

## 5. Zombies of FY2019 to FY2021 with a bankruptcy in 2022 to 2023

Core firms flagged zombie in at least one of FY2019, FY2020, FY2021 with a bankruptcy event filed 2022-01-01 to 2023-12-31: **30**. CIK list: `s5_zombie_then_bankrupt.csv`.

## 6. Breaking rate

Breaking rate = (operating income - interest expense) / total debt, in percentage points: how far the rate on all debt can rise before interest equals operating income. Only years with interest above 0, debt above 0 and a known operating income have one. `latest_year` takes each core firm's latest such year; `fy2024` uses FY2024 only. "Below +k pp" counts firms whose breaking rate is under k, including firms already below 0.

| view | plus_pp | firms_below | firms_total | firms_left_out |
| --- | --- | --- | --- | --- |
| latest_year | 1 | 1657 | 2911 | 1616 |
| latest_year | 2 | 1684 | 2911 | 1616 |
| latest_year | 3 | 1711 | 2911 | 1616 |
| latest_year | 4 | 1733 | 2911 | 1616 |
| latest_year | 5 | 1757 | 2911 | 1616 |
| fy2024 | 1 | 559 | 1270 | 1306 |
| fy2024 | 2 | 568 | 1270 | 1306 |
| fy2024 | 3 | 587 | 1270 | 1306 |
| fy2024 | 4 | 598 | 1270 | 1306 |
| fy2024 | 5 | 612 | 1270 | 1306 |

Histogram in 0.5 pp buckets (-10 to +20): `s6_histogram.csv`.

## 7. Data quality

Counts are over present rows. `likely_debt_free` rows have no value from any debt tag in the tag lists and interest expense of 0 or missing: they are counted here and **not** in `missing_total_debt`. `positive_interest_no_debt_value` counts rows with positive interest expense and no debt value (core firms: `s7_positive_interest_no_debt.csv`). `gap_rows_with_balance_sheet` counts years that have no usable income-statement value, so the panel row is empty, but the filing has a balance-sheet value for that year. For `core` it counts non-financial, non-utility firms (age at a gap year is unknown).

| fy | population | rows_present | missing_operating_income | missing_interest_expense | missing_total_debt | likely_debt_free | positive_interest_no_debt_value | fye_not_december | gap_rows_with_balance_sheet |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2015 | all | 6728 | 954 | 1794 | 1286 | 1196 | 1246 | 1810 | 541 |
| 2015 | core | 2836 | 157 | 751 | 410 | 448 | 403 | 945 | 350 |
| 2016 | all | 6372 | 827 | 1752 | 1188 | 1153 | 1147 | 1601 | 539 |
| 2016 | core | 2779 | 137 | 754 | 412 | 445 | 399 | 839 | 367 |
| 2017 | all | 6169 | 774 | 1757 | 1125 | 1142 | 1103 | 1458 | 490 |
| 2017 | core | 2821 | 128 | 800 | 421 | 464 | 417 | 800 | 349 |
| 2018 | all | 6027 | 741 | 1713 | 1059 | 1123 | 1031 | 1398 | 571 |
| 2018 | core | 2806 | 115 | 806 | 391 | 481 | 384 | 793 | 430 |
| 2019 | all | 6045 | 550 | 1745 | 1107 | 1141 | 1098 | 1340 | 587 |
| 2019 | core | 2737 | 91 | 794 | 366 | 453 | 362 | 775 | 447 |
| 2020 | all | 6191 | 512 | 1825 | 1040 | 1094 | 1038 | 1394 | 923 |
| 2020 | core | 2768 | 109 | 813 | 367 | 412 | 365 | 834 | 398 |
| 2021 | all | 6502 | 487 | 2171 | 1055 | 1453 | 1053 | 1383 | 676 |
| 2021 | core | 2803 | 122 | 847 | 368 | 468 | 367 | 837 | 312 |
| 2022 | all | 6416 | 465 | 2127 | 1003 | 1442 | 993 | 1291 | 346 |
| 2022 | core | 2759 | 103 | 825 | 353 | 506 | 344 | 764 | 209 |
| 2023 | all | 5940 | 456 | 1790 | 989 | 1184 | 971 | 1175 | 314 |
| 2023 | core | 2640 | 100 | 790 | 359 | 478 | 344 | 714 | 182 |
| 2024 | all | 5587 | 453 | 1710 | 899 | 1101 | 879 | 1112 | 303 |
| 2024 | core | 2576 | 102 | 800 | 341 | 481 | 326 | 700 | 108 |
| 2025 | all | 5201 | 446 | 1684 | 871 | 1121 | 853 | 1060 | 287 |
| 2025 | core | 2484 | 109 | 811 | 348 | 508 | 337 | 698 | 72 |

## 8. The 200 largest firms by revenue

The 200 firms with the highest annual revenue in any year FY2015 to FY2025, over all firms (banks and utilities are included and flagged). `zombie_fy2017_2025` has one character per year, FY2017 first: 1 is a zombie flag, 0 is not.

| rank | cik | name | tickers | max_revenue_usd | max_revenue_fy | is_financial | is_utility | age_under_10 | zombie_fy2017_2025 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 0001018724 | AMAZON COM INC | AMZN | 716,924,000,000 | 2025 | False | False | False | 000000000 |
| 2 | 0000104169 | Walmart Inc. | WMT | 713,163,000,000 | 2025 | False | False | False | 000000000 |
| 3 | 0000731766 | UNITEDHEALTH GROUP INC | UNH | 447,567,000,000 | 2025 | True | False | False | 000000000 |
| 4 | 0000320193 | Apple Inc. | AAPL | 416,161,000,000 | 2025 | False | False | False | 000000000 |
| 5 | 0000034088 | EXXON MOBIL CORP |  | 413,680,000,000 | 2022 | False | False | False | 000000000 |
| 6 | 0000927653 | MCKESSON CORP | MCK | 403,430,000,000 | 2025 | False | False | False | 000000000 |
| 7 | 0001652044 | Alphabet Inc. | GOOGL;GOOG;GOOGM;GOOGN | 402,836,000,000 | 2025 | False | False | False | 000000000 |
| 8 | 0000064803 | CVS HEALTH Corp | CVS | 402,067,000,000 | 2025 | False | False | False | 000000000 |
| 9 | 0001067983 | BERKSHIRE HATHAWAY INC | BRK-B;BRK-A | 371,444,000,000 | 2025 | True | False | False | 000000000 |
| 10 | 0001140859 | Cencora, Inc. | COR | 321,332,819,000 | 2025 | False | False | False | 000000000 |
| 11 | 0000789019 | MICROSOFT CORP | MSFT | 281,724,000,000 | 2025 | False | False | False | 000000000 |
| 12 | 0000909832 | COSTCO WHOLESALE CORP /NEW | COST | 275,235,000,000 | 2025 | False | False | False | 000000000 |
| 13 | 0001739940 | Cigna Group | CI | 274,900,000,000 | 2025 | True | False | True | 000000000 |
| 14 | 0000093410 | CHEVRON CORP | CVX | 246,252,000,000 | 2022 | False | False | False | 000000000 |
| 15 | 0000721371 | CARDINAL HEALTH INC | CAH | 226,827,000,000 | 2024 | False | False | False | 000000000 |
| 16 | 0001045810 | NVIDIA CORP | NVDA | 215,938,000,000 | 2025 | False | False | False | 000000000 |
| 17 | 0001326801 | Meta Platforms, Inc. | META;METAM | 200,966,000,000 | 2025 | False | False | False | 000000000 |
| 18 | 0001156039 | Elevance Health, Inc. | ELV | 199,125,000,000 | 2025 | True | False | False | 000000000 |
| 19 | 0001071739 | CENTENE CORP | CNC | 194,777,000,000 | 2025 | True | False | False | 000000000 |
| 20 | 0001467858 | General Motors Co | GM | 187,442,000,000 | 2024 | False | False | False | 000000000 |
| 21 | 0000037996 | FORD MOTOR CO | F;F-PB;F-PC;F-PD | 187,267,000,000 | 2025 | False | False | False | 000110000 |
| 22 | 0000019617 | JPMORGAN CHASE & CO | JPM;JPM-PC;AMJB;JPM-PD;JPM-PJ;JPM-PK;JPM-PL;JPM-PM;VYLD | 182,447,000,000 | 2025 | True | False | False | 000000000 |
| 23 | 0001665650 | JPMorgan Chase Financial Co. LLC |  | 182,447,000,000 | 2025 | True | False | False | 000000000 |
| 24 | 0000732717 | AT&T INC. | T;TBB;T-PA;T-PC | 181,193,000,000 | 2019 | False | False | False | 000000000 |
| 25 | 0001510295 | Marathon Petroleum Corp | MPC | 177,453,000,000 | 2022 | False | False | False | 000000000 |
| 26 | 0001035002 | VALERO ENERGY CORP/TX | VLO | 176,383,000,000 | 2022 | False | False | False | 000000000 |
| 27 | 0001534701 | Phillips 66 | PSX | 169,990,000,000 | 2022 | False | False | False | 000000000 |
| 28 | 0000354950 | HOME DEPOT, INC. | HD | 164,683,000,000 | 2025 | False | False | False | 000000000 |
| 29 | 0000056873 | KROGER CO | KR | 150,039,000,000 | 2023 | False | False | False | 000000000 |
| 30 | 0001618921 | Walgreens Boots Alliance, Inc. |  | 147,658,000,000 | 2024 | False | False | False | 000000000 |
| 31 | 0000732712 | VERIZON COMMUNICATIONS INC | VZ | 138,191,000,000 | 2025 | False | False | False | 000000000 |
| 32 | 0000913760 | StoneX Group Inc. | SNEX | 132,378,200,000 | 2025 | True | False | False | 000000010 |
| 33 | 0000049071 | HUMANA INC | HUM | 129,664,000,000 | 2025 | True | False | False | 000000000 |
| 34 | 0001166691 | COMCAST CORP | CMCSA;CCZ | 123,731,000,000 | 2024 | False | False | False | 000000000 |
| 35 | 0000040545 | GENERAL ELECTRIC CO | GE | 119,469,000,000 | 2016 | False | False | False | 000000000 |
| 36 | 0001571996 | Dell Technologies Inc. | DELL | 113,538,000,000 | 2025 | False | False | False | 000000000 |
| 37 | 0000070858 | BANK OF AMERICA CORP /DE/ | BAC;BML-PG;BML-PL;BAC-PB;BAC-PK;BAC-PE;BAC-PL;BAC-PM;BAC-PN;BAC-PO;BAC-PP;BAC-PQ;BAC-PS;BACRP;BML-PH;BML-PJ;MER-PK | 113,097,000,000 | 2025 | True | False | False | 000000000 |
| 38 | 0000027419 | TARGET CORP | TGT | 109,120,000,000 | 2022 | False | False | False | 000000000 |
| 39 | 0001532063 | Express Scripts Holding Co. |  | 101,751,800,000 | 2015 | False | False | False | 000000000 |
| 40 | 0000007084 | Archer-Daniels-Midland Co | ADM | 101,556,000,000 | 2022 | False | False | False | 000000000 |
| 41 | 0000078003 | PFIZER INC | PFE | 101,175,000,000 | 2022 | False | False | False | 000000000 |
| 42 | 0000012927 | BOEING CO | BA;BA-PA | 101,127,000,000 | 2018 | False | False | False | 000011110 |
| 43 | 0001090727 | UNITED PARCEL SERVICE INC | UPS | 100,338,000,000 | 2022 | False | False | False | 000000000 |
| 44 | 0001318605 | Tesla, Inc. | TSLA | 97,690,000,000 | 2024 | False | False | False | 111000000 |
| 45 | 0000060667 | LOWES COMPANIES INC | LOW | 97,059,000,000 | 2022 | False | False | False | 000000000 |
| 46 | 0001048911 | FEDEX CORP | FDX | 94,720,000,000 | 2025 | False | False | False | 000000000 |
| 47 | 0001744489 | Walt Disney Co | DIS | 94,425,000,000 | 2025 | False | False | True | 000000000 |
| 48 | 0000200406 | JOHNSON & JOHNSON | JNJ | 94,193,000,000 | 2025 | False | False | False | 000000000 |
| 49 | 0000077476 | PEPSICO INC | PEP | 93,925,000,000 | 2025 | False | False | False | 000000000 |
| 50 | 0001276187 | Energy Transfer LP | ET;ET-PI | 89,876,000,000 | 2022 | False | True | False | 000000000 |
| 51 | 0000101829 | RTX Corp | RTX | 88,603,000,000 | 2025 | False | False | False | 000000000 |
| 52 | 0000072971 | WELLS FARGO & COMPANY/MN | WFC;WFC-PY;WFC-PL;WFC-PC;WFCNP;WFC-PA;WFC-PD;WFC-PZ | 88,389,000,000 | 2017 | True | False | False | 000000000 |
| 53 | 0001283699 | T-Mobile US, Inc. | TMUS;TMUSI;TMUSL;TMUSZ | 88,309,000,000 | 2025 | False | False | False | 000000000 |
| 54 | 0000080661 | PROGRESSIVE CORP/OH/ | PGR | 87,671,000,000 | 2025 | True | False | False | 000000000 |
| 55 | 0000200245 | Citigroup Global Markets Holdings Inc. |  | 85,225,000,000 | 2025 | True | False | False | 000000000 |
| 56 | 0000831001 | CITIGROUP INC | C;C-PN;C-PR | 85,225,000,000 | 2025 | True | False | False | 000000000 |
| 57 | 0000080424 | PROCTER & GAMBLE Co | PG | 84,284,000,000 | 2025 | False | False | False | 000000000 |
| 58 | 0001646972 | Albertsons Companies, Inc. | ACI | 83,172,500,000 | 2025 | False | False | False | 000000000 |
| 59 | 0000051143 | INTERNATIONAL BUSINESS MACHINES CORP | IBM | 81,741,000,000 | 2015 | False | False | False | 000000000 |
| 60 | 0000096021 | SYSCO CORP | SYY | 81,370,000,000 | 2025 | False | False | False | 000000000 |
| 61 | 0000050863 | INTEL CORP | INTC | 79,024,000,000 | 2021 | False | False | False | 000000001 |
| 62 | 0001163165 | CONOCOPHILLIPS | COP | 78,494,000,000 | 2022 | False | False | False | 100000000 |
| 63 | 0001099219 | METLIFE INC | MET;MET-PA;MET-PE;MET-PF | 77,084,000,000 | 2025 | True | False | False | 000000000 |
| 64 | 0000860730 | HCA Healthcare, Inc. | HCA | 75,600,000,000 | 2025 | False | False | False | 000000000 |
| 65 | 0000936468 | LOCKHEED MARTIN CORP | LMT | 75,048,000,000 | 2025 | False | False | False | 000000000 |
| 66 | 0001413329 | Philip Morris International Inc. | PM | 73,908,000,000 | 2015 | False | False | False | 000000000 |
| 67 | 0001137774 | PRUDENTIAL FINANCIAL INC | PRU;PFH;PRH;PRS | 71,247,000,000 | 2021 | True | False | False | 000000000 |
| 68 | 0001996862 | Bunge Global SA | BG | 70,329,000,000 | 2025 | False | False | True | 000000000 |
| 69 | 0001467373 | Accenture plc | ACN | 69,672,977,000 | 2025 | False | False | False | 000000000 |
| 70 | 0000899051 | ALLSTATE CORP | ALL;ALL-PH;ALL-PB;ALL-PI;ALL-PJ | 67,685,000,000 | 2025 | True | False | False | 000000000 |
| 71 | 0000018230 | CATERPILLAR INC | CAT | 67,589,000,000 | 2025 | False | False | False | 000000000 |
| 72 | 0001341439 | ORACLE CORP | ORCL;ORCL-PD | 67,357,000,000 | 2025 | False | False | False | 000000000 |
| 73 | 0001144519 | BUNGELTD |  | 67,232,000,000 | 2022 | False | False | False | 000000000 |
| 74 | 0000059478 | ELI LILLY & Co | LLY | 65,179,000,000 | 2025 | False | False | False | 000000000 |
| 75 | 0000310158 | Merck & Co., Inc. | MRK | 65,011,000,000 | 2025 | False | False | False | 000000000 |
| 76 | 0001730168 | Broadcom Inc. | AVGO | 63,887,000,000 | 2025 | False | False | True | 000000000 |
| 77 | 0000047217 | HP INC | HPQ | 63,460,000,000 | 2021 | False | False | False | 000000000 |
| 78 | 0000027904 | DELTA AIR LINES, INC. | DAL | 63,364,000,000 | 2025 | False | False | False | 000000000 |
| 79 | 0001618673 | Performance Food Group Co | PFGC | 63,298,900,000 | 2025 | False | False | False | 000000000 |
| 80 | 0000081061 | PUBLIX SUPER MARKETS INC |  | 63,209,000,000 | 2025 | False | False | False | 000000000 |
| 81 | 0001122304 | AETNA INC /PA/ |  | 63,155,000,000 | 2016 | True | False | False | 000000000 |
| 82 | 0001177394 | TD SYNNEX CORP | SNX | 62,508,086,000 | 2025 | False | False | False | 000000000 |
| 83 | 0000315189 | DEERE & CO | DE | 61,251,000,000 | 2023 | False | False | False | 000000000 |
| 84 | 0001551152 | AbbVie Inc. | ABBV | 61,160,000,000 | 2025 | False | False | False | 000000000 |
| 85 | 0001859392 | Galaxy Digital Inc. | GLXY | 60,406,728,000 | 2025 | True | False | True | 000000000 |
| 86 | 0000109198 | TJX COMPANIES INC /DE/ | TJX | 60,372,000,000 | 2025 | False | False | False | 000000000 |
| 87 | 0000029915 | DOW CHEMICAL CO /DE/ |  | 60,278,000,000 | 2018 | False | False | False | 000000000 |
| 88 | 0001001039 | TWDC Enterprises 18 Corp. |  | 59,434,000,000 | 2018 | False | False | False | 000000000 |
| 89 | 0000896159 | Chubb Ltd | CB | 59,402,000,000 | 2025 | True | False | False | 000000000 |
| 90 | 0000100517 | United Airlines Holdings, Inc. | UAL | 59,070,000,000 | 2025 | False | False | False | 000000000 |
| 91 | 0000789460 | WORLD KINECT CORP | WKC | 59,043,100,000 | 2022 | False | False | False | 000000000 |
| 92 | 0000005272 | AMERICAN INTERNATIONAL GROUP, INC. | AIG | 58,327,000,000 | 2015 | True | False | False | 000000000 |
| 93 | 0001061219 | ENTERPRISE PRODUCTS PARTNERS L.P. | EPD;EPDU | 58,186,000,000 | 2022 | False | True | False | 000000000 |
| 94 | 0001070423 | PLAINS ALL AMERICAN PIPELINE LP | PAA;PAAPU | 57,342,000,000 | 2022 | False | False | False | 000000000 |
| 95 | 0001581990 | PLAINS GP HOLDINGS LP | PAGP | 57,342,000,000 | 2022 | False | False | False | 000000000 |
| 96 | 0000858877 | CISCO SYSTEMS, INC. | CSCO | 56,998,000,000 | 2023 | False | False | False | 000000000 |
| 97 | 0001751788 | DOW INC. | DOW | 56,902,000,000 | 2022 | False | False | True | 000000000 |
| 98 | 0001091667 | CHARTER COMMUNICATIONS, INC. /MO/ | CHTR;CHTRP | 55,085,000,000 | 2024 | False | False | False | 000000000 |
| 99 | 0001271833 | CCO HOLDINGS LLC |  | 55,085,000,000 | 2024 | False | False | False | 000000000 |
| 100 | 0000006201 | American Airlines Group Inc. | AAL | 54,633,000,000 | 2025 | False | False | False | 000001000 |
| 101 | 0000100493 | TYSON FOODS, INC. | TSN | 54,441,000,000 | 2025 | False | False | False | 000000000 |
| 102 | 0001161154 | Energy Transfer Operating, L.P. |  | 54,213,000,000 | 2019 | False | False | False | 000000000 |
| 103 | 0000927628 | CAPITAL ONE FINANCIAL CORP | COF;COF-PI;COF-PJ;COF-PK;COF-PL;COF-PN | 53,434,000,000 | 2025 | True | False | False | 000000000 |
| 104 | 0001897762 | Ingram Micro Holding Corp | INGM | 52,556,263,000 | 2025 | False | False | True | 000000000 |
| 105 | 0000040533 | GENERAL DYNAMICS CORP | GD | 52,550,000,000 | 2025 | False | False | False | 000000000 |
| 106 | 0001543151 | Uber Technologies, Inc | UBER | 52,017,000,000 | 2025 | False | False | False | 000001000 |
| 107 | 0000764478 | BEST BUY CO INC | BBY | 51,761,000,000 | 2021 | False | False | False | 000000000 |
| 108 | 0000320187 | NIKE, Inc. | NKE | 51,362,000,000 | 2023 | False | False | False | 000000000 |
| 109 | 0001489393 | LyondellBasell Industries N.V. | LYB | 50,451,000,000 | 2022 | False | False | False | 000000000 |
| 110 | 0000086312 | TRAVELERS COMPANIES, INC. | TRV | 48,828,000,000 | 2025 | True | False | False | 000000000 |
| 111 | 0001666700 | DuPont de Nemours, Inc. | DD | 48,778,000,000 | 2015 | False | False | False | 000000000 |
| 112 | 0000014272 | BRISTOL MYERS SQUIBB CO | BMY;CELG-RI | 48,300,000,000 | 2024 | False | False | False | 000000000 |
| 113 | 0000021344 | COCA COLA CO | KO | 47,941,000,000 | 2025 | False | False | False | 000000000 |
| 114 | 0000823277 | CHS INC | CHSCP;CHSCL;CHSCM;CHSCN;CHSCO | 47,791,666,000 | 2022 | False | False | False | 000000000 |
| 115 | 0001534504 | PBF Energy Inc. | PBF | 46,830,300,000 | 2022 | False | False | False | 000000000 |
| 116 | 0001566011 | PBF Holding Co LLC |  | 46,780,600,000 | 2022 | False | False | False | 000000000 |
| 117 | 0000937834 | METROPOLITAN LIFE INSURANCE CO |  | 45,447,000,000 | 2022 | True | False | False | 000000000 |
| 118 | 0001179929 | MOLINA HEALTHCARE, INC. | MOH | 45,426,000,000 | 2025 | True | False | False | 000000000 |
| 119 | 0001065280 | NETFLIX INC | NFLX | 45,183,036,000 | 2025 | False | False | False | 000000000 |
| 120 | 0000097745 | THERMO FISHER SCIENTIFIC INC. | TMO | 44,915,000,000 | 2022 | False | False | False | 000000000 |
| 121 | 0000001800 | ABBOTT LABORATORIES | ABT | 44,328,000,000 | 2025 | False | False | False | 000000000 |
| 122 | 0000804328 | QUALCOMM INC/DE | QCOM | 44,284,000,000 | 2025 | False | False | False | 000000000 |
| 123 | 0001018003 | INGRAM MICRO INC |  | 43,025,852,000 | 2015 | False | False | False | 000000000 |
| 124 | 0000029534 | DOLLAR GENERAL CORP | DG | 42,724,369,000 | 2025 | False | False | False | 000000000 |
| 125 | 0001133421 | NORTHROP GRUMMAN CORP /DE/ | NOC | 41,954,000,000 | 2025 | False | False | False | 000000000 |
| 126 | 0000742278 | RPC INC | RES | 41,919,000,000 | 2015 | False | False | False | 000000000 |
| 127 | 0000773840 | HONEYWELL INTERNATIONAL INC | HON | 41,802,000,000 | 2018 | False | False | False | 000000000 |
| 128 | 0000701221 | Cigna Holding Co |  | 41,616,000,000 | 2017 | True | False | False | 000000000 |
| 129 | 0001108524 | Salesforce, Inc. | CRM | 41,525,000,000 | 2025 | False | False | False | 000000000 |
| 130 | 0000073309 | NUCOR CORP | NUE | 41,512,000,000 | 2022 | False | False | False | 000000000 |
| 131 | 0001437107 | Warner Bros. Discovery, Inc. |  | 41,321,000,000 | 2023 | False | False | False | 000000011 |
| 132 | 0000004962 | AMERICAN EXPRESS CO | AXP | 41,304,000,000 | 2025 | True | False | False | 000000000 |
| 133 | 0001138118 | CBRE GROUP, INC. | CBRE | 40,550,000,000 | 2025 | True | False | False | 000000000 |
| 134 | 0001403161 | VISA INC. | V | 40,000,000,000 | 2025 | False | False | False | 000000000 |
| 135 | 0001665918 | US Foods Holding Corp. | USFD | 39,424,000,000 | 2025 | False | False | False | 000000000 |
| 136 | 0001103982 | Mondelez International, Inc. | MDLZ | 38,537,000,000 | 2025 | False | False | False | 000000000 |
| 137 | 0001915657 | HF Sinclair Corp | DINO | 38,205,000,000 | 2022 | False | False | True | 000000000 |
| 138 | 0001996810 | GE Vernova Inc. | GEV | 38,068,000,000 | 2025 | False | False | True | 000000000 |
| 139 | 0001023128 | LITHIA MOTORS INC | LAD | 37,634,900,000 | 2025 | False | False | False | 000000000 |
| 140 | 0000849395 | CRH PUBLIC LTD CO | CRH | 37,447,000,000 | 2025 | False | False | False | 000000000 |
| 141 | 0000723125 | MICRON TECHNOLOGY INC | MU | 37,378,000,000 | 2025 | False | False | False | 000000000 |
| 142 | 0000790703 | TECH DATA CORP |  | 37,238,950,000 | 2018 | False | False | False | 000000000 |
| 143 | 0000829224 | STARBUCKS CORP | SBUX | 37,184,400,000 | 2025 | False | False | False | 000000000 |
| 144 | 0000053669 | JOHNSON CONTROLS INC |  | 37,179,000,000 | 2015 | False | False | False | 000000000 |
| 145 | 0000007536 | ARROW ELECTRONICS, INC. | ARW | 37,124,422,000 | 2022 | False | False | False | 000000000 |
| 146 | 0000882184 | HORTON D R INC /DE/ | DHI | 36,801,400,000 | 2024 | False | False | False | 000000000 |
| 147 | 0001647339 | Accenture Holdings plc |  | 36,765,478,000 | 2017 | False | False | False | 000000000 |
| 148 | 0000318154 | AMGEN INC | AMGN | 36,751,000,000 | 2025 | False | False | False | 000000000 |
| 149 | 0000797468 | OCCIDENTAL PETROLEUM CORP /DE/ | OXY;OXY-WT | 36,634,000,000 | 2022 | False | False | False | 000000000 |
| 150 | 0001613103 | Medtronic plc | MDT | 36,364,000,000 | 2025 | False | False | False | 000000000 |
| 151 | 0000087347 | SLB LIMITED/NV | SLB | 36,289,000,000 | 2024 | False | False | False | 000000000 |
| 152 | 0001109357 | EXELON CORP | EXC | 35,978,000,000 | 2018 | False | True | False | 000000000 |
| 153 | 0000920760 | LENNAR CORP /NEW/ | LEN;LEN-B | 35,441,452,000 | 2024 | False | False | False | 000000000 |
| 154 | 0000066740 | 3M CO | MMM | 35,355,000,000 | 2021 | False | False | False | 000000000 |
| 155 | 0000075362 | PACCAR INC | PCAR | 35,127,400,000 | 2023 | False | False | False | 000000000 |
| 156 | 0000898293 | JABIL INC | JBL | 34,702,000,000 | 2023 | False | False | False | 000000000 |
| 157 | 0000002488 | ADVANCED MICRO DEVICES INC | AMD | 34,639,000,000 | 2025 | False | False | False | 000000000 |
| 158 | 0001834584 | Coupang, Inc. | CPNG | 34,534,000,000 | 2025 | False | False | True | 000000000 |
| 159 | 0001645590 | Hewlett Packard Enterprise Co | HPE;HPE-PC | 34,296,000,000 | 2025 | False | False | False | 000000000 |
| 160 | 0001012569 | Energy Transfer, LP |  | 34,292,000,000 | 2015 | False | True | False | 000000000 |
| 161 | 0000026172 | CUMMINS INC | CMI | 34,102,000,000 | 2024 | False | False | False | 000000000 |
| 162 | 0001707925 | LINDE PLC | LIN | 33,986,000,000 | 2025 | False | False | True | 000000000 |
| 163 | 0001039684 | ONEOK INC /NEW/ | OKE | 33,629,000,000 | 2025 | False | True | False | 000000000 |
| 164 | 0000101830 | SPRINT LLC |  | 33,600,000,000 | 2018 | False | False | False | 000000000 |
| 165 | 0000003570 | Cheniere Energy, Inc. | LNG | 33,428,000,000 | 2022 | False | True | False | 000000000 |
| 166 | 0001633917 | PayPal Holdings, Inc. | PYPL | 33,172,000,000 | 2025 | False | False | False | 000000000 |
| 167 | 0001141391 | Mastercard Inc | MA | 32,791,000,000 | 2025 | False | False | False | 000000000 |
| 168 | 0001858681 | Apollo Global Management, Inc. | APO;APOS | 32,644,000,000 | 2023 | True | False | True | 000000000 |
| 169 | 0000882095 | GILEAD SCIENCES, INC. | GILD | 32,639,000,000 | 2015 | False | False | False | 000000000 |
| 170 | 0001170010 | CARMAX INC | KMX | 31,900,412,000 | 2021 | False | False | False | 000000000 |
| 171 | 0001019849 | PENSKE AUTOMOTIVE GROUP, INC. | PAG | 31,864,800,000 | 2024 | False | False | False | 000000000 |
| 172 | 0001020859 | UNITED NATURAL FOODS INC | UNFI | 31,784,000,000 | 2025 | False | False | False | 000000001 |
| 173 | 0001326160 | Duke Energy CORP | DUK;DUKB;DUK-PA;DUKU | 31,741,000,000 | 2025 | False | True | False | 000000000 |
| 174 | 0001013871 | NRG ENERGY, INC. | NRG | 31,543,000,000 | 2022 | False | True | False | 100000000 |
| 175 | 0001105705 | WARNER MEDIA, LLC |  | 31,271,000,000 | 2017 | False | False | False | 000000000 |
| 176 | 0002005951 | Smurfit Westrock plc | SW | 31,179,000,000 | 2025 | False | False | True | 000000000 |
| 177 | 0002011641 | Ferguson Enterprises Inc. /DE/ | FERG | 30,762,000,000 | 2025 | False | False | True | 000000000 |
| 178 | 0001308161 | TWENTY-FIRST CENTURY FOX, INC. |  | 30,400,000,000 | 2018 | False | False | False | 000000000 |
| 179 | 0000813828 | Paramount Global |  | 30,154,000,000 | 2022 | False | False | False | 000000000 |
| 180 | 0001832433 | Ferguson (Jersey) Ltd |  | 29,734,000,000 | 2023 | False | False | True | 000000000 |
| 181 | 0002041610 | Skydance Corp | SKYD;SKYD-WT | 29,652,000,000 | 2023 | False | False | True | 000000000 |
| 182 | 0000092122 | SOUTHERN CO | SO;SOJC;SOJD;SOJE;SOJF;SOMN | 29,553,000,000 | 2025 | False | True | False | 000000000 |
| 183 | 0001047122 | RAYTHEON CO/ |  | 29,176,000,000 | 2019 | False | False | False | 000000000 |
| 184 | 0001099590 | MERCADOLIBRE INC | MELI | 28,893,000,000 | 2025 | False | False | False | 000000000 |
| 185 | 0000036104 | US BANCORP \DE\ | USB;USB-PA;USB-PH;USB-PP;USB-PQ;USB-PR;USB-PS | 28,656,000,000 | 2025 | True | False | False | 000000000 |
| 186 | 0000866374 | FLEX LTD. | FLEX | 28,502,000,000 | 2022 | False | False | False | 000000000 |
| 187 | 0001050915 | QUANTA SERVICES, INC. | PWR | 28,479,697,000 | 2025 | False | False | False | 000000000 |
| 188 | 0002046386 | Medline Inc. | MDLN | 28,432,000,000 | 2025 | False | False | True | 000000000 |
| 189 | 0000006951 | APPLIED MATERIALS INC /DE | AMAT | 28,368,000,000 | 2025 | False | False | False | 000000000 |
| 190 | 0000874766 | HARTFORD INSURANCE GROUP, INC. | HIG;HIG-PG | 28,368,000,000 | 2025 | True | False | False | 000000000 |
| 191 | 0001527469 | Athene Holding Ltd. | ATH-PA;ATH-PB;ATH-PD;ATH-PE;ATHS | 28,194,000,000 | 2023 | True | False | False | 000000000 |
| 192 | 0000092380 | SOUTHWEST AIRLINES CO | LUV | 28,063,000,000 | 2025 | False | False | False | 000000000 |
| 193 | 0001701605 | Baker Hughes Co | BKR | 27,829,000,000 | 2024 | False | False | True | 000000000 |
| 194 | 0000350698 | AUTONATION, INC. | AN | 27,631,400,000 | 2025 | False | False | False | 000000000 |
| 195 | 0001551182 | Eaton Corp plc | ETN | 27,448,000,000 | 2025 | False | False | False | 000000000 |
| 196 | 0000794367 | Macy's, Inc. | M | 27,079,000,000 | 2015 | False | False | False | 000000000 |
| 197 | 0000062709 | MARSH & MCLENNAN COMPANIES, INC. | MRSH | 26,981,000,000 | 2025 | True | False | False | 000000000 |
| 198 | 0001075531 | Booking Holdings Inc. | BKNG | 26,917,000,000 | 2025 | False | False | False | 000000000 |
| 199 | 0000063908 | MCDONALDS CORP | MCD | 26,885,000,000 | 2025 | False | False | False | 000000000 |
| 200 | 0000313616 | DANAHER CORP /DE/ | DHR | 26,643,000,000 | 2022 | False | False | False | 000000000 |

## 9. Zombies by cause and by SIC division

Core zombies split by the sign of operating income. `negative_ebit`: operating income below 0, so ICR is negative. `nonneg_ebit`: operating income of 0 or more but below the interest expense.

| fy | core_firms_present | zombies | negative_ebit | nonneg_ebit | share_negative |
| --- | --- | --- | --- | --- | --- |
| 2017 | 2821 | 533 | 484 | 49 | 90.8% |
| 2018 | 2806 | 519 | 472 | 47 | 90.9% |
| 2019 | 2737 | 532 | 489 | 43 | 91.9% |
| 2020 | 2768 | 563 | 530 | 33 | 94.1% |
| 2021 | 2803 | 562 | 540 | 22 | 96.1% |
| 2022 | 2759 | 553 | 525 | 28 | 94.9% |
| 2023 | 2640 | 486 | 463 | 23 | 95.3% |
| 2024 | 2576 | 496 | 464 | 32 | 93.5% |
| 2025 | 2484 | 485 | 440 | 45 | 90.7% |

By SIC division for FY2019 and FY2024 (all years: `s9_zombies_by_division.csv`):

| fy | sic_division | core_firms_present | zombies | zombies_negative_ebit | zombies_nonneg_ebit | share_of_present |
| --- | --- | --- | --- | --- | --- | --- |
| 2019 | Agriculture, Forestry and Fishing | 14 | 2 | 2 | 0 | 14.3% |
| 2019 | Construction | 40 | 2 | 1 | 1 | 5.0% |
| 2019 | Manufacturing | 1453 | 299 | 281 | 18 | 20.6% |
| 2019 | Mining | 206 | 44 | 41 | 3 | 21.4% |
| 2019 | Retail Trade | 166 | 18 | 15 | 3 | 10.8% |
| 2019 | Services | 601 | 131 | 119 | 12 | 21.8% |
| 2019 | Transportation, Communications, Electric, Gas and Sanitary Services | 156 | 21 | 16 | 5 | 13.5% |
| 2019 | Wholesale Trade | 100 | 15 | 14 | 1 | 15.0% |
| 2024 | Agriculture, Forestry and Fishing | 16 | 3 | 3 | 0 | 18.8% |
| 2024 | Construction | 50 | 5 | 4 | 1 | 10.0% |
| 2024 | Manufacturing | 1361 | 274 | 259 | 15 | 20.1% |
| 2024 | Mining | 159 | 26 | 26 | 0 | 16.4% |
| 2024 | Retail Trade | 164 | 18 | 18 | 0 | 11.0% |
| 2024 | Services | 572 | 141 | 130 | 11 | 24.7% |
| 2024 | Transportation, Communications, Electric, Gas and Sanitary Services | 130 | 25 | 20 | 5 | 19.2% |
| 2024 | Wholesale Trade | 85 | 4 | 4 | 0 | 4.7% |

## 10. Year-over-year sanity flags

A firm-year is flagged when a value differs by more than 20 times from the same firm's value in the previous or the next fiscal year and **both values are at least 100,000 USD** (absolute values; zero or empty values and empty years in between are not compared). Both years of a flagged pair are listed. `outlier` says which value is the odd one out, from the row's point of view: `this` (the value of this row disagrees with all of its neighbours, or with the only one), `neighbor`, `undetermined` (for example a two-year series: nothing says which is wrong) or `level_shift` (neither value disagrees with all its neighbours, so the level changed and stayed changed). **No value is changed**: these are leads to check against the filing, not corrections.

Flag rows by field (a pair gives two rows):

| field | flag_rows | rows_that_are_the_outlier |
| --- | --- | --- |
| revenue | 664 | 147 |
| total_debt | 1392 | 338 |
| interest_expense | 378 | 91 |
| operating_income | 2040 | 629 |

The 50 largest ratios (all of them, with URLs: `s10_sanity_flags.csv`):

| cik | name | fy | field | value | neighbor | neighbor_fy | neighbor_value | ratio | outlier | accession |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0001286681 | DOMINOS PIZZA INC | 2023 | total_debt | 4,990,428,000 | next | 2024 | 100,000 | 49,904.3 | level_shift | 0000950170-25-025223 |
| 0001286681 | DOMINOS PIZZA INC | 2024 | total_debt | 100,000 | previous | 2023 | 4,990,428,000 | 49,904.3 | level_shift | 0001193125-26-062321 |
| 0000732712 | VERIZON COMMUNICATIONS INC | 2015 | total_debt | 6,000,000 | next | 2016 | 108,078,000,000 | 18,013.0 | neighbor | 0001193125-17-050292 |
| 0000732712 | VERIZON COMMUNICATIONS INC | 2016 | total_debt | 108,078,000,000 | previous | 2015 | 6,000,000 | 18,013.0 | this | 0000732712-18-000009 |
| 0001603923 | Weatherford International Corp | 2016 | total_debt | 2,000,000 | next | 2017 | 7,678,000,000 | 3,839.0 | this | 0001603923-17-000050 |
| 0001603923 | Weatherford International Corp | 2017 | total_debt | 7,678,000,000 | previous | 2016 | 2,000,000 | 3,839.0 | neighbor | 0001603923-19-000025 |
| 0000802481 | PILGRIMS PRIDE CORP | 2024 | total_debt | 3,206,971,000 | next | 2025 | 924,000 | 3,470.7 | neighbor | 0000802481-25-000011;0000802481-26-000011 |
| 0000802481 | PILGRIMS PRIDE CORP | 2025 | total_debt | 924,000 | previous | 2024 | 3,206,971,000 | 3,470.7 | this | 0000802481-26-000011 |
| 0001285785 | MOSAIC CO | 2020 | total_debt | 100,000 | next | 2021 | 302,800,000 | 3,028.0 | this | 0001618034-22-000004 |
| 0001285785 | MOSAIC CO | 2021 | total_debt | 302,800,000 | previous | 2020 | 100,000 | 3,028.0 | neighbor | 0001618034-23-000003 |
| 0000018349 | SYNOVUS FINANCIAL CORP | 2021 | total_debt | 200,000 | next | 2022 | 603,384,000 | 3,016.9 | undetermined | 0000018349-23-000061 |
| 0000018349 | SYNOVUS FINANCIAL CORP | 2022 | total_debt | 603,384,000 | previous | 2021 | 200,000 | 3,016.9 | undetermined | 0000018349-24-000053 |
| 0001080709 | ARENA PHARMACEUTICALS INC | 2019 | revenue | 806,431,000 | next | 2020 | 319,000 | 2,528.0 | this | 0001080709-22-000006 |
| 0001080709 | ARENA PHARMACEUTICALS INC | 2020 | revenue | 319,000 | previous | 2019 | 806,431,000 | 2,528.0 | neighbor | 0001080709-22-000006 |
| 0000010456 | BAXTER INTERNATIONAL INC | 2024 | total_debt | 2,126,000,000 | next | 2025 | 1,000,000 | 2,126.0 | neighbor | 0001628280-26-007733 |
| 0000010456 | BAXTER INTERNATIONAL INC | 2025 | total_debt | 1,000,000 | previous | 2024 | 2,126,000,000 | 2,126.0 | this | 0001628280-26-007733 |
| 0001528849 | RH | 2022 | total_debt | 1,160,000 | next | 2023 | 2,413,581,000 | 2,080.7 | level_shift | 0001558370-23-004942 |
| 0001528849 | RH | 2023 | total_debt | 2,413,581,000 | previous | 2022 | 1,160,000 | 2,080.7 | level_shift | 0001558370-25-004329 |
| 0001811210 | Lucid Group, Inc. | 2020 | total_debt | 980,000 | next | 2021 | 1,986,791,000 | 2,027.3 | this | 0001628280-22-004253;0001628280-22-004253 |
| 0001811210 | Lucid Group, Inc. | 2021 | total_debt | 1,986,791,000 | previous | 2020 | 980,000 | 2,027.3 | neighbor | 0001628280-23-005540;0001628280-23-005540 |
| 0001433270 | ANTERO RESOURCES Corp | 2024 | operating_income | 460,000 | next | 2025 | 883,646,000 | 1,921.0 | this | 0001104659-26-013386 |
| 0001433270 | ANTERO RESOURCES Corp | 2025 | operating_income | 883,646,000 | previous | 2024 | 460,000 | 1,921.0 | neighbor | 0001104659-26-013386 |
| 0000010456 | BAXTER INTERNATIONAL INC | 2017 | total_debt | 3,512,000,000 | next | 2018 | 2,000,000 | 1,756.0 | neighbor | 0001564590-19-003727;0001564590-19-003727 |
| 0000010456 | BAXTER INTERNATIONAL INC | 2018 | total_debt | 2,000,000 | previous | 2017 | 3,512,000,000 | 1,756.0 | this | 0001628280-20-003693 |
| 0001236275 | QXO, Inc. | 2024 | interest_expense | 100,000 | next | 2025 | 173,500,000 | 1,735.0 | neighbor | 0001628280-26-012601 |
| 0001236275 | QXO, Inc. | 2025 | interest_expense | 173,500,000 | previous | 2024 | 100,000 | 1,735.0 | this | 0001628280-26-012601 |
| 0001452936 | Pacific Oak Strategic Opportunity REIT, Inc. | 2016 | operating_income | 143,000 | next | 2017 | 247,884,000 | 1,733.5 | this | 0001452936-19-000003;0001452936-19-000003 |
| 0001452936 | Pacific Oak Strategic Opportunity REIT, Inc. | 2017 | operating_income | 247,884,000 | previous | 2016 | 143,000 | 1,733.5 | neighbor | 0001452936-20-000039;0001452936-20-000039 |
| 0001746109 | Bank First Corp | 2019 | total_debt | 39,800,000,000 | next | 2020 | 23,338,000 | 1,705.4 | level_shift | 0001104659-20-031995;0001104659-20-031995 |
| 0001746109 | Bank First Corp | 2020 | total_debt | 23,338,000 | previous | 2019 | 39,800,000,000 | 1,705.4 | level_shift | 0001410578-22-000397 |
| 0001220754 | ModivCare Inc | 2019 | total_debt | 308,000 | next | 2020 | 485,980,000 | 1,577.9 | level_shift | 0001220754-20-000007 |
| 0001220754 | ModivCare Inc | 2020 | total_debt | 485,980,000 | previous | 2019 | 308,000 | 1,577.9 | level_shift | 0001220754-22-000007 |
| 0001504461 | NGL Energy Partners LP | 2020 | total_debt | 2,183,000 | next | 2021 | 3,352,841,000 | 1,535.9 | this | 0001504461-22-000010 |
| 0001504461 | NGL Energy Partners LP | 2021 | total_debt | 3,352,841,000 | previous | 2020 | 2,183,000 | 1,535.9 | neighbor | 0001504461-23-000041;0001504461-23-000041 |
| 0000012659 | H&R BLOCK INC | 2015 | total_debt | 1,502,751,000 | next | 2016 | 981,000 | 1,531.9 | neighbor | 0001574842-16-000042;0001574842-17-000019 |
| 0000012659 | H&R BLOCK INC | 2016 | total_debt | 981,000 | previous | 2015 | 1,502,751,000 | 1,531.9 | this | 0001574842-18-000019 |
| 0000012659 | H&R BLOCK INC | 2016 | total_debt | 981,000 | next | 2017 | 1,495,635,000 | 1,524.6 | this | 0001574842-18-000019 |
| 0000012659 | H&R BLOCK INC | 2017 | total_debt | 1,495,635,000 | previous | 2016 | 981,000 | 1,524.6 | neighbor | 0001574842-19-000022;0001574842-19-000022 |
| 0001504461 | NGL Energy Partners LP | 2019 | total_debt | 3,169,326,000 | next | 2020 | 2,183,000 | 1,451.8 | neighbor | 0001504461-20-000022 |
| 0001504461 | NGL Energy Partners LP | 2020 | total_debt | 2,183,000 | previous | 2019 | 3,169,326,000 | 1,451.8 | this | 0001504461-22-000010 |
| 0001322439 | Eagle Bulk Shipping Inc. | 2016 | operating_income | -201,251,972 | next | 2017 | -140,056 | 1,436.9 | neighbor | 0001628280-19-002879 |
| 0001322439 | Eagle Bulk Shipping Inc. | 2017 | operating_income | -140,056 | previous | 2016 | -201,251,972 | 1,436.9 | this | 0001628280-20-003466 |
| 0001604778 | Qorvo, Inc. | 2022 | total_debt | 310,000 | next | 2023 | 438,740,000 | 1,415.3 | level_shift | 0001604778-24-000036 |
| 0001604778 | Qorvo, Inc. | 2023 | total_debt | 438,740,000 | previous | 2022 | 310,000 | 1,415.3 | level_shift | 0001604778-25-000041 |
| 0001946573 | Nakamoto Inc. | 2024 | total_debt | 148,828 | next | 2025 | 209,557,614 | 1,408.1 | neighbor | 0001641172-25-001314 |
| 0001946573 | Nakamoto Inc. | 2025 | total_debt | 209,557,614 | previous | 2024 | 148,828 | 1,408.1 | this | 0001493152-26-013601 |
| 0001366868 | Globalstar, Inc. | 2022 | operating_income | -221,029,000 | next | 2023 | -165,000 | 1,339.6 | level_shift | 0001366868-25-000033 |
| 0001366868 | Globalstar, Inc. | 2023 | operating_income | -165,000 | previous | 2022 | -221,029,000 | 1,339.6 | level_shift | 0001366868-26-000012 |
| 0001674416 | CRISPR Therapeutics AG | 2020 | revenue | 719,000 | next | 2021 | 914,963,000 | 1,272.5 | undetermined | 0000950170-23-003441 |
| 0001674416 | CRISPR Therapeutics AG | 2021 | revenue | 914,963,000 | previous | 2020 | 719,000 | 1,272.5 | undetermined | 0000950170-24-017571 |

