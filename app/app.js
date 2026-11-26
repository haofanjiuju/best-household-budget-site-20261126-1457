// HomeLedger — single-page household budget app (hash routing, localStorage).
import {
  CATEGORIES, INCOME_CATEGORIES, MONTHS, CURRENT_MONTH, TODAY,
  monthLabel, fmt, fmt0, loadStore, saveStore, resetStore,
  categoryName, categoryColor, monthTx, monthTotals, spentByCategory,
  isBillPaid, billStatus,
} from './data.js';

let store = loadStore();
const app = document.getElementById('app');
const ui = { txMonth: CURRENT_MONTH, txType: 'all', txCat: 'all', txQuery: '', reportMonth: CURRENT_MONTH, editId: null };

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const uid = () => 't' + Date.now().toString(36) + Math.floor(Math.random() * 1e4).toString(36);
const catOptions = (sel) => CATEGORIES.map((c) => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${c.name}</option>`).join('');
const incomeCatOptions = (sel) => INCOME_CATEGORIES.map((c) => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${c.name}</option>`).join('');
const monthOptions = (sel) => MONTHS.map((m) => `<option value="${m}" ${m === sel ? 'selected' : ''}>${monthLabel(m)}</option>`).join('');

/* ---------- shared bits ---------- */
function donut(segments, size = 190) {
  // segments: [{label, value, color}] — SVG donut with a hole, built from stroke-dasharray arcs.
  const total = segments.reduce((s, x) => s + x.value, 0) || 1;
  const r = 70, c = 2 * Math.PI * r;
  let offset = 0;
  const arcs = segments.map((s) => {
    const frac = s.value / total;
    const len = Math.max(frac * c - 2, 0.5);
    const el = `<circle cx="100" cy="100" r="${r}" fill="none" stroke="${s.color}" stroke-width="30" stroke-dasharray="${len} ${c - len}" stroke-dashoffset="${-offset}" />`;
    offset += frac * c;
    return el;
  }).join('');
  return `<svg viewBox="0 0 200 200" width="${size}" height="${size}" role="img" aria-label="Spending by category chart">${arcs}
    <text x="100" y="96" text-anchor="middle" class="donut-total">${fmt0(total)}</text>
    <text x="100" y="116" text-anchor="middle" class="donut-label">spent in ${monthLabel(CURRENT_MONTH).split(' ')[0]}</text></svg>`;
}

function barRow(label, spent, budget, color) {
  const pct = budget > 0 ? Math.min(spent / budget, 1) : 0;
  const over = spent > budget;
  return `<div class="bar-row">
    <div class="bar-head"><span><i class="dot" style="background:${color}"></i>${esc(label)}</span>
    <span class="${over ? 'over' : ''}">${fmt0(spent)} of ${fmt0(budget)}</span></div>
    <div class="bar-track"><div class="bar-fill ${over ? 'over' : ''}" style="width:${Math.round(pct * 100)}%;background:${color}"></div></div>
    <div class="bar-sub">${over ? `Over budget by ${fmt0(spent - budget)}` : `${fmt0(budget - spent)} left · ${Math.round((spent / budget) * 100)}% used`}</div>
  </div>`;
}

function txRow(t) {
  const sign = t.type === 'income' ? '+' : '−';
  return `<tr>
    <td>${t.date}</td>
    <td>${esc(t.description)}</td>
    <td><span class="chip" style="--chip:${categoryColor(t.category)}">${esc(categoryName(t.category))}</span></td>
    <td class="num ${t.type}">${sign}${fmt(t.amount)}</td>
    <td class="row-actions">
      <button class="btn small" data-edit-tx="${t.id}">Edit</button>
      <button class="btn small danger" data-del-tx="${t.id}">Delete</button>
    </td></tr>`;
}

function download(filename, text, mime) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: mime }));
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 100);
}

