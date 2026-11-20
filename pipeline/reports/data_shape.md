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
| 2015 | 6720 | 2831 |
| 2016 | 6367 | 2777 |
| 2017 | 6165 | 2820 |
| 2018 | 6022 | 2805 |
| 2019 | 6041 | 2736 |
| 2020 | 6187 | 2766 |
| 2021 | 6500 | 2801 |
| 2022 | 6412 | 2757 |
| 2023 | 5932 | 2638 |
| 2024 | 5529 | 2565 |
| 2025 | 5137 | 2472 |

## 2. Zombies per fiscal year, FY2017 to FY2025

Zombie: age at the fiscal year of 10 or more and ICR below 1 in that year and the two before. FY2015 and FY2016 flags look back at FY2013 and FY2014, which are not in the panel. Shares are shown both over core firms present and over core firms with a computable ICR.

| fy | core_firms_present | zombies | share_of_present | core_firms_with_icr | share_of_with_icr |
| --- | --- | --- | --- | --- | --- |
| 2017 | 2820 | 534 | 18.94% | 1904 | 28.05% |
| 2018 | 2805 | 519 | 18.50% | 1869 | 27.77% |
| 2019 | 2736 | 532 | 19.44% | 1846 | 28.82% |
| 2020 | 2766 | 563 | 20.35% | 1855 | 30.35% |
| 2021 | 2801 | 562 | 20.06% | 1839 | 30.56% |
| 2022 | 2757 | 553 | 20.06% | 1809 | 30.57% |
| 2023 | 2638 | 486 | 18.42% | 1724 | 28.19% |
| 2024 | 2565 | 494 | 19.26% | 1626 | 30.38% |
| 2025 | 2472 | 482 | 19.50% | 1521 | 31.69% |

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
| 2019 | still_zombie | 132 | 59 |
| 2019 | other_alive | 88 | 42 |
| 2020 | bankruptcy | 43 | 30 |
| 2020 | delisted_or_deregistered | 142 | 95 |
| 2020 | stopped_filing | 64 | 24 |
| 2020 | recovered | 42 | 16 |
| 2020 | still_zombie | 166 | 65 |
| 2020 | other_alive | 106 | 40 |

CIK lists: `s3_outcomes_cik.csv`.

## 4. Healthy in FY2019, below 1 in FY2020

Core firms with ICR of 1.5 or more in FY2019 and below 1 in FY2020: **192**. CIK list: `s4_reversals.csv`.

## 5. Zombies of FY2019 to FY2021 with a bankruptcy in 2022 to 2023

Core firms flagged zombie in at least one of FY2019, FY2020, FY2021 with a bankruptcy event filed 2022-01-01 to 2023-12-31: **30**. CIK list: `s5_zombie_then_bankrupt.csv`.

## 6. Breaking rate

Breaking rate = (operating income - interest expense) / total debt, in percentage points: how far the rate on all debt can rise before interest equals operating income. Only years with interest above 0, debt above 0 and a known operating income have one. `latest_year` takes each core firm's latest such year; `fy2024` uses FY2024 only. "Below +k pp" counts firms whose breaking rate is under k, including firms already below 0.

| view | plus_pp | firms_below | firms_total | firms_left_out |
| --- | --- | --- | --- | --- |
| latest_year | 1 | 1303 | 2443 | 2082 |
| latest_year | 2 | 1325 | 2443 | 2082 |
| latest_year | 3 | 1351 | 2443 | 2082 |
| latest_year | 4 | 1372 | 2443 | 2082 |
| latest_year | 5 | 1395 | 2443 | 2082 |
| fy2024 | 1 | 432 | 1042 | 1523 |
| fy2024 | 2 | 440 | 1042 | 1523 |
| fy2024 | 3 | 458 | 1042 | 1523 |
| fy2024 | 4 | 467 | 1042 | 1523 |
| fy2024 | 5 | 480 | 1042 | 1523 |

Histogram in 0.5 pp buckets (-10 to +20): `s6_histogram.csv`.

## 7. Data quality

Counts are over present rows. `gap_rows_with_balance_sheet` counts years that have no usable income-statement value, so the panel row is empty, but the filing has a balance-sheet value for that year. For `core` it counts non-financial, non-utility firms (age at a gap year is unknown).

