# Frank 必读：数据合同 v2 和你的第一批任务

2026-11-11 · 来自 Sunny

仓库里已经有了数据合同 v2 的草稿。请你在 **11 月 12 日**之前做两件事：确认下面 7 个问题，并提交第一版假数据。前端明天开工，要用这份假数据。

---

## 1. 数据合同是什么

数据合同规定了你的 Python 管道输出什么文件、每个字段叫什么、单位是什么。我的前端只按这份合同读数据，所以我们可以同时开工：你还没抓到真数据时，我用 `/data/mock` 里的假数据先做前端；真数据一到，直接替换。

仓库里的三处，必须一起改：

| 文件 | 作用 |
| --- | --- |
| [`.kiro/steering/data-contract.md`](../.kiro/steering/data-contract.md) | 合同正文，Kiro 每次对话都会读 |
| [`data/schema/`](../data/schema/) | 4 个 JSON Schema，用来自动检查你输出的文件格式 |
| [`web/src/types/data.ts`](../web/src/types/data.ts) | 前端的 TypeScript 类型 |

合同规定了 4 个文件：

| 文件 | 内容 | 前端什么时候读 |
| --- | --- | --- |
| `data/firms_index.json` | 每家公司的名字、行业、状态、最新 ICR、债务、隐含利率 | 墓地一打开就读，画所有墓碑 |
| `data/firms/{cik}.json` | 一家公司 5 年的完整财报，加上手术模拟用的 `rescue_inputs` | 这家公司被抓进实验室时才读 |
| `data/macro.json` | 10 年期国债利率（FRED DGS10）、各行业中位数 | 实验室算再融资利率、数据不足时做替补 |
| `data/keeper_log.json` | 守墓人日志：每天新增哪些僵尸、谁被救活 | 墓地的日志面板；由你的 bot 写 |

通用规则：金额一律用美元（不用千美元）；缺数据写 `null`，绝不用 0 代替；年份升序；比率用小数（0.06 = 6%）。僵尸判定规则在 [`zombie-definition.md`](../.kiro/steering/zombie-definition.md)，请一起看。

---

## 2. 需要你确认的 7 个问题

每个问题都附了我们的建议。请在 GitHub 上开一个 issue，标题写 “Data contract v2 review”，逐条回复“同意”或者写你的方案。

| # | 问题 | 我们的建议 |
| --- | --- | --- |
| 1 | 公司范围是哪些？ | 有 ticker、提交 10-K 的美国上市公司；**排除金融业（SIC 6000–6799）**。银行的利息支出是主营成本，ICR 对它们没意义，学术文献里也都排除 |
| 2 | ICR 在 Python 和 TypeScript 里各写一份，怎么保证一致？ | 建一个共用的测试用例文件 `data/fixtures/icr_cases.json`（输入加预期结果，含边界情况）。你的 pytest 和我的 Vitest 都跑它。由你来写 |
| 3 | 哪些公司要生成 `firms/{cik}.json`？ | 只给 `rescue_eligible = true` 的公司生成。其他公司进不了实验室，生成了也用不上，还会让仓库变大 |
| 4 | 历史不足 4 年的公司，`rescue_inputs` 怎么填？ | 用 `macro.json` 里同行业的中位数填，`used_sector_fallback = true`。schema 里这几个字段不允许 null，所以一定要有值 |
| 5 | 行业名称怎么写？ | 用 SIC division 的英文名（例如 "Manufacturing"）。`firms_index`、`firms/{cik}` 和 `macro.sector_medians` 的键名必须**一字不差**，否则实验室找不到替补值 |
| 6 | 财年怎么对齐？ | 用 XBRL 里的 `fy` 字段（公司自己的财年），不换算成日历年。每家取最近 5 个可用财年。`meta.fiscal_years` 只是整体范围的说明 |
| 7 | 总债务包不包括经营租赁负债？ | 不包括，按合同里的三项加总。租赁不产生利息费用科目，算进去会压低隐含利率 |

确认后，把合同顶部的 “v2 draft, pending partner review” 改成 “v2”。如果改了字段，合同、schema、类型三处要在**同一个提交**里一起改。

---

## 3. 你的任务（按顺序）

最急的是前 4 项：前端明天就要用假数据。

- [ ] **接受仓库邀请，装好 Kiro，兑换 credits**（今天）。在 Devpost 的 Resources 页申请 4,000 免费 credits（12 月 1 日截止）。兑换后，Kiro 右下角不该再显示 "Kiro Free"。
- [ ] **告诉我你是不是在读学生**（今天）。两人都是学生，才能拿 Best Student Project: Costume Contest（1,500 美元加一年 Kiro Pro Max）。需要提供 LinkedIn、学校邮箱、年级和专业。
- [ ] **回答上面 7 个问题**（11/12）。
- [ ] **提交假数据**（11/12）。用下面的提示词 F2。
- [ ] **写 EDGAR 接口规则 `edgar-rules.md`**（11/12）。用下面的提示词 F1。
- [ ] **写 ICR 共用测试用例 `data/fixtures/icr_cases.json`**（11/13）。至少覆盖：正常、EBIT 为负、利息为 0、利息为负、利息缺失、刚好等于 1、连续 3 年被缺失年份打断。
- [ ] **开 data-pipeline spec 并实现**（11/13 开始，11/20 前完成）。用下面的提示词 F3。
- [ ] **第一批真实数据**（11/24 前）。通过 schema 校验后提交到 `data/`。
- [ ] **审 rescue-engine 的 PR**（我提交后 2 天内）。重点看公式和 `rescue-rules.md` 是否一致。
- [ ] **守墓人 bot（Kiro Crew）**（11/28 前）。每天定时跑一次管道，更新 `keeper_log.json`，开一个 PR。做成了可以额外申报 Best Kiro Crew App（1,000 美元）。