/* ---------- views ---------- */
function viewDashboard() {
  const t = monthTotals(store, CURRENT_MONTH);
  const spent = spentByCategory(store, CURRENT_MONTH);
  const budgetTotal = CATEGORIES.reduce((s, c) => s + (store.budgets[c.id] ?? c.budget), 0);
  const topCats = CATEGORIES.map((c) => ({ ...c, spent: spent[c.id] || 0 }))
    .sort((a, b) => b.spent - a.spent).slice(0, 5);
  const segments = CATEGORIES.map((c) => ({ label: c.name, value: spent[c.id] || 0, color: c.color })).filter((s) => s.value > 0);
  const recent = [...store.transactions].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8);
  const upcoming = store.bills
    .map((b) => ({ ...b, status: billStatus(store, b, CURRENT_MONTH) }))
    .filter((b) => b.status !== 'paid')
    .sort((a, b) => a.dueDay - b.dueDay).slice(0, 5);
  const goalTotal = store.goals.reduce((s, g) => s + g.saved, 0);
  const goalTarget = store.goals.reduce((s, g) => s + g.target, 0);
  const overCats = CATEGORIES.filter((c) => (spent[c.id] || 0) > (store.budgets[c.id] ?? c.budget));

  app.innerHTML = `
  <section class="page-head">
    <div><h1>Good evening, Rivera family</h1>
    <p class="lede">Here's where November stands — ${overCats.length ? `<strong class="warn">${overCats.length} categor${overCats.length > 1 ? 'ies are' : 'y is'} over budget.</strong>` : 'every category is inside its budget so far.'} ${fmt0(t.remaining)} of this month's income is still unspent.</p></div>
    <a class="btn primary" href="#/transactions">+ Add transaction</a>
  </section>
  <section class="stat-grid">
    <div class="stat"><span>Income · November</span><strong class="income">${fmt(t.income)}</strong><small>2 paychecks + freelance</small></div>
    <div class="stat"><span>Spending · November</span><strong class="expense">${fmt(t.expense)}</strong><small>across ${Object.keys(spent).length} categories</small></div>
    <div class="stat"><span>Still unspent</span><strong>${fmt(t.remaining)}</strong><small>${Math.round(t.savingsRate * 100)}% savings rate</small></div>
    <div class="stat"><span>Monthly budget</span><strong>${fmt0(budgetTotal)}</strong><small>${fmt0(t.expense)} spent · ${overCats.length} over</small></div>
  </section>
  <section class="grid-2">
    <div class="card">
      <h2>Where the money went</h2>
      <div class="donut-wrap">${donut(segments)}
        <ul class="legend">${segments.map((s) => `<li><i class="dot" style="background:${s.color}"></i>${esc(s.label)}<b>${fmt0(s.value)}</b></li>`).join('')}</ul>
      </div>
      <a class="card-link" href="#/reports">See the full breakdown →</a>
    </div>
    <div class="card">
      <h2>Budget vs. actual — biggest categories</h2>
      ${topCats.map((c) => barRow(c.name, c.spent, store.budgets[c.id] ?? c.budget, c.color)).join('')}
      <a class="card-link" href="#/budgets">Adjust budgets →</a>
    </div>
  </section>
  <section class="grid-2">
    <div class="card">
      <h2>Bills coming up</h2>
      ${upcoming.length ? `<ul class="bill-list">${upcoming.map((b) => `<li>
          <span><strong>${esc(b.name)}</strong><small>Due ${monthLabel(CURRENT_MONTH).split(' ')[0]} ${b.dueDay} · ${fmt(b.amount)}</small></span>
          <span class="tag ${b.status}">${b.status === 'overdue' ? 'Overdue' : 'Due soon'}</span></li>`).join('')}</ul>`
        : '<p class="muted">All November bills are paid. Nicely done.</p>'}
      <a class="card-link" href="#/bills">Manage all bills →</a>
    </div>
    <div class="card">
      <h2>Savings goals — ${fmt0(goalTotal)} of ${fmt0(goalTarget)}</h2>
      ${store.goals.slice(0, 3).map((g) => `<div class="goal-mini">
          <div class="bar-head"><span>${esc(g.name)}</span><span>${fmt0(g.saved)} / ${fmt0(g.target)}</span></div>
          <div class="bar-track"><div class="bar-fill" style="width:${Math.round((g.saved / g.target) * 100)}%"></div></div></div>`).join('')}
      <a class="card-link" href="#/goals">View all goals →</a>
    </div>
  </section>
  <section class="card">
    <h2>Recent transactions</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Date</th><th>Description</th><th>Category</th><th class="num">Amount</th><th></th></tr></thead>
      <tbody>${recent.map(txRow).join('')}</tbody>
    </table></div>
    <a class="card-link" href="#/transactions">See all transactions →</a>
  </section>`;
}

