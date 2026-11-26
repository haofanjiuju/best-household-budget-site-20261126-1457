// Hearth & Ledger — the household's saved state.
//
// Everything the family changes is kept in this browser's localStorage under one
// key, so the site works with no account and no network. The first visit seeds
// the store from the sample ledger in data.js; "Reset to sample data" in Reports
// restores that seed. Nothing here ever leaves the device.

import {
  CATEGORIES, SAMPLE_BILLS, SAMPLE_GOALS, SAMPLE_TRANSACTIONS, TODAY,
} from './data.js';

const STORAGE_KEY = 'hearth-ledger-v1';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function freshSeed() {
  return {
    transactions: clone(SAMPLE_TRANSACTIONS),
    budgets: Object.fromEntries(CATEGORIES.map((c) => [c.id, c.budget])),
    bills: clone(SAMPLE_BILLS),
    goals: clone(SAMPLE_GOALS),
    nextId: 10000,
  };
}

export function loadStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seed = freshSeed();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed.transactions) || !Array.isArray(parsed.bills) || !Array.isArray(parsed.goals)) {
      throw new Error('stored state is not a ledger');
    }
    return parsed;
  } catch {
    const seed = freshSeed();
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(seed)); } catch { /* storage unavailable */ }
    return seed;
  }
}

export function saveStore(state) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* storage unavailable */ }
}

export function resetStore() {
  const seed = freshSeed();
  saveStore(seed);
  return seed;
}

// ---- queries ---------------------------------------------------------------

export function monthRows(state, monthId) {
  return state.transactions.filter((t) => t.date.startsWith(monthId));
}

export function monthSummary(state, monthId) {
  const rows = monthRows(state, monthId);
  const income = rows.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const spending = rows.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
  const balance = income - spending;
  return { income, spending, balance, rate: income > 0 ? (balance / income) * 100 : 0 };
}

export function categorySpending(state, monthId) {
  const rows = monthRows(state, monthId).filter((t) => t.type === 'expense');
  const totals = {};
  for (const row of rows) totals[row.category] = (totals[row.category] || 0) + row.amount;
  return CATEGORIES.map((c) => ({
    ...c,
    spent: totals[c.id] || 0,
    budget: state.budgets[c.id] ?? c.budget,
  }));
}

export function monthSummaries(state) {
  return ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11']
    .map((id) => ({ month: id, ...monthSummary(state, id) }));
}

// ---- edits -----------------------------------------------------------------

export function newId(state) {
  const id = `u${state.nextId || 10000}`;
  state.nextId = (state.nextId || 10000) + 1;
  return id;
}

export function addTransaction(state, fields) {
  const row = {
    id: newId(state),
    date: fields.date || TODAY,
    description: fields.description.trim(),
    category: fields.category,
    type: fields.type,
    amount: Math.round(Number(fields.amount) * 100) / 100,
  };
  state.transactions.push(row);
  state.transactions.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  saveStore(state);
  return row;
}

export function updateTransaction(state, id, fields) {
  const row = state.transactions.find((t) => t.id === id);
  if (!row) return null;
  row.date = fields.date || row.date;
  row.description = fields.description.trim() || row.description;
  row.category = fields.category;
  row.type = fields.type;
  row.amount = Math.round(Number(fields.amount) * 100) / 100;
  state.transactions.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  saveStore(state);
  return row;
}

export function deleteTransaction(state, id) {
  state.transactions = state.transactions.filter((t) => t.id !== id);
  saveStore(state);
}

export function setBudget(state, categoryId, amount) {
  state.budgets[categoryId] = Math.max(0, Math.round(Number(amount) * 100) / 100);
  saveStore(state);
}

export function totalBudget(state) {
  return CATEGORIES.reduce((sum, c) => sum + (state.budgets[c.id] ?? c.budget), 0);
}

// Marking a bill paid writes the matching expense into the ledger, so the
// month's spending always agrees with the bills. Undoing it removes that row.
export function markBillPaid(state, billId) {
  const bill = state.bills.find((b) => b.id === billId);
  if (!bill || bill.paid) return null;
  bill.paid = true;
  bill.paidDate = TODAY;
  const row = {
    id: newId(state),
    date: TODAY,
    description: bill.name,
    category: bill.category,
    type: 'expense',
    amount: bill.amount,
    billId: bill.id,
  };
  state.transactions.push(row);
  state.transactions.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  saveStore(state);
  return row;
}

export function undoBillPaid(state, billId) {
  const bill = state.bills.find((b) => b.id === billId);
  if (!bill || !bill.paid) return false;
  bill.paid = false;
  bill.paidDate = null;
  state.transactions = state.transactions.filter((t) => t.billId !== billId);
  saveStore(state);
  return true;
}

export function addBill(state, fields) {
  const bill = {
    id: newId(state),
    name: fields.name.trim(),
    amount: Math.round(Number(fields.amount) * 100) / 100,
    category: fields.category,
    dueDay: Math.min(28, Math.max(1, Number(fields.dueDay) || 1)),
    paid: false,
    paidDate: null,
  };
  state.bills.push(bill);
  state.bills.sort((a, b) => a.dueDay - b.dueDay);
  saveStore(state);
  return bill;
}

export function deleteBill(state, billId) {
  state.bills = state.bills.filter((b) => b.id !== billId);
  saveStore(state);
}

// Adding money to a goal is a transfer, not spending: it moves cash from the
// month's balance into the goal and is recorded as its own transaction type.
export function addToGoal(state, goalId, amount) {
  const goal = state.goals.find((g) => g.id === goalId);
  if (!goal) return null;
  const value = Math.round(Number(amount) * 100) / 100;
  if (!(value > 0)) return null;
  goal.saved = Math.round((goal.saved + value) * 100) / 100;
  state.transactions.push({
    id: newId(state),
    date: TODAY,
    description: `Transfer to savings — ${goal.name}`,
    category: 'savings',
    type: 'transfer',
    amount: value,
  });
  state.transactions.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  saveStore(state);
  return goal;
}

export function addGoal(state, fields) {
  const goal = {
    id: newId(state),
    name: fields.name.trim(),
    target: Math.round(Number(fields.target) * 100) / 100,
    saved: Math.round(Number(fields.saved || 0) * 100) / 100,
    note: (fields.note || '').trim(),
  };
  state.goals.push(goal);
  saveStore(state);
  return goal;
}

export function deleteGoal(state, goalId) {
  state.goals = state.goals.filter((g) => g.id !== goalId);
  saveStore(state);
}

// ---- export ----------------------------------------------------------------

export function transactionsCsv(state) {
  const head = 'date,description,category,type,amount\n';
  const esc = (v) => `"${String(v).replace(/"/g, '""')}"`;
  const lines = state.transactions.map((t) => [
    t.date, esc(t.description), t.category, t.type, t.amount.toFixed(2),
  ].join(','));
  return head + lines.join('\n') + '\n';
}

export function downloadFile(filename, text, mime) {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