**提交截止**：12 月 4 日太平洋时间下午 2 点。最后 3 天只修 bug、写文字、录视频，不加新功能。

---

## 4. 在 Kiro 里开工

**设置（约 30 分钟）**

1. 装 Kiro，用领 credits 的账号登录。模型选 **Auto**，模式先用 **Supervised**。
2. `git clone https://github.com/Supersunny7/zombie-firm-radar.git`，用 Kiro 打开。
3. 仓库里已经有了 steering（`.kiro/steering/`）和 MCP 配置（Playwright、Context7），打开就生效，不用再配。
4. 每完成一个重要步骤就截图，存到 `docs/kiro-evidence/`，文件名以 `F` 开头（例如 `F2-mock-data.png`）。最后写 Kiro 使用说明要用。
5. 每个任务开一个新的 Kiro 对话。对话越长，越费 credits。

**F1：EDGAR 接口规则**（贴进 Kiro 对话框）

```
Create a steering file .kiro/steering/edgar-rules.md (inclusion: fileMatch, fileMatchPattern: "pipeline/**") with these rules for any code that calls SEC or FRED:

- Every SEC request must send a User-Agent header of the form "ZombieFirmRadar <contact email>". Read the email from the environment variable SEC_CONTACT_EMAIL; never hard-code it. Requests without it get HTTP 403.
- Stay under 10 requests per second to SEC (use a shared rate limiter, default 5 per second).
- Prefer the frames endpoint (https://data.sec.gov/api/xbrl/frames/{taxonomy}/{tag}/{unit}/{period}.json) to fetch one concept for all companies in one call. Use companyfacts only for per-firm detail.
- Ticker to CIK map: https://www.sec.gov/files/company_tickers.json. CIKs are 10 digits, zero-padded.
- Cache raw API responses under /pipeline/.cache and never refetch within 24 hours. /pipeline/.cache is git-ignored.
- FRED API key comes from the environment variable FRED_API_KEY. Never commit keys or a .env file.
- Retry with exponential backoff on 429 and 5xx. Log, don't crash, on a single firm failure.
- Exclude financial firms (SIC 6000-6799) unless the data contract says otherwise.
```

**F2：假数据**（贴进 Kiro 对话框）

```
Using data-contract.md (v2) and zombie-definition.md, write /pipeline/scripts/make_mock.py that generates all four mock files in /data/mock/: firms_index.json, firms/{cik}.json, macro.json and keeper_log.json.
- 150 fictional firms (fictional names, no real tickers, CIKs starting with 9999) across 8 non-financial SIC divisions, fixed random seed so output is reproducible.
- Target mix: about 15% zombie, 20% endangered, 60% healthy, 5% insufficient_data. Statuses and reasons must be computed with the rules in zombie-definition.md, not assigned randomly.
- Generate firms/{cik}.json only for rescue_eligible firms. Include rescue_inputs computed from each firm's own 5-year history, with sector fallback where history is short.
- Include one hand-written firm "Ashgrove Works" (sector Manufacturing) with exactly: revenue 1.20e9, EBIT 38e6, interest expense 61e6, total debt 1.05e9, total assets 1.60e9, equity 140e6 in the latest year; margin_mean 0.035, margin_change_sd 0.018, revenue_growth_median 0.01. The rescue-engine tests use it.
- macro.json: dgs10 0.042; sector medians for all 8 sectors.
- keeper_log.json: 10 fictional entries, newest first.
- Validate every output file against /data/schema/ and fail loudly if anything does not match.
Then run it and commit the generated files.
```

**F3：data-pipeline spec**（在 Kiro 的 “Let's build” 页选 **Spec**，再贴）

```
Create a spec named "data-pipeline". Follow tech.md, edgar-rules.md, zombie-definition.md and data-contract.md exactly.
Scope: fetch the needed XBRL concepts for all non-financial US filers with tickers (frames endpoint first), build 5 fiscal years per firm, apply the tag priorities, compute ICR with the shared rules, classify status with reasons, compute rescue_inputs and sector medians, fetch DGS10 from FRED, and write the four files in /data that pass the JSON Schemas.
Enable property-based testing with hypothesis: write every property in zombie-definition.md as a test, and run data/fixtures/icr_cases.json as shared golden tests.
Keep a small CLI: python -m pipeline.run --limit N for quick runs.
Before writing tasks, list any place where the contract or the definition is ambiguous and ask me.
```

---

## 5. 协作规则

- **分工**：你负责 `/pipeline` 和 `/data` 的生成；我负责 `/web` 和 `/tools`。不改对方的文件夹。要改，先开 issue 说一声。
- **分支**：`main` 只通过 Pull Request 合并。你在 `pipeline/*` 分支上工作，我在 `web/*` 分支上工作。
- **数据合同**：改合同时，合同、schema、TypeScript 类型三处在同一个提交里一起改，并在 PR 里 @ 对方。
- **绝对不要**：把 `.kiro` 写进 `.gitignore`（会被取消参赛资格）；提交任何 API key 或 `.env`；用没有授权的素材（规则在 `asset-licensing.md`）。
- **记录**：用 Kiro 做完一件事就截图，存到 `docs/kiro-evidence/`。评委打分很看重我们怎么用 Kiro，这些截图就是证据。
- **有问题**：直接在 GitHub 开 issue，或者微信找我。