function txFormHTML() {
  const t = ui.editId ? store.transactions.find((x) => x.id === ui.editId) : null;
  const type = t ? t.type : 'expense';
  const cats = type === 'income' ? incomeCatOptions(t ? t.category : 'paycheck') : catOptions(t ? t.category : 'groceries');
  return `<form id="txForm" class="form-card">
    <h3>${t ? 'Edit transaction' : 'Add a transaction'}</h3>
    <div class="form-grid">
      <label>Date<input type="date" name="date" required value="${t ? t.date : TODAY}"></label>
      <label>Type<select name="type" id="txTypeSel">
        <option value="expense" ${type === 'expense' ? 'selected' : ''}>Expense</option>
        <option value="income" ${type === 'income' ? 'selected' : ''}>Income</option></select></label>
      <label>Category<select name="category" id="txCatSel">${cats}</select></label>
      <label>Description<input type="text" name="description" required maxlength="80" placeholder="e.g. GreenMart" value="${t ? esc(t.description) : ''}"></label>
      <label>Amount (USD)<input type="number" name="amount" required min="0.01" step="0.01" placeholder="0.00" value="${t ? t.amount : ''}"></label>
    </div>
    <div class="form-actions">
      <button class="btn primary" type="submit">${t ? 'Save changes' : 'Add transaction'}</button>
      ${t ? '<button class="btn" type="button" id="txCancelEdit">Cancel</button>' : ''}
    </div></form>`;
}

