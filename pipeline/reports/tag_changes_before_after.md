# Effect of the tag-list change of 2026-11-20

Data: SEC EDGAR. Not investment advice.

Before: the panel and report built with the old tag lists (commits `b369d93`, `36c8078`). After: the panel rebuilt from the same cached zips (no download) with the new lists (revenue 4th tag and goods + services, interest 5th tag, debt stage 2) and the report regenerated. The tag census files describe the state **before** the change.

## Core firms present in FY2024 that have a value

Core firms present in FY2024: before 2565, after 2576.

| field | before | after | change | share before | share after |
| --- | --- | --- | --- | --- | --- |
| revenue | 2155 | 2352 | +197 | 84.0% | 91.3% |
| interest expense | 1745 | 1776 | +31 | 68.0% | 68.9% |
| total debt | 1417 | 1754 | +337 | 55.2% | 68.1% |

Of the 822 core firms without a debt value after the change, **481** are `likely_debt_free` (interest 0 or missing) and 341 are missing data in the stricter sense.

## Zombies per fiscal year (core firms)

| fy | zombies before | zombies after | share of present before | after | core firms with ICR before | after | share of those with ICR before | after |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2017 | 534 | 533 | 18.94% | 18.89% | 1904 | 1904 | 28.05% | 27.99% |
| 2018 | 519 | 519 | 18.50% | 18.50% | 1869 | 1869 | 27.77% | 27.77% |
| 2019 | 532 | 532 | 19.44% | 19.44% | 1846 | 1846 | 28.82% | 28.82% |
| 2020 | 563 | 563 | 20.35% | 20.34% | 1855 | 1855 | 30.35% | 30.35% |
| 2021 | 562 | 562 | 20.06% | 20.05% | 1839 | 1839 | 30.56% | 30.56% |
| 2022 | 553 | 553 | 20.06% | 20.04% | 1809 | 1812 | 30.57% | 30.52% |
| 2023 | 486 | 486 | 18.42% | 18.41% | 1724 | 1730 | 28.19% | 28.09% |
| 2024 | 494 | 496 | 19.26% | 19.25% | 1626 | 1645 | 30.38% | 30.15% |
| 2025 | 482 | 485 | 19.50% | 19.53% | 1521 | 1545 | 31.69% | 31.39% |

## Breaking rate (core firms)

| view | firms that can get a breaking rate, before | after | firms between 0 and 5 pp, before | after | firms below 0 pp, before | after |
| --- | --- | --- | --- | --- | --- | --- |
| latest_year | 2443 | 2911 | 114 | 126 | 1281 | 1631 |
| fy2024 | 1042 | 1270 | 57 | 63 | 423 | 549 |

"Between 0 and 5 pp" means a breaking rate of 0 or more and under 5 percentage points.