| fy | population | rows_present | missing_operating_income | missing_interest_expense | missing_total_debt | fye_not_december | gap_rows_with_balance_sheet |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 2015 | all | 6720 | 945 | 1785 | 3443 | 1809 | 546 |
| 2015 | core | 2831 | 151 | 745 | 1237 | 945 | 356 |
| 2016 | all | 6367 | 821 | 1746 | 3244 | 1598 | 540 |
| 2016 | core | 2777 | 134 | 751 | 1241 | 837 | 367 |
| 2017 | all | 6165 | 770 | 1753 | 3063 | 1458 | 493 |
| 2017 | core | 2820 | 127 | 799 | 1240 | 800 | 350 |
| 2018 | all | 6022 | 736 | 1708 | 2938 | 1398 | 571 |
| 2018 | core | 2805 | 114 | 805 | 1215 | 793 | 428 |
| 2019 | all | 6041 | 546 | 1741 | 3000 | 1339 | 588 |
| 2019 | core | 2736 | 90 | 793 | 1174 | 775 | 445 |
| 2020 | all | 6187 | 508 | 1821 | 2930 | 1394 | 924 |
| 2020 | core | 2766 | 107 | 811 | 1164 | 834 | 399 |
| 2021 | all | 6500 | 485 | 2169 | 3293 | 1383 | 675 |
| 2021 | core | 2801 | 120 | 845 | 1218 | 837 | 311 |
| 2022 | all | 6412 | 463 | 2129 | 3257 | 1291 | 349 |
| 2022 | core | 2757 | 103 | 827 | 1216 | 764 | 210 |
| 2023 | all | 5932 | 462 | 1816 | 2902 | 1174 | 320 |
| 2023 | core | 2638 | 99 | 794 | 1175 | 714 | 185 |
| 2024 | all | 5529 | 784 | 2169 | 2662 | 1106 | 360 |
| 2024 | core | 2565 | 98 | 820 | 1148 | 697 | 137 |
| 2025 | all | 5137 | 757 | 2125 | 2526 | 1054 | 350 |
| 2025 | core | 2472 | 106 | 834 | 1131 | 695 | 106 |

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
| 26 | 0001534701 | Phillips 66 | PSX | 169,990,000,000 | 2022 | False | False | False | 000000000 |
| 27 | 0000354950 | HOME DEPOT, INC. | HD | 164,683,000,000 | 2025 | False | False | False | 000000000 |
| 28 | 0000056873 | KROGER CO | KR | 150,039,000,000 | 2023 | False | False | False | 000000000 |
| 29 | 0001618921 | Walgreens Boots Alliance, Inc. |  | 147,658,000,000 | 2024 | False | False | False | 000000000 |
| 30 | 0000732712 | VERIZON COMMUNICATIONS INC | VZ | 138,191,000,000 | 2025 | False | False | False | 000000000 |
| 31 | 0000913760 | StoneX Group Inc. | SNEX | 132,378,200,000 | 2025 | True | False | False | 000000000 |
| 32 | 0000049071 | HUMANA INC | HUM | 129,664,000,000 | 2025 | True | False | False | 000000000 |
| 33 | 0001166691 | COMCAST CORP | CMCSA;CCZ | 123,731,000,000 | 2024 | False | False | False | 000000000 |
| 34 | 0000040545 | GENERAL ELECTRIC CO | GE | 119,469,000,000 | 2016 | False | False | False | 000000000 |
| 35 | 0001571996 | Dell Technologies Inc. | DELL | 113,538,000,000 | 2025 | False | False | False | 000000000 |
| 36 | 0000070858 | BANK OF AMERICA CORP /DE/ | BAC;BML-PG;BML-PL;BAC-PB;BAC-PK;BAC-PE;BAC-PL;BAC-PM;BAC-PN;BAC-PO;BAC-PP;BAC-PQ;BAC-PS;BACRP;BML-PH;BML-PJ;MER-PK | 113,097,000,000 | 2025 | True | False | False | 000000000 |
| 37 | 0000027419 | TARGET CORP | TGT | 109,120,000,000 | 2022 | False | False | False | 000000000 |
| 38 | 0001532063 | Express Scripts Holding Co. |  | 101,751,800,000 | 2015 | False | False | False | 000000000 |
| 39 | 0000007084 | Archer-Daniels-Midland Co | ADM | 101,556,000,000 | 2022 | False | False | False | 000000000 |
| 40 | 0000078003 | PFIZER INC | PFE | 101,175,000,000 | 2022 | False | False | False | 000000000 |
| 41 | 0000012927 | BOEING CO | BA;BA-PA | 101,127,000,000 | 2018 | False | False | False | 000011110 |
| 42 | 0001090727 | UNITED PARCEL SERVICE INC | UPS | 100,338,000,000 | 2022 | False | False | False | 000000000 |
| 43 | 0001318605 | Tesla, Inc. | TSLA | 97,690,000,000 | 2024 | False | False | False | 111000000 |
| 44 | 0000060667 | LOWES COMPANIES INC | LOW | 97,059,000,000 | 2022 | False | False | False | 000000000 |
| 45 | 0001048911 | FEDEX CORP | FDX | 94,720,000,000 | 2025 | False | False | False | 000000000 |
| 46 | 0001744489 | Walt Disney Co | DIS | 94,425,000,000 | 2025 | False | False | True | 000000000 |
| 47 | 0000200406 | JOHNSON & JOHNSON | JNJ | 94,193,000,000 | 2025 | False | False | False | 000000000 |
| 48 | 0000077476 | PEPSICO INC | PEP | 93,925,000,000 | 2025 | False | False | False | 000000000 |
| 49 | 0001276187 | Energy Transfer LP | ET;ET-PI | 89,876,000,000 | 2022 | False | True | False | 000000000 |
| 50 | 0000101829 | RTX Corp | RTX | 88,603,000,000 | 2025 | False | False | False | 000000000 |
| 51 | 0000072971 | WELLS FARGO & COMPANY/MN | WFC;WFC-PY;WFC-PL;WFC-PC;WFCNP;WFC-PA;WFC-PD;WFC-PZ | 88,389,000,000 | 2017 | True | False | False | 000000000 |
| 52 | 0001283699 | T-Mobile US, Inc. | TMUS;TMUSI;TMUSL;TMUSZ | 88,309,000,000 | 2025 | False | False | False | 000000000 |
| 53 | 0000080661 | PROGRESSIVE CORP/OH/ | PGR | 87,671,000,000 | 2025 | True | False | False | 000000000 |
| 54 | 0000200245 | Citigroup Global Markets Holdings Inc. |  | 85,225,000,000 | 2025 | True | False | False | 000000000 |
| 55 | 0000831001 | CITIGROUP INC | C;C-PN;C-PR | 85,225,000,000 | 2025 | True | False | False | 000000000 |
| 56 | 0000080424 | PROCTER & GAMBLE Co | PG | 84,284,000,000 | 2025 | False | False | False | 000000000 |
| 57 | 0001646972 | Albertsons Companies, Inc. | ACI | 83,172,500,000 | 2025 | False | False | False | 000000000 |
| 58 | 0000051143 | INTERNATIONAL BUSINESS MACHINES CORP | IBM | 81,741,000,000 | 2015 | False | False | False | 000000000 |
| 59 | 0000096021 | SYSCO CORP | SYY | 81,370,000,000 | 2025 | False | False | False | 000000000 |
| 60 | 0000050863 | INTEL CORP | INTC | 79,024,000,000 | 2021 | False | False | False | 000000001 |
| 61 | 0001163165 | CONOCOPHILLIPS | COP | 78,494,000,000 | 2022 | False | False | False | 100000000 |
| 62 | 0001099219 | METLIFE INC | MET;MET-PA;MET-PE;MET-PF | 77,084,000,000 | 2025 | True | False | False | 000000000 |
| 63 | 0000860730 | HCA Healthcare, Inc. | HCA | 75,600,000,000 | 2025 | False | False | False | 000000000 |
| 64 | 0000936468 | LOCKHEED MARTIN CORP | LMT | 75,048,000,000 | 2025 | False | False | False | 000000000 |
| 65 | 0001413329 | Philip Morris International Inc. | PM | 73,908,000,000 | 2015 | False | False | False | 000000000 |
| 66 | 0001137774 | PRUDENTIAL FINANCIAL INC | PRU;PFH;PRH;PRS | 71,247,000,000 | 2021 | True | False | False | 000000000 |
| 67 | 0001996862 | Bunge Global SA | BG | 70,329,000,000 | 2025 | False | False | True | 000000000 |
| 68 | 0001467373 | Accenture plc | ACN | 69,672,977,000 | 2025 | False | False | False | 000000000 |
| 69 | 0000899051 | ALLSTATE CORP | ALL;ALL-PH;ALL-PB;ALL-PI;ALL-PJ | 67,685,000,000 | 2025 | True | False | False | 000000000 |
| 70 | 0000018230 | CATERPILLAR INC | CAT | 67,589,000,000 | 2025 | False | False | False | 000000000 |
| 71 | 0001341439 | ORACLE CORP | ORCL;ORCL-PD | 67,357,000,000 | 2025 | False | False | False | 000000000 |
| 72 | 0001144519 | BUNGELTD |  | 67,232,000,000 | 2022 | False | False | False | 000000000 |
| 73 | 0000059478 | ELI LILLY & Co | LLY | 65,179,000,000 | 2025 | False | False | False | 000000000 |
| 74 | 0000310158 | Merck & Co., Inc. | MRK | 65,011,000,000 | 2025 | False | False | False | 000000000 |
| 75 | 0001730168 | Broadcom Inc. | AVGO | 63,887,000,000 | 2025 | False | False | True | 000000000 |
| 76 | 0000047217 | HP INC | HPQ | 63,460,000,000 | 2021 | False | False | False | 000000000 |
| 77 | 0000027904 | DELTA AIR LINES, INC. | DAL | 63,364,000,000 | 2025 | False | False | False | 000000000 |
| 78 | 0000081061 | PUBLIX SUPER MARKETS INC |  | 63,209,000,000 | 2025 | False | False | False | 000000000 |
| 79 | 0001122304 | AETNA INC /PA/ |  | 63,155,000,000 | 2016 | True | False | False | 000000000 |
| 80 | 0001177394 | TD SYNNEX CORP | SNX | 62,508,086,000 | 2025 | False | False | False | 000000000 |
| 81 | 0000315189 | DEERE & CO | DE | 61,251,000,000 | 2023 | False | False | False | 000000000 |
| 82 | 0001551152 | AbbVie Inc. | ABBV | 61,160,000,000 | 2025 | False | False | False | 000000000 |
| 83 | 0001859392 | Galaxy Digital Inc. | GLXY | 60,406,728,000 | 2025 | True | False | True | 000000000 |
| 84 | 0001001039 | TWDC Enterprises 18 Corp. |  | 59,434,000,000 | 2018 | False | False | False | 000000000 |
| 85 | 0000896159 | Chubb Ltd | CB | 59,402,000,000 | 2025 | True | False | False | 000000000 |
| 86 | 0000100517 | United Airlines Holdings, Inc. | UAL | 59,070,000,000 | 2025 | False | False | False | 000000000 |
| 87 | 0000789460 | WORLD KINECT CORP | WKC | 59,043,100,000 | 2022 | False | False | False | 000000000 |
| 88 | 0000005272 | AMERICAN INTERNATIONAL GROUP, INC. | AIG | 58,327,000,000 | 2015 | True | False | False | 000000000 |
| 89 | 0001061219 | ENTERPRISE PRODUCTS PARTNERS L.P. | EPD;EPDU | 58,186,000,000 | 2022 | False | True | False | 000000000 |
| 90 | 0001070423 | PLAINS ALL AMERICAN PIPELINE LP | PAA;PAAPU | 57,342,000,000 | 2022 | False | False | False | 000000000 |
| 91 | 0001581990 | PLAINS GP HOLDINGS LP | PAGP | 57,342,000,000 | 2022 | False | False | False | 000000000 |
| 92 | 0000858877 | CISCO SYSTEMS, INC. | CSCO | 56,998,000,000 | 2023 | False | False | False | 000000000 |
| 93 | 0001751788 | DOW INC. | DOW | 56,902,000,000 | 2022 | False | False | True | 000000000 |
| 94 | 0000029915 | DOW CHEMICAL CO /DE/ |  | 55,508,000,000 | 2017 | False | False | False | 000000000 |
| 95 | 0001091667 | CHARTER COMMUNICATIONS, INC. /MO/ | CHTR;CHTRP | 55,085,000,000 | 2024 | False | False | False | 000000000 |
| 96 | 0001271833 | CCO HOLDINGS LLC |  | 55,085,000,000 | 2024 | False | False | False | 000000000 |
| 97 | 0000006201 | American Airlines Group Inc. | AAL | 54,633,000,000 | 2025 | False | False | False | 000001000 |
| 98 | 0000100493 | TYSON FOODS, INC. | TSN | 54,441,000,000 | 2025 | False | False | False | 000000000 |
| 99 | 0001161154 | Energy Transfer Operating, L.P. |  | 54,213,000,000 | 2019 | False | False | False | 000000000 |
| 100 | 0000927628 | CAPITAL ONE FINANCIAL CORP | COF;COF-PI;COF-PJ;COF-PK;COF-PL;COF-PN | 53,434,000,000 | 2025 | True | False | False | 000000000 |
| 101 | 0001897762 | Ingram Micro Holding Corp | INGM | 52,556,263,000 | 2025 | False | False | True | 000000000 |
| 102 | 0000040533 | GENERAL DYNAMICS CORP | GD | 52,550,000,000 | 2025 | False | False | False | 000000000 |
| 103 | 0001543151 | Uber Technologies, Inc | UBER | 52,017,000,000 | 2025 | False | False | False | 000001000 |
| 104 | 0000764478 | BEST BUY CO INC | BBY | 51,761,000,000 | 2021 | False | False | False | 000000000 |
| 105 | 0000320187 | NIKE, Inc. | NKE | 51,362,000,000 | 2023 | False | False | False | 000000000 |
| 106 | 0001489393 | LyondellBasell Industries N.V. | LYB | 50,451,000,000 | 2022 | False | False | False | 000000000 |
| 107 | 0000086312 | TRAVELERS COMPANIES, INC. | TRV | 48,828,000,000 | 2025 | True | False | False | 000000000 |
| 108 | 0001666700 | DuPont de Nemours, Inc. | DD | 48,778,000,000 | 2015 | False | False | False | 000000000 |
| 109 | 0000014272 | BRISTOL MYERS SQUIBB CO | BMY;CELG-RI | 48,300,000,000 | 2024 | False | False | False | 000000000 |
| 110 | 0000021344 | COCA COLA CO | KO | 47,941,000,000 | 2025 | False | False | False | 000000000 |
| 111 | 0000823277 | CHS INC | CHSCP;CHSCL;CHSCM;CHSCN;CHSCO | 47,791,666,000 | 2022 | False | False | False | 000000000 |
| 112 | 0001534504 | PBF Energy Inc. | PBF | 46,830,300,000 | 2022 | False | False | False | 000000000 |
| 113 | 0001566011 | PBF Holding Co LLC |  | 46,780,600,000 | 2022 | False | False | False | 000000000 |
| 114 | 0000937834 | METROPOLITAN LIFE INSURANCE CO |  | 45,447,000,000 | 2022 | True | False | False | 000000000 |
| 115 | 0001179929 | MOLINA HEALTHCARE, INC. | MOH | 45,426,000,000 | 2025 | True | False | False | 000000000 |
| 116 | 0001065280 | NETFLIX INC | NFLX | 45,183,036,000 | 2025 | False | False | False | 000000000 |
| 117 | 0000097745 | THERMO FISHER SCIENTIFIC INC. | TMO | 44,915,000,000 | 2022 | False | False | False | 000000000 |
| 118 | 0000001800 | ABBOTT LABORATORIES | ABT | 44,328,000,000 | 2025 | False | False | False | 000000000 |
| 119 | 0000804328 | QUALCOMM INC/DE | QCOM | 44,284,000,000 | 2025 | False | False | False | 000000000 |
| 120 | 0001018003 | INGRAM MICRO INC |  | 43,025,852,000 | 2015 | False | False | False | 000000000 |
| 121 | 0000029534 | DOLLAR GENERAL CORP | DG | 42,724,369,000 | 2025 | False | False | False | 000000000 |
| 122 | 0001133421 | NORTHROP GRUMMAN CORP /DE/ | NOC | 41,954,000,000 | 2025 | False | False | False | 000000000 |
| 123 | 0000742278 | RPC INC | RES | 41,919,000,000 | 2015 | False | False | False | 000000000 |
| 124 | 0000773840 | HONEYWELL INTERNATIONAL INC | HON | 41,802,000,000 | 2018 | False | False | False | 000000000 |
| 125 | 0000701221 | Cigna Holding Co |  | 41,616,000,000 | 2017 | True | False | False | 000000000 |
| 126 | 0001108524 | Salesforce, Inc. | CRM | 41,525,000,000 | 2025 | False | False | False | 000000000 |
| 127 | 0000073309 | NUCOR CORP | NUE | 41,512,000,000 | 2022 | False | False | False | 000000000 |
| 128 | 0001437107 | Warner Bros. Discovery, Inc. |  | 41,321,000,000 | 2023 | False | False | False | 000000011 |
| 129 | 0000004962 | AMERICAN EXPRESS CO | AXP | 41,304,000,000 | 2025 | True | False | False | 000000000 |
| 130 | 0001138118 | CBRE GROUP, INC. | CBRE | 40,550,000,000 | 2025 | True | False | False | 000000000 |
| 131 | 0001403161 | VISA INC. | V | 40,000,000,000 | 2025 | False | False | False | 000000000 |
| 132 | 0001665918 | US Foods Holding Corp. | USFD | 39,424,000,000 | 2025 | False | False | False | 000000000 |
| 133 | 0001103982 | Mondelez International, Inc. | MDLZ | 38,537,000,000 | 2025 | False | False | False | 000000000 |
| 134 | 0001915657 | HF Sinclair Corp | DINO | 38,205,000,000 | 2022 | False | False | True | 000000000 |
| 135 | 0001996810 | GE Vernova Inc. | GEV | 38,068,000,000 | 2025 | False | False | True | 000000000 |
| 136 | 0001023128 | LITHIA MOTORS INC | LAD | 37,634,900,000 | 2025 | False | False | False | 000000000 |
| 137 | 0000849395 | CRH PUBLIC LTD CO | CRH | 37,447,000,000 | 2025 | False | False | False | 000000000 |
| 138 | 0000723125 | MICRON TECHNOLOGY INC | MU | 37,378,000,000 | 2025 | False | False | False | 000000000 |
| 139 | 0000790703 | TECH DATA CORP |  | 37,238,950,000 | 2018 | False | False | False | 000000000 |
| 140 | 0000829224 | STARBUCKS CORP | SBUX | 37,184,400,000 | 2025 | False | False | False | 000000000 |
| 141 | 0000053669 | JOHNSON CONTROLS INC |  | 37,179,000,000 | 2015 | False | False | False | 000000000 |
| 142 | 0000007536 | ARROW ELECTRONICS, INC. | ARW | 37,124,422,000 | 2022 | False | False | False | 000000000 |
| 143 | 0000882184 | HORTON D R INC /DE/ | DHI | 36,801,400,000 | 2024 | False | False | False | 000000000 |
| 144 | 0001647339 | Accenture Holdings plc |  | 36,765,478,000 | 2017 | False | False | False | 000000000 |
| 145 | 0000318154 | AMGEN INC | AMGN | 36,751,000,000 | 2025 | False | False | False | 000000000 |
| 146 | 0000797468 | OCCIDENTAL PETROLEUM CORP /DE/ | OXY;OXY-WT | 36,634,000,000 | 2022 | False | False | False | 000000000 |
| 147 | 0001613103 | Medtronic plc | MDT | 36,364,000,000 | 2025 | False | False | False | 000000000 |
| 148 | 0000087347 | SLB LIMITED/NV | SLB | 36,289,000,000 | 2024 | False | False | False | 000000000 |
| 149 | 0001109357 | EXELON CORP | EXC | 35,978,000,000 | 2018 | False | True | False | 000000000 |
| 150 | 0000109198 | TJX COMPANIES INC /DE/ | TJX | 35,864,664,000 | 2017 | False | False | False | 000000000 |
| 151 | 0000920760 | LENNAR CORP /NEW/ | LEN;LEN-B | 35,441,452,000 | 2024 | False | False | False | 000000000 |
| 152 | 0000066740 | 3M CO | MMM | 35,355,000,000 | 2021 | False | False | False | 000000000 |
| 153 | 0000075362 | PACCAR INC | PCAR | 35,127,400,000 | 2023 | False | False | False | 000000000 |
| 154 | 0000898293 | JABIL INC | JBL | 34,702,000,000 | 2023 | False | False | False | 000000000 |
| 155 | 0000002488 | ADVANCED MICRO DEVICES INC | AMD | 34,639,000,000 | 2025 | False | False | False | 000000000 |
| 156 | 0001834584 | Coupang, Inc. | CPNG | 34,534,000,000 | 2025 | False | False | True | 000000000 |
| 157 | 0001645590 | Hewlett Packard Enterprise Co | HPE;HPE-PC | 34,296,000,000 | 2025 | False | False | False | 000000000 |
| 158 | 0001012569 | Energy Transfer, LP |  | 34,292,000,000 | 2015 | False | True | False | 000000000 |
| 159 | 0000026172 | CUMMINS INC | CMI | 34,102,000,000 | 2024 | False | False | False | 000000000 |
| 160 | 0001707925 | LINDE PLC | LIN | 33,986,000,000 | 2025 | False | False | True | 000000000 |
| 161 | 0001039684 | ONEOK INC /NEW/ | OKE | 33,629,000,000 | 2025 | False | True | False | 000000000 |
| 162 | 0000101830 | SPRINT LLC |  | 33,600,000,000 | 2018 | False | False | False | 000000000 |
| 163 | 0000003570 | Cheniere Energy, Inc. | LNG | 33,428,000,000 | 2022 | False | True | False | 000000000 |
| 164 | 0001633917 | PayPal Holdings, Inc. | PYPL | 33,172,000,000 | 2025 | False | False | False | 000000000 |
| 165 | 0001141391 | Mastercard Inc | MA | 32,791,000,000 | 2025 | False | False | False | 000000000 |
| 166 | 0001858681 | Apollo Global Management, Inc. | APO;APOS | 32,644,000,000 | 2023 | True | False | True | 000000000 |
| 167 | 0000882095 | GILEAD SCIENCES, INC. | GILD | 32,639,000,000 | 2015 | False | False | False | 000000000 |
| 168 | 0001170010 | CARMAX INC | KMX | 31,900,412,000 | 2021 | False | False | False | 000000000 |
| 169 | 0001019849 | PENSKE AUTOMOTIVE GROUP, INC. | PAG | 31,864,800,000 | 2024 | False | False | False | 000000000 |
| 170 | 0001020859 | UNITED NATURAL FOODS INC | UNFI | 31,784,000,000 | 2025 | False | False | False | 000000001 |
| 171 | 0001013871 | NRG ENERGY, INC. | NRG | 31,543,000,000 | 2022 | False | True | False | 100000000 |
| 172 | 0001105705 | WARNER MEDIA, LLC |  | 31,271,000,000 | 2017 | False | False | False | 000000000 |
| 173 | 0002005951 | Smurfit Westrock plc | SW | 31,179,000,000 | 2025 | False | False | True | 000000000 |
| 174 | 0002011641 | Ferguson Enterprises Inc. /DE/ | FERG | 30,762,000,000 | 2025 | False | False | True | 000000000 |
| 175 | 0001308161 | TWENTY-FIRST CENTURY FOX, INC. |  | 30,400,000,000 | 2018 | False | False | False | 000000000 |
| 176 | 0000813828 | Paramount Global |  | 30,154,000,000 | 2022 | False | False | False | 000000000 |
| 177 | 0001832433 | Ferguson (Jersey) Ltd |  | 29,734,000,000 | 2023 | False | False | True | 000000000 |
| 178 | 0002041610 | Skydance Corp | SKYD;SKYD-WT | 29,652,000,000 | 2023 | False | False | True | 000000000 |
| 179 | 0000092122 | SOUTHERN CO | SO;SOJC;SOJD;SOJE;SOJF;SOMN | 29,553,000,000 | 2025 | False | True | False | 000000000 |
| 180 | 0001047122 | RAYTHEON CO/ |  | 29,176,000,000 | 2019 | False | False | False | 000000000 |
| 181 | 0001099590 | MERCADOLIBRE INC | MELI | 28,893,000,000 | 2025 | False | False | False | 000000000 |
| 182 | 0000036104 | US BANCORP \DE\ | USB;USB-PA;USB-PH;USB-PP;USB-PQ;USB-PR;USB-PS | 28,656,000,000 | 2025 | True | False | False | 000000000 |
| 183 | 0000866374 | FLEX LTD. | FLEX | 28,502,000,000 | 2022 | False | False | False | 000000000 |
| 184 | 0001050915 | QUANTA SERVICES, INC. | PWR | 28,479,697,000 | 2025 | False | False | False | 000000000 |
| 185 | 0002046386 | Medline Inc. | MDLN | 28,432,000,000 | 2025 | False | False | True | 000000000 |
| 186 | 0000006951 | APPLIED MATERIALS INC /DE | AMAT | 28,368,000,000 | 2025 | False | False | False | 000000000 |
| 187 | 0000874766 | HARTFORD INSURANCE GROUP, INC. | HIG;HIG-PG | 28,368,000,000 | 2025 | True | False | False | 000000000 |
| 188 | 0001527469 | Athene Holding Ltd. | ATH-PA;ATH-PB;ATH-PD;ATH-PE;ATHS | 28,194,000,000 | 2023 | True | False | False | 000000000 |
| 189 | 0000092380 | SOUTHWEST AIRLINES CO | LUV | 28,063,000,000 | 2025 | False | False | False | 000000000 |
| 190 | 0001701605 | Baker Hughes Co | BKR | 27,829,000,000 | 2024 | False | False | True | 000000000 |
| 191 | 0000350698 | AUTONATION, INC. | AN | 27,631,400,000 | 2025 | False | False | False | 000000000 |
| 192 | 0001551182 | Eaton Corp plc | ETN | 27,448,000,000 | 2025 | False | False | False | 000000000 |
| 193 | 0000794367 | Macy's, Inc. | M | 27,079,000,000 | 2015 | False | False | False | 000000000 |
| 194 | 0000062709 | MARSH & MCLENNAN COMPANIES, INC. | MRSH | 26,981,000,000 | 2025 | True | False | False | 000000000 |
| 195 | 0001075531 | Booking Holdings Inc. | BKNG | 26,917,000,000 | 2025 | False | False | False | 000000000 |
| 196 | 0000063908 | MCDONALDS CORP | MCD | 26,885,000,000 | 2025 | False | False | False | 000000000 |
| 197 | 0000313616 | DANAHER CORP /DE/ | DHR | 26,643,000,000 | 2022 | False | False | False | 000000000 |
| 198 | 0000815097 | Carnival Corp Ltd. | CCL | 26,622,000,000 | 2025 | False | False | False | 000001100 |
| 199 | 0000008858 | AVNET INC | AVT | 26,536,881,000 | 2023 | False | False | False | 000000000 |
| 200 | 0001081316 | BERKSHIRE HATHAWAY ENERGY CO |  | 26,337,000,000 | 2022 | False | True | False | 000000000 |