function viewTransactions() {
  let list = monthTx(store, ui.txMonth);
  const total = list.length;
  if (ui.txType !== 'all') list = list.filter((t) => t.type === ui.txType);
  if (ui.txCat !== 'all') list = list.filter((t) => t.category === ui.txCat);
  if (ui.txQuery.trim()) {
    const q = ui.txQuery.trim().toLowerCase();
    list = list.filter((t) => t.description.toLowerCase().includes(q));
  }
  list = [...list].sort((a, b) => (a.date < b.date ? 1 : -1));
  const inc = list.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const exp = list.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  app.innerHTML = `
  <section class="page-head"><div><h1>Transactions</h1>
  <p class="lede">Every dollar in and out for ${monthLabel(ui.txMonth)} — add, edit, delete, filter and search. Changes save instantly in this browser.</p></div></section>
  ${txFormHTML()}
  <section class="card">
    <div class="filters">
      <label>Month<select id="fMonth">${monthOptions(ui.txMonth)}</select></label>
      <label>Type<select id="fType">
        <option value="all" ${ui.txType === 'all' ? 'selected' : ''}>All</option>
        <option value="income" ${ui.txType === 'income' ? 'selected' : ''}>Income</option>
        <option value="expense" ${ui.txType === 'expense' ? 'selected' : ''}>Expenses</option></select></label>
      <label>Category<select id="fCat">
        <option value="all">All categories</option>
        ${CATEGORIES.map((c) => `<option value="${c.id}" ${ui.txCat === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
        ${INCOME_CATEGORIES.map((c) => `<option value="${c.id}" ${ui.txCat === c.id ? 'selected' : ''}>${c.name}</option>`).join('')}
      </select></label>
      <label class="grow">Search<input type="search" id="fQuery" placeholder="Search descriptions…" value="${esc(ui.txQuery)}"></label>
    </div>
    <p class="muted" id="txCount">Showing ${list.length} of ${total} transactions · Income ${fmt(inc)} · Spending ${fmt(exp)}</p>
    <div class="table-wrap"><table>
      <thead><tr><th>Date</th><th>Description</th><th>Category</th><th class="num">Amount</th><th></th></tr></thead>
      <tbody id="txBody">${list.length ? list.map(txRow).join('') : '<tr><td colspan="5" class="muted">No transactions match these filters.</td></tr>'}</tbody>
    </table></div>
  </section>`;

  const applyFilters = () => {
    let l = monthTx(store, ui.txMonth);
    const totalN = l.length;
    if (ui.txType !== 'all') l = l.filter((t) => t.type === ui.txType);
    if (ui.txCat !== 'all') l = l.filter((t) => t.category === ui.txCat);
    if (ui.txQuery.trim()) {
      const q = ui.txQuery.trim().toLowerCase();
      l = l.filter((t) => t.description.toLowerCase().includes(q));
    }
    l = [...l].sort((a, b) => (a.date < b.date ? 1 : -1));
    const inc2 = l.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp2 = l.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    document.getElementById('txBody').innerHTML = l.length ? l.map(txRow).join('') : '<tr><td colspan="5" class="muted">No transactions match these filters.</td></tr>';
    document.getElementById('txCount').textContent = `Showing ${l.length} of ${totalN} transactions · Income ${fmt(inc2)} · Spending ${fmt(exp2)}`;
  };

  document.getElementById('fMonth').addEventListener('change', (e) => { ui.txMonth = e.target.value; ui.editId = null; render(); });
  document.getElementById('fType').addEventListener('change', (e) => { ui.txType = e.target.value; render(); });
  document.getElementById('fCat').addEventListener('change', (e) => { ui.txCat = e.target.value; render(); });
  document.getElementById('fQuery').addEventListener('input', (e) => { ui.txQuery = e.target.value; applyFilters(); });
  document.getElementById('txTypeSel').addEventListener('change', (e) => {
    document.getElementById('txCatSel').innerHTML = e.target.value === 'income' ? incomeCatOptions('paycheck') : catOptions('groceries');
  });
  document.getElementById('txForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const rec = {
      date: fd.get('date'), type: fd.get('type'), category: fd.get('category'),
      description: fd.get('description').trim(), amount: Math.round(Number(fd.get('amount')) * 100) / 100,
    };
    if (!rec.description || !(rec.amount > 0)) return;
    if (ui.editId) {
      const t = store.transactions.find((x) => x.id === ui.editId);
      Object.assign(t, rec);
      ui.editId = null;
    } else {
      store.transactions.push({ id: uid(), ...rec });
      ui.txMonth = rec.date.slice(0, 7);
    }
    saveStore(store);
    render();
  });
  const cancel = document.getElementById('txCancelEdit');
  if (cancel) cancel.addEventListener('click', () => { ui.editId = null; render(); });
}

function viewBudgets() {
  const spent = spentByCategory(store, CURRENT_MONTH);
  const rows = CATEGORIES.map((c) => {
    const budget = store.budgets[c.id] ?? c.budget;
    const s = spent[c.id] || 0;
    const pct = budget > 0 ? Math.min(s / budget, 1) : 0;
    const over = s > budget;
    return `<div class="budget-row">
      <div class="budget-name"><i class="dot" style="background:${c.color}"></i><div><strong>${c.name}</strong><small>${fmt0(s)} spent · ${over ? `<span class="over">over by ${fmt0(s - budget)}</span>` : `${fmt0(budget - s)} left`}</small></div></div>
      <div class="bar-track grow"><div class="bar-fill ${over ? 'over' : ''}" style="width:${Math.round(pct * 100)}%;background:${c.color}"></div></div>
      <label class="budget-input">$<input type="number" min="0" step="10" value="${budget}" data-budget="${c.id}" aria-label="${c.name} monthly budget"></label>
    </div>`;
  }).join('');
  const totalBudget = CATEGORIES.reduce((s, c) => s + (store.budgets[c.id] ?? c.budget), 0);
  const totalSpent = Object.values(spent).reduce((s, v) => s + v, 0);
  app.innerHTML = `
  <section class="page-head"><div><h1>Monthly budgets</h1>
  <p class="lede">Set a spending cap for each category for ${monthLabel(CURRENT_MONTH)}. Type a new amount and it saves right away — bars and warnings update as you type.</p></div></section>
  <section class="stat-grid">
    <div class="stat"><span>Total budgeted</span><strong>${fmt0(totalBudget)}</strong><small>across ${CATEGORIES.length} categories</small></div>
    <div class="stat"><span>Spent so far</span><strong class="expense">${fmt0(totalSpent)}</strong><small>${Math.round((totalSpent / totalBudget) * 100)}% of the plan</small></div>
    <div class="stat"><span>Budget left</span><strong>${fmt0(totalBudget - totalSpent)}</strong><small>${CATEGORIES.filter((c) => (spent[c.id] || 0) > (store.budgets[c.id] ?? c.budget)).length} categories over</small></div>
  </section>
  <section class="card"><h2>Category budgets — ${monthLabel(CURRENT_MONTH)}</h2>${rows}
  <p class="muted">Tip: housing is rent plus a small buffer. Budgets reset each month; what you set here applies to ${monthLabel(CURRENT_MONTH)}.</p></section>`;
  app.querySelectorAll('[data-budget]').forEach((input) => {
    input.addEventListener('change', () => {
      const v = Math.max(0, Math.round(Number(input.value) || 0));
      store.budgets[input.dataset.budget] = v;
      saveStore(store);
      render();
    });
  });
}

function viewBills() {
  const paid = store.bills.filter((b) => isBillPaid(store, b.id, CURRENT_MONTH));
  const unpaid = store.bills.filter((b) => !isBillPaid(store, b.id, CURRENT_MONTH));
  const dueTotal = store.bills.reduce((s, b) => s + b.amount, 0);
  const paidTotal = paid.reduce((s, b) => s + b.amount, 0);
  const row = (b) => {
    const st = billStatus(store, b, CURRENT_MONTH);
    return `<tr>
      <td><strong>${esc(b.name)}</strong><br><small class="muted">${b.autopay ? 'Autopay on' : 'Manual payment'} · ${esc(categoryName(b.category))}</small></td>
      <td class="num">${fmt(b.amount)}</td>
      <td>Day ${b.dueDay}</td>
      <td><span class="tag ${st}">${st === 'paid' ? 'Paid' : st === 'overdue' ? 'Overdue' : 'Upcoming'}</span></td>
      <td class="row-actions">${st === 'paid'
        ? `<button class="btn small" data-unpay-bill="${b.id}">Mark unpaid</button>`
        : `<button class="btn small primary" data-pay-bill="${b.id}">Mark paid</button>`}</td></tr>`;
  };
  app.innerHTML = `
  <section class="page-head"><div><h1>Bills &amp; reminders</h1>
  <p class="lede">Recurring household bills for ${monthLabel(CURRENT_MONTH)}. Marking a bill paid records the payment in your transactions, so the books always match the bank.</p></div></section>
  <section class="stat-grid">
    <div class="stat"><span>Bills due this month</span><strong>${fmt(dueTotal)}</strong><small>${store.bills.length} recurring bills</small></div>
    <div class="stat"><span>Paid</span><strong class="income">${fmt(paidTotal)}</strong><small>${paid.length} of ${store.bills.length} settled</small></div>
    <div class="stat"><span>Still to pay</span><strong class="${unpaid.length ? 'expense' : ''}">${fmt(dueTotal - paidTotal)}</strong><small>${unpaid.length} bill${unpaid.length === 1 ? '' : 's'} left${unpaid.some((b) => billStatus(store, b, CURRENT_MONTH) === 'overdue') ? ' · <span class="over">one is overdue</span>' : ''}</small></div>
  </section>
  <section class="card">
    <h2>All bills — ${monthLabel(CURRENT_MONTH)}</h2>
    <div class="table-wrap"><table>
      <thead><tr><th>Bill</th><th class="num">Amount</th><th>Due</th><th>Status</th><th></th></tr></thead>
      <tbody>${store.bills.map(row).join('')}</tbody>
    </table></div>
  </section>
  <section class="card">
    <h3>Add a recurring bill</h3>
    <form id="billForm" class="form-grid">
      <label>Bill name<input type="text" name="name" required maxlength="60" placeholder="e.g. Water & Sewer"></label>
      <label>Amount (USD)<input type="number" name="amount" required min="0.01" step="0.01" placeholder="0.00"></label>
      <label>Due day of month<input type="number" name="dueDay" required min="1" max="28" value="15"></label>
      <label>Category<select name="category">${catOptions('utilities')}</select></label>
      <label class="check"><input type="checkbox" name="autopay"> Autopay on</label>
      <div class="form-actions"><button class="btn primary" type="submit">Add bill</button></div>
    </form>
  </section>`;
  document.getElementById('billForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    store.bills.push({
      id: uid(), name: fd.get('name').trim(), amount: Math.round(Number(fd.get('amount')) * 100) / 100,
      dueDay: Math.min(28, Math.max(1, Number(fd.get('dueDay')) || 15)),
      category: fd.get('category'), autopay: fd.get('autopay') === 'on',
    });
    saveStore(store);
    render();
  });
}

function viewGoals() {
  const totalSaved = store.goals.reduce((s, g) => s + g.saved, 0);
  const totalTarget = store.goals.reduce((s, g) => s + g.target, 0);
  app.innerHTML = `
  <section class="page-head"><div><h1>Savings goals</h1>
  <p class="lede">What the family is saving toward. Add funds any time — progress bars and totals update immediately. Savings transfers are kept separate from spending.</p></div></section>
  <section class="stat-grid">
    <div class="stat"><span>Total saved</span><strong class="income">${fmt0(totalSaved)}</strong><small>across ${store.goals.length} goals</small></div>
    <div class="stat"><span>Total target</span><strong>${fmt0(totalTarget)}</strong><small>${Math.round((totalSaved / totalTarget) * 100)}% of the way there</small></div>
    <div class="stat"><span>Still to save</span><strong>${fmt0(totalTarget - totalSaved)}</strong><small>at ${fmt0(150)} a month, the college fund lands first</small></div>
  </section>
  <section class="goal-grid">
    ${store.goals.map((g) => {
      const pct = Math.min(Math.round((g.saved / g.target) * 100), 100);
      return `<div class="card goal-card">
        <h2>${esc(g.name)}</h2>
        <p class="muted">${esc(g.note)}</p>
        <div class="goal-numbers"><strong>${fmt0(g.saved)}</strong><span>of ${fmt0(g.target)} · ${pct}%</span></div>
        <div class="bar-track big"><div class="bar-fill" style="width:${pct}%"></div></div>
        <form class="deposit" data-goal="${g.id}">
          <label>$<input type="number" name="amount" min="1" step="1" required placeholder="Amount" aria-label="Amount to add to ${esc(g.name)}"></label>
          <button class="btn primary" type="submit">Add funds</button>
        </form>
      </div>`;
    }).join('')}
  </section>
  <section class="card">
    <h3>Start a new goal</h3>
    <form id="goalForm" class="form-grid">
      <label>Goal name<input type="text" name="name" required maxlength="60" placeholder="e.g. New Sofa"></label>
      <label>Target amount (USD)<input type="number" name="target" required min="1" step="1" placeholder="1000"></label>
      <label>Already saved (USD)<input type="number" name="saved" min="0" step="1" value="0"></label>
      <label>Note<input type="text" name="note" maxlength="80" placeholder="Why this matters"></label>
      <div class="form-actions"><button class="btn primary" type="submit">Create goal</button></div>
    </form>
  </section>`;
  app.querySelectorAll('.deposit').forEach((f) => {
    f.addEventListener('submit', (e) => {
      e.preventDefault();
      const amount = Math.round(Number(new FormData(f).get('amount') || f.querySelector('input').value) || 0);
      if (amount <= 0) return;
      const g = store.goals.find((x) => x.id === f.dataset.goal);
      g.saved = Math.round((g.saved + amount) * 100) / 100;
      saveStore(store);
      render();
    });
  });
  document.getElementById('goalForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const target = Math.max(1, Math.round(Number(fd.get('target')) || 0));
    store.goals.push({
      id: uid(), name: fd.get('name').trim(), target,
      saved: Math.min(Math.max(0, Math.round(Number(fd.get('saved')) || 0)), target),
      note: fd.get('note').trim() || 'A new Rivera goal',
    });
    saveStore(store);
    render();
  });
}

function trendChart() {
  const max = Math.max(...MONTHS.map((m) => Math.max(monthTotals(store, m).income, monthTotals(store, m).expense)), 1);
  return `<div class="trend">${MONTHS.map((m) => {
    const t = monthTotals(store, m);
    return `<div class="trend-col">
      <div class="trend-bars">
        <div class="trend-bar income" style="height:${Math.round((t.income / max) * 120)}px" title="Income ${fmt0(t.income)}"></div>
        <div class="trend-bar expense" style="height:${Math.round((t.expense / max) * 120)}px" title="Spending ${fmt0(t.expense)}"></div>
      </div>
      <span>${monthLabel(m).slice(0, 3)}</span>
      <small>${fmt0(t.income)} in<br>${fmt0(t.expense)} out</small></div>`;
  }).join('')}</div>
  <p class="legend-line"><i class="dot" style="background:#2f6f5e"></i> Income &nbsp; <i class="dot" style="background:#c25e5e"></i> Spending</p>`;
}

function viewReports() {
  const ym = ui.reportMonth;
  const t = monthTotals(store, ym);
  const spent = spentByCategory(store, ym);
  const rows = CATEGORIES.map((c) => ({ ...c, spent: spent[c.id] || 0 }))
    .filter((c) => c.spent > 0).sort((a, b) => b.spent - a.spent);
  const total = rows.reduce((s, c) => s + c.spent, 0) || 1;
  const top = [...monthTx(store, ym)].filter((x) => x.type === 'expense').sort((a, b) => b.amount - a.amount).slice(0, 5);
  app.innerHTML = `
  <section class="page-head"><div><h1>Reports &amp; exports</h1>
  <p class="lede">Six months at a glance, a category breakdown for any month, and your data out in open formats. Pick a month to re-run the numbers.</p></div></section>
  <section class="card"><h2>Income vs. spending — last 6 months</h2>${trendChart()}</section>
  <section class="grid-2">
    <div class="card">
      <h2>Where it went — <select id="reportMonth" class="inline-select">${monthOptions(ym)}</select></h2>
      <p class="muted">${monthLabel(ym)}: income ${fmt(t.income)} · spending ${fmt(t.expense)} · ${t.remaining >= 0 ? 'kept' : 'overspent by'} ${fmt(Math.abs(t.remaining))}</p>
      <table class="plain">
        <thead><tr><th>Category</th><th class="num">Spent</th><th class="num">Share</th><th style="width:38%"> </th></tr></thead>
        <tbody>${rows.map((c) => `<tr><td><i class="dot" style="background:${c.color}"></i> ${c.name}</td>
          <td class="num">${fmt(c.spent)}</td><td class="num">${Math.round((c.spent / total) * 100)}%</td>
          <td><div class="bar-track slim"><div class="bar-fill" style="width:${Math.round((c.spent / total) * 100)}%;background:${c.color}"></div></div></td></tr>`).join('')}</tbody>
      </table>
    </div>
    <div class="card">
      <h2>Biggest single expenses — ${monthLabel(ym).split(' ')[0]}</h2>
      <ol class="top-list">${top.map((x) => `<li><span>${esc(x.description)}<small>${x.date} · ${esc(categoryName(x.category))}</small></span><b>${fmt(x.amount)}</b></li>`).join('')}</ol>
      <h2 style="margin-top:1.4rem">Take your data with you</h2>
      <p class="muted">Exports include every transaction in the books, not just this month.</p>
      <div class="btn-row">
        <button class="btn primary" id="exportCsv">Download CSV</button>
        <button class="btn" id="exportJson">Download JSON</button>
        <button class="btn danger" id="resetData">Reset to sample data</button>
      </div>
      <p class="muted" id="exportMsg"></p>
    </div>
  </section>`;
  document.getElementById('reportMonth').addEventListener('change', (e) => { ui.reportMonth = e.target.value; render(); });
  document.getElementById('exportCsv').addEventListener('click', () => {
    const rowsCsv = [['date', 'description', 'category', 'type', 'amount USD'],
      ...[...store.transactions].sort((a, b) => (a.date < b.date ? -1 : 1))
        .map((x) => [x.date, `"${x.description.replace(/"/g, '""')}"`, x.category, x.type, x.amount.toFixed(2)])];
    download('homeledger-transactions.csv', rowsCsv.map((r) => r.join(',')).join('\n'), 'text/csv');
    document.getElementById('exportMsg').textContent = `CSV downloaded — ${store.transactions.length} transactions.`;
  });
  document.getElementById('exportJson').addEventListener('click', () => {
    download('homeledger-data.json', JSON.stringify(store, null, 2), 'application/json');
    document.getElementById('exportMsg').textContent = 'JSON downloaded — budgets, bills, goals and all transactions.';
  });
  document.getElementById('resetData').addEventListener('click', () => {
    if (confirm('Reset everything back to the sample Rivera household data? Your changes will be lost.')) {
      store = resetStore();
      ui.editId = null;
      render();
    }
  });
}

