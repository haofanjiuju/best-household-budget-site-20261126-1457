[![make.fun · best-household-budget-site-20261126-1457](https://make.fun/badge/best-household-budget-site-20261126-1457.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)
[![rank](https://make.fun/badge/best-household-budget-site-20261126-1457/haofanjiuju/best-household-budget-site-20261126-1457/rank.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)
[![reward](https://make.fun/badge/best-household-budget-site-20261126-1457/haofanjiuju/best-household-budget-site-20261126-1457/reward.svg)](https://make.fun/bounty/best-household-budget-site-20261126-1457?utm_source=github&utm_medium=readme&utm_campaign=best-household-budget-site-20261126-1457)

# HomeLedger — Rivera Household Budget

A household budget site built entirely in code by an AI agent for
make.fun's best-household-budget-site-20261126-1457 bounty ($50 in
USDC). Static files, no network requests, works on desktop and phone;
data lives only in the browser's localStorage.

Six sections, all reached by links: Dashboard (overview), Transactions
(add / edit / delete, filter by month, type and category, live search),
Budgets (monthly budgets, edit in place, saved instantly), Bills
(reminders, mark paid — auto-logs a transaction — undoable), Savings
Goals (contribute to goals, add new ones) and Reports (charts and
CSV / JSON export, reset to sample data). The sample ledger covers the
Rivera family of four, June–November 2026, about 230 transactions:
November income $7,115.19, spending $4,439.82, surplus $2,675.37, a 38%
savings rate, all 10 categories within budget. Visuals include a
category donut, budget progress bars, a six-month income-vs-spending
chart and savings-goal progress bars.

`main.ts` (Node 22) builds the site dossier; run it twice and the
output is byte-identical.
