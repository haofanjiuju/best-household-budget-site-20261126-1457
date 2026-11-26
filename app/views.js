// Hearth & Ledger — the six views.
//
// Each view is a function of (state, ui) returning an HTML string. The router
// in main.js drops the string into #app and hands clicks and form submits to
// the action handlers at the bottom of this file. Nothing in a view fetches
// anything: every figure comes from the store, and every control writes back
// to it, so what you see is what the ledger holds.

import {
  CATEGORIES, DEFAULT_MONTH, MONTHS, TODAY, categoryById, money, money0, monthLabel,
} from './data.js';
import { donutChart, donutLegend, monthBars } from './charts.js';
import {
  addBill, addGoal, addToGoal, addTransaction, categorySpending, deleteBill,
  deleteGoal, deleteTransaction, downloadFile, markBillPaid, monthRows,
  monthSummaries, monthSummary, resetStore, setBudget, totalBudget,
  transactionsCsv, undoBillPaid, updateTransaction,
} from './store.js';

export function esc(text) {
  return String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function monthOptions(selected) {
  return MONTHS.map((m) => `<option value="${m.id}"${m.id === selected ? ' selected' : ''}>${m.label}</option>`).join('');
}

function monthPicker(selected) {
  return `<label class="field">Month
    <select data-ui="month" aria-label="Month">${monthOptions(selected)}</select>
  </label>`;
}

function toast(message) {
  const old = document.querySelector('.toast');
  if (old) old.remove();
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

function kpi(label, value, sub, tone) {
  return `<div class="kpi${tone ? ' ' + tone : ''}">
    <div class="label">${label}</div>
    <div class="value">${value}</div>
    <div class="sub">${sub}</div>
  </div>`;
}

function progressFill(pct) {
  const cls = pct > 100 ? 'red' : pct >= 80 ? 'amber' : 'green';
  return `<div class="bar-track" role="img" aria-label="${Math.round(pct)} percent of budget used">
    <div class="bar-fill ${cls}" style="width:${Math.min(100, pct)}%"></div></div>`;
}

// ---------------------------------------------------------------- dashboard

export function viewDashboard(state, ui) {
  const month = ui.month;
  const s = monthSummary(state, month);
  const cats = categorySpending(state, month);
  const spent = cats.filter((c) => c.spent > 0).sort((a, b) => b.spent - a.spent);
  const topCats = [...cats].sort((a, b) => b.spent - a.spent).slice(0, 5);
  const bills = state.bills;
  const unpaid = bills.filter((b) => !b.paid);
  const paidSum = bills.filter((b) => b.paid).reduce((sum, b) => sum + b.amount, 0);
  const dueSum = unpaid.reduce((sum, b) => sum + b.amount, 0);
  const recent = [...state.transactions]
    .filter((t) => t.date.startsWith(month))
    .slice(0, 8);
  const months = monthSummaries(state).map((m) => ({
    label: m.month.slice(5) === '06' ? 'Jun' : m.month.slice(5) === '07' ? 'Jul'
      : m.month.slice(5) === '08' ? 'Aug' : m.month.slice(5) === '09' ? 'Sep'
        : m.month.slice(5) === '10' ? 'Oct' : 'Nov',
    income: m.income,
    spending: m.spending,
  }));

  return `
  <div class="page-head">
    <div><h1>${monthLabel(month)} at a glance</h1>
    <p>How the Chen household is doing this month — income, spending, bills and goals, all in one place.</p></div>
    <div class="spacer"></div>
    <div class="filter-row" style="margin:0">${monthPicker(month)}</div>
  </div>

  <div class="callout"><strong>${money0(s.balance)} left over in ${monthLabel(month)}.</strong>
  That is ${Math.round(s.rate)}% of the month's income — enough to add to the Japan trip fund
  or the emergency fund. Spending is ${money0(s.spending)} against a ${money0(totalBudget(state))} monthly budget.</div>

  <div class="kpis">
    ${kpi('Income', money(s.income), `${monthRows(state, month).filter((t) => t.type === 'income').length} paydays &amp; other income`)}
    ${kpi('Spending', money(s.spending), `${monthRows(state, month).filter((t) => t.type === 'expense').length} purchases`, s.spending > totalBudget(state) ? 'warn' : '')}
    ${kpi('Left over', money(s.balance), 'Income minus spending', 'good')}
    ${kpi('Savings rate', `${Math.round(s.rate)}%`, 'Share of income kept', 'good')}
  </div>

  <div class="grid-2" style="margin-bottom:18px">
    <section class="card">
      <h2>Where the money went</h2>
      <p class="hint">Spending by category, ${monthLabel(month)}.</p>
      <div class="chart-flex">
        <div class="donut-wrap">${donutChart(spent.map((c) => ({ name: c.name, color: c.color, value: c.spent })), money0(s.spending), money0(s.spending))}</div>
        <div class="donut-legend">${donutLegend(spent.map((c) => ({ name: c.name, color: c.color, value: c.spent })))}</div>
      </div>
    </section>
    <section class="card">
      <h2>Budget check</h2>
      <p class="hint">Biggest categories against their monthly budgets. <a href="#/budgets">Adjust budgets →</a></p>
      ${topCats.map((c) => {
        const pct = c.budget > 0 ? (c.spent / c.budget) * 100 : 0;
        return `<div class="budget-row">
          <span class="b-name"><span class="cat-dot" style="background:${c.color}"></span>${esc(c.name)}</span>
          ${progressFill(pct)}
          <span class="b-nums">${money0(c.spent)} <small>of ${money0(c.budget)}</small></span>
          <span class="b-nums"><span class="badge ${pct > 100 ? 'red' : pct >= 80 ? 'amber' : 'green'}">${pct > 100 ? 'Over' : pct >= 100 ? 'At budget' : pct >= 80 ? 'Near limit' : 'On track'}</span></span>
        </div>`;
      }).join('')}
    </section>
  </div>

  <div class="grid-2" style="margin-bottom:18px">
    <section class="card">
      <h2>Six months: income vs spending</h2>
      <p class="hint">Every month since June the family has kept a third or more of its income.</p>
      ${monthBars(months)}
    </section>
    <section class="card">
      <h2>Bills due in ${monthLabel(month)}</h2>
      <p class="hint">${bills.filter((b) => b.paid).length} of ${bills.length} paid (${money0(paidSum)}) · ${money0(dueSum)} still to go.</p>
      ${unpaid.length === 0
        ? '<p class="empty">All bills are paid for this month. Nicely done.</p>'
        : unpaid.map((b) => `<div class="bill-row">
          <div class="grow"><strong>${esc(b.name)}</strong><br><span class="muted">Due ${monthLabel(month).split(' ')[0]} ${b.dueDay} · ${esc(categoryById(b.category).name)}</span></div>
          <span class="b-amount">${money(b.amount)}</span>
          <button class="small" data-action="bill-pay" data-id="${b.id}">Mark paid</button>
        </div>`).join('')}
      <p style="margin:12px 0 0"><a href="#/bills">See all bills →</a></p>
    </section>
  </div>

  <div class="grid-2">
    <section class="card">
      <h2>Savings goals</h2>
      <p class="hint">Four goals, ${money0(state.goals.reduce((sum, g) => sum + g.saved, 0))} saved so far.</p>
      ${state.goals.map((g) => {
        const pct = g.target > 0 ? (g.saved / g.target) * 100 : 0;
        return `<div style="margin-bottom:14px">
          <div style="display:flex;justify-content:space-between;gap:10px"><strong>${esc(g.name)}</strong>
          <span class="muted">${money0(g.saved)} of ${money0(g.target)} · ${Math.round(pct)}%</span></div>
          ${progressFill(pct)}
        </div>`;
      }).join('')}
      <p style="margin:4px 0 0"><a href="#/goals">Add money to a goal →</a></p>
    </section>
    <section class="card">
      <h2>Recent transactions</h2>
      <p class="hint">Latest spending and income in ${monthLabel(month)}.</p>
      <div class="table-wrap"><table>
        <thead><tr><th>Date</th><th>What</th><th class="num">Amount</th></tr></thead>
        <tbody>${recent.map((t) => `<tr>
          <td>${t.date.slice(5)}</td>
          <td>${esc(t.description)}</td>
          <td class="num ${t.type === 'income' ? 'amount-in' : t.type === 'transfer' ? 'amount-transfer' : 'amount-out'}">${t.type === 'income' ? '+' : t.type === 'transfer' ? '→ ' : '−'}${money(t.amount)}</td>
        </tr>`).join('')}</tbody>
      </table></div>
      <p style="margin:12px 0 0"><a href="#/transactions">See all transactions →</a></p>
    </section>
  </div>`;
}

// ------------------------------------------------------------- transactions

function categoryOptions(selected, includeIncome) {
  const opts = CATEGORIES.map((c) => `<option value="${c.id}"${c.id === selected ? ' selected' : ''}>${c.name}</option>`).join('');
  return includeIncome ? `<option value="income"${selected === 'income' ? ' selected' : ''}>Income</option>` + opts : opts;
}

export function viewTransactions(state, ui) {
  const f = ui.txFilter;
  const editing = f.editingId ? state.transactions.find((t) => t.id === f.editingId) : null;
  let rows = [...state.transactions];
  if (f.month !== 'all') rows = rows.filter((t) => t.date.startsWith(f.month));
  if (f.type !== 'all') rows = rows.filter((t) => t.type === f.type);
  if (f.category !== 'all') rows = rows.filter((t) => t.category === f.category);
  if (f.q.trim()) {
    const q = f.q.trim().toLowerCase();
    rows = rows.filter((t) => t.description.toLowerCase().includes(q));
  }
  const shown = rows.length;

  return `
  <div class="page-head">
    <div><h1>Transactions</h1>
    <p>Every dollar in and out, June–November 2026. Add, edit or delete any row — the totals everywhere else update at once.</p></div>
  </div>

  <section class="card">
    <h2>${editing ? 'Edit transaction' : 'Add a transaction'}</h2>
    <form data-form="tx">
      <input type="hidden" name="id" value="${editing ? editing.id : ''}">
      <div class="form-grid">
        <div class="field"><label for="tx-date">Date</label>
          <input id="tx-date" name="date" type="date" required value="${editing ? editing.date : TODAY}"></div>
        <div class="field"><label for="tx-type">Type</label>
          <select id="tx-type" name="type">
            <option value="expense"${editing && editing.type === 'expense' ? ' selected' : ''}>Expense</option>
            <option value="income"${editing && editing.type === 'income' ? ' selected' : ''}>Income</option>
          </select></div>
        <div class="field"><label for="tx-category">Category</label>
          <select id="tx-category" name="category">${categoryOptions(editing ? editing.category : 'groceries', true)}</select></div>
        <div class="field"><label for="tx-desc">Description</label>
          <input id="tx-desc" name="description" type="text" required maxlength="120" placeholder="e.g. Weekly shop at Maple Street" value="${editing ? esc(editing.description) : ''}"></div>
        <div class="field"><label for="tx-amount">Amount ($)</label>
          <input id="tx-amount" name="amount" type="number" required min="0.01" step="0.01" placeholder="0.00" value="${editing ? editing.amount : ''}"></div>
      </div>
      <div style="margin-top:14px;display:flex;gap:10px;flex-wrap:wrap">
        <button type="submit">${editing ? 'Save changes' : 'Add transaction'}</button>
        ${editing ? '<button type="button" class="secondary" data-action="tx-cancel-edit">Cancel</button>' : ''}
      </div>
    </form>
  </section>

  <section class="card">
    <h2>All transactions</h2>
    <div class="filter-row">
      <div class="field"><label>Month</label>
        <select data-ui="tx-month">
          <option value="all"${f.month === 'all' ? ' selected' : ''}>All months</option>
          ${monthOptions(f.month)}
        </select></div>
      <div class="field"><label>Type</label>
        <select data-ui="tx-type">
          <option value="all"${f.type === 'all' ? ' selected' : ''}>Income &amp; spending</option>
          <option value="income"${f.type === 'income' ? ' selected' : ''}>Income only</option>
          <option value="expense"${f.type === 'expense' ? ' selected' : ''}>Spending only</option>
          <option value="transfer"${f.type === 'transfer' ? ' selected' : ''}>Transfers only</option>
        </select></div>
      <div class="field"><label>Category</label>
        <select data-ui="tx-category">
          <option value="all">All categories</option>
          ${categoryOptions(f.category, true)}
        </select></div>
      <div class="field grow"><label>Search</label>
        <input type="search" data-ui="tx-q" placeholder="Search descriptions, e.g. pharmacy" value="${esc(f.q)}" aria-label="Search transactions"></div>
      <button class="secondary" data-action="tx-clear-filters">Clear filters</button>
    </div>
    <p class="muted">Showing ${shown} of ${state.transactions.length} transactions.</p>
    ${shown === 0 ? '<p class="empty">Nothing matches these filters. Try clearing them.</p>' : `
    <div class="table-wrap"><table>
      <thead><tr><th>Date</th><th>Description</th><th>Category</th><th class="num">Amount</th><th></th></tr></thead>
      <tbody>${rows.map((t) => {
        const cat = t.type === 'income' ? { name: 'Income', color: '#2e7d4f' }
          : t.type === 'transfer' ? { name: 'Savings transfer', color: '#2f6f8f' }
            : categoryById(t.category);
        return `<tr>
          <td>${t.date}</td>
          <td>${esc(t.description)}</td>
          <td><span class="cat-dot" style="background:${cat.color}"></span>${esc(cat.name)}</td>
          <td class="num ${t.type === 'income' ? 'amount-in' : t.type === 'transfer' ? 'amount-transfer' : 'amount-out'}">${t.type === 'income' ? '+' : t.type === 'transfer' ? '→ ' : '−'}${money(t.amount)}</td>
          <td style="white-space:nowrap;text-align:right">
            ${t.type === 'transfer'
              ? '<span class="muted">from a goal</span>'
              : `<button class="small secondary" data-action="tx-edit" data-id="${t.id}">Edit</button>`}
            <button class="small danger" data-action="tx-delete" data-id="${t.id}">Delete</button>
          </td>
        </tr>`;
      }).join('')}</tbody>
    </table></div>`}
  </section>`;
}

// ------------------------------------------------------------------ budgets

export function viewBudgets(state, ui) {
  const month = ui.month;
  const cats = categorySpending(state, month);
  const totalSpent = cats.reduce((s, c) => s + c.spent, 0);
  const total = totalBudget(state);
  const over = cats.filter((c) => c.spent > c.budget);

  return `
  <div class="page-head">
    <div><h1>Monthly budgets</h1>
    <p>Ten categories, one monthly budget of ${money0(total)}. Change any number — it saves
    straight away and the progress bars everywhere update with it.</p></div>
    <div class="spacer"></div>
    <div class="filter-row" style="margin:0">${monthPicker(month)}</div>
  </div>

  <div class="callout"><strong>${monthLabel(month)}: ${money0(totalSpent)} spent of ${money0(total)} budgeted.</strong>
  ${over.length === 0
    ? 'Every category is inside its budget this month.'
    : `${over.map((c) => c.name).join(', ')} ${over.length === 1 ? 'is' : 'are'} over budget — see below.`}
  </div>

  <section class="card">
    <h2>Budgets for ${monthLabel(month)}</h2>
    <p class="hint">Edit a budget amount and it is saved immediately. Amounts are monthly.</p>
    ${cats.map((c) => {
      const pct = c.budget > 0 ? (c.spent / c.budget) * 100 : 0;
      const left = c.budget - c.spent;
      return `<div class="budget-row">
        <span class="b-name"><span class="cat-dot" style="background:${c.color}"></span>${esc(c.name)}</span>
        ${progressFill(pct)}
        <span class="b-nums">${money0(c.spent)} spent<br><small>${left >= 0 ? money0(left) + ' left' : money0(-left) + ' over'}</small></span>
        <span class="b-nums hide-sm"><label style="display:inline">Budget $
          <input type="number" min="0" step="10" value="${c.budget}" data-budget-for="${c.id}"
            style="width:96px;display:inline-block" aria-label="${esc(c.name)} monthly budget"></label>
          <span class="badge ${pct > 100 ? 'red' : pct >= 80 ? 'amber' : 'green'}" style="margin-left:6px">${pct > 100 ? 'Over' : pct >= 100 ? 'At budget' : pct >= 80 ? 'Near limit' : 'On track'}</span></span>
      </div>`;
    }).join('')}
    <div class="budget-row" style="border-top:2px solid var(--line);font-weight:700">
      <span class="b-name">Total</span>
      ${progressFill(total > 0 ? (totalSpent / total) * 100 : 0)}
      <span class="b-nums">${money0(totalSpent)} spent<br><small>${money0(total - totalSpent)} left overall</small></span>
      <span class="b-nums hide-sm">Budget ${money0(total)}</span>
    </div>
  </section>

  <section class="card">
    <h2>How the budget is set</h2>
    <p>Housing is the fixed cost — rent and insurance take ${money0(cats.find((c) => c.id === 'housing').budget)} of the
    ${money0(total)}. Groceries (${money0(cats.find((c) => c.id === 'groceries').budget)}) and education
    (${money0(cats.find((c) => c.id === 'education').budget)}, tutoring and piano) are the next biggest. The family
    reviews these numbers on the first Sunday of each month and only changes what the last three months justify.</p>
    <p style="margin-bottom:0">Tip: a category at 80% or more of its budget before the month ends shows “Near limit” —
    that is the moment to check it, not the end of the month.</p>
  </section>`;
}

// --------------------------------------------------------------------- bills

export function viewBills(state) {
  const bills = [...state.bills].sort((a, b) => a.dueDay - b.dueDay);
  const paid = bills.filter((b) => b.paid);
  const unpaid = bills.filter((b) => !b.paid);
  const paidSum = paid.reduce((s, b) => s + b.amount, 0);
  const dueSum = unpaid.reduce((s, b) => s + b.amount, 0);

  return `
  <div class="page-head">
    <div><h1>Bills</h1>
    <p>Recurring bills for November 2026. Marking one paid writes the matching expense into
    Transactions, so the ledger and the bills always agree — undo removes it again.</p></div>
  </div>

  <div class="callout"><strong>${paid.length} of ${bills.length} bills paid · ${money0(paidSum)} paid · ${money0(dueSum)} still due.</strong>
  ${unpaid.length > 0 ? `Next up: ${esc(unpaid[0].name)} — ${money(unpaid[0].amount)} on November ${unpaid[0].dueDay}.` : 'Everything is paid for this month.'}</div>

  <section class="card">
    <h2>November 2026 bills</h2>
    ${bills.map((b) => `<div class="bill-row">
      <div class="grow"><strong>${esc(b.name)}</strong><br>
        <span class="muted">${esc(categoryById(b.category).name)} · due November ${b.dueDay}${b.paid && b.paidDate ? ` · paid ${b.paidDate}` : ''}</span></div>
      <span class="b-amount">${money(b.amount)}</span>
      ${b.paid
        ? `<span class="badge green">Paid ✓</span><button class="small secondary" data-action="bill-undo" data-id="${b.id}">Undo</button>`
        : `<span class="badge amber">Due Nov ${b.dueDay}</span><button class="small" data-action="bill-pay" data-id="${b.id}">Mark paid</button>`}
      <button class="small danger" data-action="bill-delete" data-id="${b.id}">Remove</button>
    </div>`).join('')}
  </section>

  <section class="card">
    <h2>Add a bill</h2>
    <form data-form="bill">
      <div class="inline-form">
        <div class="field grow"><label for="bill-name">Bill name</label>
          <input id="bill-name" name="name" type="text" required maxlength="80" placeholder="e.g. Piano tuner — annual"></div>
        <div class="field"><label for="bill-amount">Amount ($)</label>
          <input id="bill-amount" name="amount" type="number" required min="0.01" step="0.01" placeholder="0.00"></div>
        <div class="field"><label for="bill-category">Category</label>
          <select id="bill-category" name="category">${categoryOptions('utilities', false)}</select></div>
        <div class="field"><label for="bill-day">Due day</label>
          <input id="bill-day" name="dueDay" type="number" required min="1" max="28" value="1"></div>
        <button type="submit">Add bill</button>
      </div>
    </form>
    <p class="hint" style="margin:10px 0 0">New bills start unpaid. Marking one paid adds its expense to Transactions dated today.</p>
  </section>`;
}

// --------------------------------------------------------------------- goals

export function viewGoals(state) {
  const savedTotal = state.goals.reduce((s, g) => s + g.saved, 0);
  const targetTotal = state.goals.reduce((s, g) => s + g.target, 0);

  return `
  <div class="page-head">
    <div><h1>Savings goals</h1>
    <p>What the family is saving for, and how far along each goal is. Adding money moves it
    from this month's balance into the goal and records a transfer in Transactions.</p></div>
  </div>

  <div class="callout"><strong>${money0(savedTotal)} saved toward ${money0(targetTotal)} of goals.</strong>
  That is ${targetTotal > 0 ? Math.round((savedTotal / targetTotal) * 100) : 0}% of the way there — the emergency fund
  is the closest to done at ${state.goals.length ? Math.round((state.goals[0].saved / state.goals[0].target) * 100) : 0}%.</div>

  <div class="grid-2" style="margin-bottom:18px">
    ${state.goals.map((g) => {
      const pct = g.target > 0 ? (g.saved / g.target) * 100 : 0;
      return `<section class="card goal-card">
        <div class="goal-top"><h3>${esc(g.name)}</h3>
          <span class="badge ${pct >= 100 ? 'green' : pct >= 60 ? 'blue' : 'grey'}">${pct >= 100 ? 'Funded ✓' : Math.round(pct) + '%'}</span></div>
        <p class="muted" style="margin:0">${esc(g.note || '')}</p>
        <div class="goal-nums"><strong>${money0(g.saved)}</strong> saved of ${money0(g.target)} · ${money0(g.target - g.saved)} to go</div>
        ${progressFill(pct)}
        <div class="goal-add">
          <label style="margin:0">Add $ <input type="number" min="1" step="1" placeholder="100" data-goal-amount="${g.id}" aria-label="Amount to add to ${esc(g.name)}"></label>
          <button class="small" data-action="goal-add-funds" data-id="${g.id}">Add funds</button>
          <button class="small danger" data-action="goal-delete" data-id="${g.id}">Delete goal</button>
        </div>
      </section>`;
    }).join('')}
  </div>

  <section class="card">
    <h2>Add a savings goal</h2>
    <form data-form="goal">
      <div class="inline-form">
        <div class="field grow"><label for="goal-name">Goal name</label>
          <input id="goal-name" name="name" type="text" required maxlength="80" placeholder="e.g. New bikes for the kids"></div>
        <div class="field"><label for="goal-target">Target ($)</label>
          <input id="goal-target" name="target" type="number" required min="1" step="1" placeholder="1000"></div>
        <div class="field"><label for="goal-saved">Already saved ($)</label>
          <input id="goal-saved" name="saved" type="number" min="0" step="1" value="0"></div>
        <div class="field grow"><label for="goal-note">Note</label>
          <input id="goal-note" name="note" type="text" maxlength="120" placeholder="Why this goal matters"></div>
        <button type="submit">Add goal</button>
      </div>
    </form>
  </section>`;
}

// ------------------------------------------------------------------- reports

export function viewReports(state, ui) {
  const month = ui.month;
  const cats = categorySpending(state, month).filter((c) => c.spent > 0).sort((a, b) => b.spent - a.spent);
  const s = monthSummary(state, month);
  const months = monthSummaries(state);
  const labels = { '2026-06': 'Jun', '2026-07': 'Jul', '2026-08': 'Aug', '2026-09': 'Sep', '2026-10': 'Oct', '2026-11': 'Nov' };

  return `
  <div class="page-head">
    <div><h1>Reports</h1>
    <p>Six months of the household's money, side by side — and the whole ledger to take with you.</p></div>
    <div class="spacer"></div>
    <div class="filter-row" style="margin:0">${monthPicker(month)}</div>
  </div>

  <div class="grid-2" style="margin-bottom:18px">
    <section class="card">
      <h2>Income vs spending, June–November</h2>
      <p class="hint">The family kept between 33% and 38% of its income every month.</p>
      ${monthBars(months.map((m) => ({ label: labels[m.month], income: m.income, spending: m.spending })))}
    </section>
    <section class="card">
      <h2>Month by month</h2>
      <p class="hint">Balance is income minus spending; the rate is the share of income kept.</p>
      <div class="table-wrap"><table>
        <thead><tr><th>Month</th><th class="num">Income</th><th class="num">Spending</th><th class="num">Balance</th><th class="num">Rate</th></tr></thead>
        <tbody>${months.map((m) => `<tr${m.month === month ? ' style="background:var(--pine-soft)"' : ''}>
          <td>${m.month === '2026-06' ? 'June' : m.month === '2026-07' ? 'July' : m.month === '2026-08' ? 'August' : m.month === '2026-09' ? 'September' : m.month === '2026-10' ? 'October' : 'November'} 2026</td>
          <td class="num">${money0(m.income)}</td>
          <td class="num">${money0(m.spending)}</td>
          <td class="num amount-in">${money0(m.balance)}</td>
          <td class="num">${Math.round(m.rate)}%</td>
        </tr>`).join('')}</tbody>
      </table></div>
    </section>
  </div>

  <section class="card">
    <h2>Where ${monthLabel(month)}'s spending went</h2>
    <p class="hint">Share of the month's ${money0(s.spending)} of spending, against each category's budget.</p>
    <div class="table-wrap"><table>
      <thead><tr><th>Category</th><th class="num">Spent</th><th class="num">Share</th><th class="num">Budget</th><th class="num">Left</th></tr></thead>
      <tbody>${cats.map((c) => `<tr>
        <td><span class="cat-dot" style="background:${c.color}"></span>${esc(c.name)}</td>
        <td class="num">${money(c.spent)}</td>
        <td class="num">${s.spending > 0 ? Math.round((c.spent / s.spending) * 100) : 0}%</td>
        <td class="num">${money(c.budget)}</td>
        <td class="num ${c.budget - c.spent < 0 ? 'amount-out' : ''}">${money(c.budget - c.spent)}</td>
      </tr>`).join('')}</tbody>
    </table></div>
    <p style="margin:12px 0 0">Housing is the biggest line at ${(() => { const h = cats.find((c) => c.id === 'housing'); return h && s.spending > 0 ? Math.round((h.spent / s.spending) * 100) : 0; })()}% of spending;
    groceries are next. Together the top three categories are about two-thirds of everything the family spends.</p>
  </section>

  <section class="card">
    <h2>Take your data with you</h2>
    <p>Export the ledger as a spreadsheet file or as JSON, or start over from the sample data.
    Your data lives only in this browser — exporting is the way to keep a copy.</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap">
      <button data-action="export-csv">Download CSV of all ${state.transactions.length} transactions</button>
      <button class="secondary" data-action="export-json">Download JSON of the whole ledger</button>
      <button class="danger" data-action="reset-data">Reset to sample data</button>
    </div>
  </section>`;
}

// ------------------------------------------------------------ action wiring

export function handleAction(action, el, state, ui, rerender) {
  const id = el.dataset.id;
  switch (action) {
    case 'tx-edit': {
      ui.txFilter.editingId = id;
      rerender();
      document.getElementById('tx-date')?.focus();
      break;
    }
    case 'tx-cancel-edit':
      ui.txFilter.editingId = null;
      rerender();
      break;
    case 'tx-delete': {
      const row = state.transactions.find((t) => t.id === id);
      if (row && window.confirm(`Delete “${row.description}” (${money(row.amount)})?`)) {
        deleteTransaction(state, id);
        toast('Transaction deleted.');
        rerender();
      }
      break;
    }
    case 'tx-clear-filters':
      ui.txFilter.month = 'all';
      ui.txFilter.type = 'all';
      ui.txFilter.category = 'all';
      ui.txFilter.q = '';
      ui.txFilter.editingId = null;
      rerender();
      break;
    case 'bill-pay':
      if (markBillPaid(state, id)) { toast('Bill marked paid — expense added to Transactions.'); rerender(); }
      break;
    case 'bill-undo':
      if (undoBillPaid(state, id)) { toast('Bill marked unpaid — its expense was removed.'); rerender(); }
      break;
    case 'bill-delete': {
      const bill = state.bills.find((b) => b.id === id);
      if (bill && window.confirm(`Remove the bill “${bill.name}”?`)) {
        deleteBill(state, id);
        toast('Bill removed.');
        rerender();
      }
      break;
    }
    case 'goal-add-funds': {
      const input = document.querySelector(`[data-goal-amount="${id}"]`);
      const amount = Number(input?.value);
      if (!(amount > 0)) { toast('Enter an amount above $0 first.'); input?.focus(); break; }
      const goal = addToGoal(state, id, amount);
      if (goal) { toast(`${money(amount)} added to ${goal.name}.`); rerender(); }
      break;
    }
    case 'goal-delete': {
      const goal = state.goals.find((g) => g.id === id);
      if (goal && window.confirm(`Delete the goal “${goal.name}”? Its saved amount is not refunded to the ledger.`)) {
        deleteGoal(state, id);
        toast('Goal deleted.');
        rerender();
      }
      break;
    }
    case 'export-csv':
      downloadFile('hearth-ledger-transactions.csv', transactionsCsv(state), 'text/csv');
      toast('CSV downloaded.');
      break;
    case 'export-json':
      downloadFile('hearth-ledger.json', JSON.stringify(state, null, 2), 'application/json');
      toast('JSON downloaded.');
      break;
    case 'reset-data':
      if (window.confirm('Reset everything to the June–November 2026 sample data? Your changes will be lost.')) {
        const fresh = resetStore();
        Object.assign(state, fresh);
        ui.txFilter.editingId = null;
        toast('Sample data restored.');
        rerender();
      }
      break;
    default:
      break;
  }
}

export function handleForm(form, state, ui, rerender) {
  const data = new FormData(form);
  const kind = form.dataset.form;
  if (kind === 'tx') {
    const id = String(data.get('id') || '');
    const fields = {
      date: String(data.get('date') || TODAY),
      type: String(data.get('type') || 'expense'),
      category: String(data.get('category') || 'groceries'),
      description: String(data.get('description') || ''),
      amount: Number(data.get('amount') || 0),
    };
    if (!fields.description.trim() || !(fields.amount > 0)) { toast('Add a description and an amount above $0.'); return; }
    if (id) {
      updateTransaction(state, id, fields);
      ui.txFilter.editingId = null;
      toast('Transaction updated.');
    } else {
      addTransaction(state, fields);
      toast('Transaction added.');
    }
    rerender();
  } else if (kind === 'bill') {
    const name = String(data.get('name') || '');
    const amount = Number(data.get('amount') || 0);
    if (!name.trim() || !(amount > 0)) { toast('Add a bill name and an amount above $0.'); return; }
    addBill(state, {
      name,
      amount,
      category: String(data.get('category') || 'utilities'),
      dueDay: Number(data.get('dueDay') || 1),
    });
    toast('Bill added.');
    rerender();
  } else if (kind === 'goal') {
    const name = String(data.get('name') || '');
    const target = Number(data.get('target') || 0);
    if (!name.trim() || !(target > 0)) { toast('Add a goal name and a target above $0.'); return; }
    addGoal(state, {
      name,
      target,
      saved: Number(data.get('saved') || 0),
      note: String(data.get('note') || ''),
    });
    toast('Goal added.');
    rerender();
  }
}