/* ---------- router ---------- */
const ROUTES = {
  dashboard: viewDashboard,
  transactions: viewTransactions,
  budgets: viewBudgets,
  bills: viewBills,
  goals: viewGoals,
  reports: viewReports,
};

function render(keepScroll = true) {
  const y = keepScroll ? window.scrollY : 0;
  const hash = location.hash.replace(/^#\/?/, '') || 'dashboard';
  const route = ROUTES[hash] ? hash : 'dashboard';
  document.querySelectorAll('[data-nav]').forEach((a) => a.classList.toggle('active', a.dataset.nav === route));
  document.getElementById('monthBadge').textContent = monthLabel(CURRENT_MONTH);
  ROUTES[route]();
  const t = monthTotals(store, CURRENT_MONTH);
  document.getElementById('footStats').textContent =
    `${store.transactions.length} transactions · ${store.bills.length} bills · ${store.goals.length} goals · November balance ${fmt(t.remaining)}`;
  window.scrollTo(0, y);
}

app.addEventListener('click', (e) => {
  const edit = e.target.closest('[data-edit-tx]');
  if (edit) {
    ui.editId = edit.dataset.editTx;
    const t = store.transactions.find((x) => x.id === ui.editId);
    if (t) ui.txMonth = t.date.slice(0, 7);
    render(false);
    document.getElementById('txForm')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  const del = e.target.closest('[data-del-tx]');
  if (del) {
    const t = store.transactions.find((x) => x.id === del.dataset.delTx);
    if (t && confirm(`Delete "${t.description}" (${fmt(t.amount)})?`)) {
      store.transactions = store.transactions.filter((x) => x.id !== t.id);
      saveStore(store);
      render();
    }
    return;
  }
  const pay = e.target.closest('[data-pay-bill]');
  if (pay) {
    const b = store.bills.find((x) => x.id === pay.dataset.payBill);
    if (!b) return;
    (store.paidBills[CURRENT_MONTH] = store.paidBills[CURRENT_MONTH] || []).push(b.id);
    store.transactions.push({ id: uid(), date: TODAY, description: b.name, category: b.category, amount: b.amount, type: 'expense' });
    saveStore(store);
    render();
    return;
  }
  const unpay = e.target.closest('[data-unpay-bill]');
  if (unpay) {
    const b = store.bills.find((x) => x.id === unpay.dataset.unpayBill);
    if (!b) return;
    store.paidBills[CURRENT_MONTH] = (store.paidBills[CURRENT_MONTH] || []).filter((id) => id !== b.id);
    store.transactions = store.transactions.filter((x) => !(x.date === TODAY && x.description === b.name && x.amount === b.amount));
    saveStore(store);
    render();
  }
});

window.addEventListener('hashchange', () => render(false));
render(false);
