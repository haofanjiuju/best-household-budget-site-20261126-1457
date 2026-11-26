// Hearth & Ledger — the router and the wiring.
//
// Hash routes, one per section, so every page of the site is reached by a link:
//   #/                Dashboard
//   #/transactions    Transactions
//   #/budgets         Budgets
//   #/bills           Bills
//   #/goals           Savings Goals
//   #/reports         Reports
//
// window.__shotReady is false while a page renders and true once it is on
// screen, so a screenshot script knows when to capture.

import { DEFAULT_MONTH } from './data.js';
import { loadStore, setBudget } from './store.js';
import {
  handleAction, handleForm, viewBills, viewBudgets, viewDashboard,
  viewGoals, viewReports, viewTransactions,
} from './views.js';

const app = document.getElementById('app');
const state = loadStore();

// Interface state that lives for the session only (the ledger itself is saved).
const ui = {
  month: DEFAULT_MONTH,
  txFilter: { month: DEFAULT_MONTH, type: 'all', category: 'all', q: '', editingId: null },
};

const ROUTES = {
  '': viewDashboard,
  transactions: viewTransactions,
  budgets: viewBudgets,
  bills: viewBills,
  goals: viewGoals,
  reports: viewReports,
};

const TITLES = {
  '': 'Hearth & Ledger — Household Budget',
  transactions: 'Transactions | Hearth & Ledger',
  budgets: 'Budgets | Hearth & Ledger',
  bills: 'Bills | Hearth & Ledger',
  goals: 'Savings Goals | Hearth & Ledger',
  reports: 'Reports | Hearth & Ledger',
};

function routeName() {
  const hash = location.hash.replace(/^#\/?/, '').split('?')[0];
  return ROUTES[hash] ? hash : '';
}

function render() {
  window.__shotReady = false;
  const route = routeName();
  const view = ROUTES[route];
  document.title = TITLES[route];
  document.querySelectorAll('.mainnav a').forEach((a) => {
    a.classList.toggle('active', (a.dataset.route || '') === route);
  });
  app.innerHTML = view(state, ui);
  window.scrollTo(0, 0);
  window.__shotReady = true;
}

// One delegated click handler for every button in the app.
app.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');
  if (!target) return;
  handleAction(target.dataset.action, target, state, ui, render);
});

// One delegated submit handler for every form in the app.
app.addEventListener('submit', (event) => {
  event.preventDefault();
  handleForm(event.target, state, ui, render);
});

// Filter and month controls re-render as they change.
app.addEventListener('change', (event) => {
  const el = event.target;
  if (el.matches('[data-ui="month"]')) {
    ui.month = el.value;
    render();
  } else if (el.matches('[data-ui="tx-month"]')) {
    ui.txFilter.month = el.value;
    render();
  } else if (el.matches('[data-ui="tx-type"]')) {
    ui.txFilter.type = el.value;
    render();
  } else if (el.matches('[data-ui="tx-category"]')) {
    ui.txFilter.category = el.value;
    render();
  }
});

// Budget amounts save the moment they change; the search box filters live.
app.addEventListener('input', (event) => {
  const el = event.target;
  if (el.matches('[data-budget-for]')) {
    const value = Number(el.value);
    if (Number.isFinite(value) && value >= 0) {
      setBudget(state, el.dataset.budgetFor, value);
      // Refresh the bars and badges without moving the caret: only the
      // progress rows change, so re-render and put focus back in this field.
      // (A number input has no text selection, so focus alone is enough.)
      const cat = el.dataset.budgetFor;
      render();
      const again = app.querySelector(`[data-budget-for="${cat}"]`);
      if (again) again.focus();
    }
  } else if (el.matches('[data-ui="tx-q"]')) {
    ui.txFilter.q = el.value;
    render();
    const q = app.querySelector('[data-ui="tx-q"]');
    if (q) { q.focus(); q.setSelectionRange(q.value.length, q.value.length); }
  }
});

window.addEventListener('hashchange', render);
render();