## 9. Zombies by cause and by SIC division

Core zombies split by the sign of operating income. `negative_ebit`: operating income below 0, so ICR is negative. `nonneg_ebit`: operating income of 0 or more but below the interest expense.

| fy | core_firms_present | zombies | negative_ebit | nonneg_ebit | share_negative |
| --- | --- | --- | --- | --- | --- |
| 2017 | 2820 | 534 | 485 | 49 | 90.8% |
| 2018 | 2805 | 519 | 472 | 47 | 90.9% |
| 2019 | 2736 | 532 | 489 | 43 | 91.9% |
| 2020 | 2766 | 563 | 530 | 33 | 94.1% |
| 2021 | 2801 | 562 | 540 | 22 | 96.1% |
| 2022 | 2757 | 553 | 525 | 28 | 94.9% |
| 2023 | 2638 | 486 | 463 | 23 | 95.3% |
| 2024 | 2565 | 494 | 462 | 32 | 93.5% |
| 2025 | 2472 | 482 | 437 | 45 | 90.7% |

By SIC division for FY2019 and FY2024 (all years: `s9_zombies_by_division.csv`):

| fy | sic_division | core_firms_present | zombies | zombies_negative_ebit | zombies_nonneg_ebit | share_of_present |
| --- | --- | --- | --- | --- | --- | --- |
| 2019 | Agriculture, Forestry and Fishing | 14 | 2 | 2 | 0 | 14.3% |
| 2019 | Construction | 40 | 2 | 1 | 1 | 5.0% |
| 2019 | Manufacturing | 1453 | 299 | 281 | 18 | 20.6% |
| 2019 | Mining | 205 | 44 | 41 | 3 | 21.5% |
| 2019 | Retail Trade | 166 | 18 | 15 | 3 | 10.8% |
| 2019 | Services | 601 | 131 | 119 | 12 | 21.8% |
| 2019 | Transportation, Communications, Electric, Gas and Sanitary Services | 156 | 21 | 16 | 5 | 13.5% |
| 2019 | Wholesale Trade | 100 | 15 | 14 | 1 | 15.0% |
| 2024 | Agriculture, Forestry and Fishing | 16 | 3 | 3 | 0 | 18.8% |
| 2024 | Construction | 50 | 5 | 4 | 1 | 10.0% |
| 2024 | Manufacturing | 1360 | 272 | 257 | 15 | 20.0% |
| 2024 | Mining | 158 | 26 | 26 | 0 | 16.5% |
| 2024 | Retail Trade | 164 | 18 | 18 | 0 | 11.0% |
| 2024 | Services | 572 | 141 | 130 | 11 | 24.7% |
| 2024 | Transportation, Communications, Electric, Gas and Sanitary Services | 130 | 25 | 20 | 5 | 19.2% |
| 2024 | Wholesale Trade | 85 | 4 | 4 | 0 | 4.7% |

## 10. Year-over-year sanity flags

A firm-year is flagged when a value differs by more than 20 times from the same firm's value in the previous or the next fiscal year (absolute values; zero or empty values and empty years in between are not compared). Both years of a flagged pair are listed. `above_floor` means the larger value is at least 1,000,000 USD. **No value is changed**: these are leads to check against the filing, not corrections.

Flag rows by field (a pair gives two rows):

| field | above_floor | below_floor |
| --- | --- | --- |
| revenue | 942 | 368 |
| total_debt | 1250 | 58 |
| interest_expense | 974 | 1038 |
| operating_income | 2650 | 434 |

The 50 largest ratios above the floor (all of them, with URLs: `s10_sanity_flags.csv`):

| cik | name | fy | field | value | neighbor | neighbor_fy | neighbor_value | ratio | accession |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0000047518 | Hill-Rom Holdings, Inc. | 2020 | total_debt | 1,928,100,000 | next | 2021 | 2,111 | 913,358.6 | 0000047518-21-000084;0000047518-21-000084;0000047518-21-000084 |
| 0000047518 | Hill-Rom Holdings, Inc. | 2021 | total_debt | 2,111 | previous | 2020 | 1,928,100,000 | 913,358.6 | 0000047518-21-000084;0000047518-21-000084;0000047518-21-000084 |
| 0001008586 | STREAMLINE HEALTH SOLUTIONS INC. | 2023 | total_debt | 9,066,000 | next | 2024 | 13 | 692,061.1 | 0001493152-24-017297;0001493152-24-017297 |
| 0001008586 | STREAMLINE HEALTH SOLUTIONS INC. | 2024 | total_debt | 13 | previous | 2023 | 9,066,000 | 692,061.1 | 0001437749-25-014208 |
| 0001117057 | Planet Green Holdings Corp. | 2017 | interest_expense | 4,076,495 | next | 2018 | 13 | 313,576.5 | 0001062993-19-001739 |
| 0001117057 | Planet Green Holdings Corp. | 2018 | interest_expense | 13 | previous | 2017 | 4,076,495 | 313,576.5 | 0001213900-20-012050 |
| 0001349706 | TurnOnGreen, Inc. | 2020 | revenue | 29 | next | 2021 | 5,346,000 | 184,344.8 | 0001214659-22-004941 |
| 0001349706 | TurnOnGreen, Inc. | 2021 | revenue | 5,346,000 | previous | 2020 | 29 | 184,344.8 | 0001214659-23-004976 |
| 0001019034 | BIO KEY INTERNATIONAL INC | 2017 | operating_income | -4,275,365 | next | 2018 | 80 | 53,442.1 | 0001437749-19-006677 |
| 0001019034 | BIO KEY INTERNATIONAL INC | 2018 | operating_income | 80 | previous | 2017 | -4,275,365 | 53,442.1 | 0001437749-20-010796 |
| 0001839412 | QualTek Services Inc. | 2020 | operating_income | -975 | next | 2021 | -49,249,000 | 50,511.8 | 0001410578-22-000957 |
| 0001839412 | QualTek Services Inc. | 2021 | operating_income | -49,249,000 | previous | 2020 | -975 | 50,511.8 | 0001628280-23-014277 |
| 0001818644 | AEye, Inc. | 2019 | operating_income | -548 | next | 2020 | -26,482,000 | 48,324.8 | 0001213900-21-024511 |
| 0001818644 | AEye, Inc. | 2020 | operating_income | -26,482,000 | previous | 2019 | -548 | 48,324.8 | 0001818644-22-000008 |
| 0000844856 | Healthier Choices Management Corp. | 2022 | revenue | 29,267,003 | next | 2023 | 617 | 47,434.4 | 0001493152-24-011537 |
| 0000844856 | Healthier Choices Management Corp. | 2023 | revenue | 617 | previous | 2022 | 29,267,003 | 47,434.4 | 0001641172-25-004607 |
| 0001911545 | Global Interactive Technologies, Inc. | 2024 | interest_expense | 16,179,823 | next | 2025 | 349 | 46,360.5 | 0001493152-26-025106 |
| 0001911545 | Global Interactive Technologies, Inc. | 2025 | interest_expense | 349 | previous | 2024 | 16,179,823 | 46,360.5 | 0001493152-26-025106 |
| 0001451448 | ESPORTS ENTERTAINMENT GROUP, INC. | 2018 | interest_expense | 121 | next | 2019 | 5,586,617 | 46,170.4 | 0001213900-19-019346 |
| 0001451448 | ESPORTS ENTERTAINMENT GROUP, INC. | 2019 | interest_expense | 5,586,617 | previous | 2018 | 121 | 46,170.4 | 0001493152-20-018724 |
| 0001819035 | Metromile, LLC | 2019 | operating_income | 976 | next | 2020 | -44,820,000 | 45,922.1 | 0001213900-21-030396 |
| 0001819035 | Metromile, LLC | 2020 | operating_income | -44,820,000 | previous | 2019 | 976 | 45,922.1 | 0001628280-22-004241 |
| 0001537258 | AIRBORNE WIRELESS NETWORK | 2017 | interest_expense | 150 | next | 2018 | 6,517,537 | 43,450.2 | 0001640334-18-002185 |
| 0001537258 | AIRBORNE WIRELESS NETWORK | 2018 | interest_expense | 6,517,537 | previous | 2017 | 150 | 43,450.2 | 0001640334-18-002185 |
| 0001068875 | AVANTAX, INC. | 2019 | operating_income | 9,000 | next | 2020 | -321,710,000 | 35,745.6 | 0001068875-22-000042 |
| 0001068875 | AVANTAX, INC. | 2020 | operating_income | -321,710,000 | previous | 2019 | 9,000 | 35,745.6 | 0001068875-23-000055 |
| 0001759824 | ALTA EQUIPMENT GROUP INC. | 2018 | operating_income | -342 | next | 2019 | 11,700,000 | 34,210.5 | 0001213900-20-007376 |
| 0001759824 | ALTA EQUIPMENT GROUP INC. | 2019 | operating_income | 11,700,000 | previous | 2018 | -342 | 34,210.5 | 0001564590-21-014150 |
| 0001419793 | ORIGINCLEAR, INC. | 2018 | total_debt | 110 | next | 2019 | 3,432,300 | 31,202.7 | 0001213900-19-007122 |
| 0001419793 | ORIGINCLEAR, INC. | 2019 | total_debt | 3,432,300 | previous | 2018 | 110 | 31,202.7 | 0001213900-20-013726 |
| 0001821175 | Motorsport Games Inc. | 2020 | operating_income | 1,147 | next | 2021 | -34,526,658 | 30,101.7 | 0001493152-22-008160 |
| 0001821175 | Motorsport Games Inc. | 2021 | operating_income | -34,526,658 | previous | 2020 | 1,147 | 30,101.7 | 0001493152-23-008878 |
| 0001353615 | Invesco CurrencyShares Swiss Franc Trust | 2022 | interest_expense | 1,328,169 | next | 2023 | 54 | 24,595.7 | 0000950170-24-019055 |
| 0001353615 | Invesco CurrencyShares Swiss Franc Trust | 2023 | interest_expense | 54 | previous | 2022 | 1,328,169 | 24,595.7 | 0000950170-25-027267 |
| 0001309057 | China Health Industries Holdings, Inc. | 2021 | revenue | 6,492,720 | next | 2022 | 267 | 24,317.3 | 0001213900-23-028586 |
| 0001309057 | China Health Industries Holdings, Inc. | 2022 | revenue | 267 | previous | 2021 | 6,492,720 | 24,317.3 | 0001213900-23-085612 |
| 0000926617 | Aspira Women's Health Inc. | 2023 | revenue | 87,000,000 | next | 2024 | 4,000 | 21,750.0 | 0001641172-25-000983 |
| 0000926617 | Aspira Women's Health Inc. | 2024 | revenue | 4,000 | previous | 2023 | 87,000,000 | 21,750.0 | 0000926617-26-000020 |
| 0001525852 | BOTS, Inc./PR | 2018 | revenue | 2,315,513 | next | 2019 | 115 | 20,134.9 | 0001477932-21-002729 |
| 0001525852 | BOTS, Inc./PR | 2019 | revenue | 115 | previous | 2018 | 2,315,513 | 20,134.9 | 0001477932-21-008327 |
| 0001397795 | MEDO Technologies, Inc. | 2021 | operating_income | -87,668,351 | next | 2022 | -4,752 | 18,448.7 | 0001213900-25-000675 |
| 0001397795 | MEDO Technologies, Inc. | 2022 | operating_income | -4,752 | previous | 2021 | -87,668,351 | 18,448.7 | 0001213900-25-000956 |
| 0001580149 | BIOVIE INC. | 2019 | interest_expense | 273 | next | 2020 | 4,772,429 | 17,481.4 | 0001520138-20-000360 |
| 0001580149 | BIOVIE INC. | 2020 | interest_expense | 4,772,429 | previous | 2019 | 273 | 17,481.4 | 0001520138-21-000509 |
| 0001462223 | Nixxy, Inc. | 2024 | revenue | 6,000 | next | 2025 | 97,906,000 | 16,317.7 | 0001683168-26-002951 |
| 0001462223 | Nixxy, Inc. | 2025 | revenue | 97,906,000 | previous | 2024 | 6,000 | 16,317.7 | 0001683168-26-002951 |
| 0000035214 | FERRO CORP | 2018 | total_debt | 50,000 | next | 2019 | 812,111,000 | 16,242.2 | 0000035214-20-000009 |
| 0000035214 | FERRO CORP | 2019 | total_debt | 812,111,000 | previous | 2018 | 50,000 | 16,242.2 | 0000035214-20-000009 |
| 0001853138 | Kodiak AI, Inc. | 2022 | operating_income | -3,542 | next | 2023 | -53,849,000 | 15,203.0 | 0001628280-24-007635 |
| 0001853138 | Kodiak AI, Inc. | 2023 | operating_income | -53,849,000 | previous | 2022 | -3,542 | 15,203.0 | 0001628280-26-016910 |

