// Hearth & Ledger — the sample household ledger.
//
// The Chen family (Maya, Daniel, Lily, 9, and Noah, 6) keep a real, fixed sample
// ledger for June–November 2026 so the site opens with figures to look at. The
// numbers below are the ledger itself: per-month totals per category, split into
// individual transactions by a small seeded generator, so the same ledger is
// produced on every load and every machine. Nothing here is fetched or random
// at run time in a way the user cannot reproduce.
//
// November 2026 (the month the site opens on) works out to:
//   income $7,115 · spending $4,440 · balance $2,675 · savings rate ≈ 38%
//   monthly budget $5,050 across 10 categories, every category inside its budget.

export const HOUSEHOLD = {
  name: 'The Chen Family',
  members: ['Maya', 'Daniel', 'Lily (9)', 'Noah (6)'],
  home: 'Maple Court, 3 bedrooms',
  currency: 'USD',
};

export const CATEGORIES = [
  { id: 'housing',       name: 'Housing',       color: '#1d4a38', budget: 1850 },
  { id: 'groceries',    name: 'Groceries',     color: '#2e7d4f', budget: 780 },
  { id: 'dining',       name: 'Dining Out',    color: '#c77f1a', budget: 320 },
  { id: 'transport',    name: 'Transport',     color: '#2f6f8f', budget: 380 },
  { id: 'utilities',    name: 'Utilities',     color: '#6b5ca5', budget: 290 },
  { id: 'healthcare',   name: 'Healthcare',    color: '#a34d7a', budget: 260 },
  { id: 'entertainment', name: 'Entertainment', color: '#d95f43', budget: 240 },
  { id: 'clothing',     name: 'Clothing',      color: '#7a6a53', budget: 180 },
  { id: 'education',    name: 'Education',     color: '#3e7cb1', budget: 420 },
  { id: 'kids',         name: 'Kids & Family', color: '#e07a9b', budget: 330 },
];

export const MONTHS = [
  { id: '2026-06', label: 'June 2026' },
  { id: '2026-07', label: 'July 2026' },
  { id: '2026-08', label: 'August 2026' },
  { id: '2026-09', label: 'September 2026' },
  { id: '2026-10', label: 'October 2026' },
  { id: '2026-11', label: 'November 2026' },
];

export const DEFAULT_MONTH = '2026-11';
// The site's "today" for due dates and new entries. The sample ledger ends here.
export const TODAY = '2026-11-26';

// Monthly spending totals, in dollars, in CATEGORIES order:
// housing, groceries, dining, transport, utilities, healthcare,
// entertainment, clothing, education, kids.
const SPENDING_BY_MONTH = {
  '2026-06': [1850, 668, 241, 355, 268, 224, 203, 165, 372, 158],
  '2026-07': [1850, 701, 289, 361, 274, 189, 226, 128, 348, 141],
  '2026-08': [1850, 745, 302, 348, 262, 241, 214, 196, 389, 172],
  '2026-09': [1850, 689, 254, 339, 247, 176, 168, 154, 341, 126],
  '2026-10': [1850, 723, 276, 366, 258, 212, 195, 171, 364, 149],
  '2026-11': [1850, 712, 268, 342, 251, 198, 187, 142, 356, 134],
};

// Monthly income rows: [day of month, description, amount in dollars].
const INCOME_BY_MONTH = {
  '2026-06': [[1, 'Salary — Maya, Northwind Design Studio', 4200], [5, 'Salary — Daniel, Harbor Logistics', 2450], [18, 'Freelance illustration — Maya', 180], [30, 'Bank interest — First Community', 120]],
  '2026-07': [[1, 'Salary — Maya, Northwind Design Studio', 4200], [5, 'Salary — Daniel, Harbor Logistics', 2450], [17, 'Freelance illustration — Maya', 310], [30, 'Bank interest — First Community', 125]],
  '2026-08': [[1, 'Salary — Maya, Northwind Design Studio', 4200], [5, 'Salary — Daniel, Harbor Logistics', 2450], [19, 'Freelance illustration — Maya', 265], [30, 'Bank interest — First Community', 140]],
  '2026-09': [[1, 'Salary — Maya, Northwind Design Studio', 4200], [5, 'Salary — Daniel, Harbor Logistics', 2450], [16, 'Freelance illustration — Maya', 150], [30, 'Bank interest — First Community', 90]],
  '2026-10': [[1, 'Salary — Maya, Northwind Design Studio', 4200], [5, 'Salary — Daniel, Harbor Logistics', 2450], [18, 'Freelance illustration — Maya', 410], [30, 'Bank interest — First Community', 120]],
  '2026-11': [[1, 'Salary — Maya, Northwind Design Studio', 4200], [5, 'Salary — Daniel, Harbor Logistics', 2450], [17, 'Freelance illustration — Maya', 340], [25, 'Bank interest — First Community', 125]],
};

// How many transactions each category's monthly total is split into.
const SPLIT_COUNT = {
  housing: 1, groceries: 6, dining: 5, transport: 5, utilities: 3,
  healthcare: 2, entertainment: 4, clothing: 2, education: 3, kids: 3,
};

// Where the money went: a merchant per category, cycled through in order.
const MERCHANTS = {
  housing: ['Rent — Maple Court Apartments'],
  groceries: ['Maple Street Market', 'GreenBasket Groceries', 'Daily Fresh Mart', 'Sunrise Produce Co.', 'Neighborhood Pantry', 'Maple Street Market'],
  dining: ['Noodle House on 5th', 'Bella Trattoria', 'The Corner Diner', 'Sushi Kawa', 'Café Lumière'],
  transport: ['Metro Transit Pass', 'Highway Fuel Stop', 'QuickRide Taxi', 'AutoCare Garage', 'Downtown Parking'],
  utilities: ['City Power & Light', 'SkyNet Internet', 'MobilePlus Wireless'],
  healthcare: ['Riverside Pharmacy', 'Family Health Clinic'],
  entertainment: ['Cinema City', 'StreamHub Monthly', 'Arcade Zone', 'BookNook'],
  clothing: ['Thread & Co.', 'KidsWear Outlet'],
  education: ['Bright Minds Tutoring', 'Piano Lessons Studio', 'School Supplies Depot'],
  kids: ['Toy Chest', 'Happy Kids Daycare', 'Family Fun Park'],
};

// A tiny deterministic generator (mulberry32). Same seed, same ledger, every time.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Split a whole-dollar total into n positive cent amounts that add up exactly.
function splitTotal(totalDollars, n, rng) {
  const totalCents = Math.round(totalDollars * 100);
  const weights = Array.from({ length: n }, () => 0.35 + rng());
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const amounts = [];
  let assigned = 0;
  for (let i = 0; i < n - 1; i++) {
    const cents = Math.max(300, Math.round((totalCents * weights[i]) / weightSum));
    amounts.push(cents);
    assigned += cents;
  }
  amounts.push(totalCents - assigned);
  return amounts.map((c) => c / 100);
}

function buildSampleTransactions() {
  const list = [];
  let id = 1;
  for (const month of MONTHS) {
    const totals = SPENDING_BY_MONTH[month.id];
    CATEGORIES.forEach((cat, ci) => {
      const total = totals[ci];
      const n = SPLIT_COUNT[cat.id];
      const rng = mulberry32(1000 + ci * 97 + Number(month.id.slice(5)) * 13);
      const amounts = splitTotal(total, n, rng);
      const days = amounts.map(() => 1 + Math.floor(rng() * 28)).sort((a, b) => a - b);
      const merchants = MERCHANTS[cat.id];
      amounts.forEach((amount, i) => {
        list.push({
          id: `t${id++}`,
          date: `${month.id}-${String(days[i]).padStart(2, '0')}`,
          description: merchants[i % merchants.length],
          category: cat.id,
          type: 'expense',
          amount,
        });
      });
    });
    for (const [day, description, amount] of INCOME_BY_MONTH[month.id]) {
      list.push({
        id: `t${id++}`,
        date: `${month.id}-${String(day).padStart(2, '0')}`,
        description,
        category: 'income',
        type: 'income',
        amount,
      });
    }
  }
  list.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  return list;
}

export const SAMPLE_TRANSACTIONS = buildSampleTransactions();

// Recurring monthly bills. `paid` is the state for November 2026, the current month.
export const SAMPLE_BILLS = [
  { id: 'b1', name: 'Rent — Maple Court Apartments', amount: 1850, category: 'housing', dueDay: 1, paid: true, paidDate: '2026-11-01' },
  { id: 'b2', name: 'StreamHub Monthly', amount: 16, category: 'entertainment', dueDay: 5, paid: true, paidDate: '2026-11-05' },
  { id: 'b3', name: 'Bright Minds Tutoring', amount: 240, category: 'education', dueDay: 8, paid: true, paidDate: '2026-11-08' },
  { id: 'b4', name: 'City Power & Light', amount: 148, category: 'utilities', dueDay: 12, paid: true, paidDate: '2026-11-12' },
  { id: 'b5', name: 'SkyNet Internet', amount: 79, category: 'utilities', dueDay: 15, paid: true, paidDate: '2026-11-15' },
  { id: 'b6', name: 'MobilePlus Wireless (2 lines)', amount: 96, category: 'utilities', dueDay: 18, paid: true, paidDate: '2026-11-18' },
  { id: 'b7', name: 'SafeHaven Home Insurance', amount: 132, category: 'housing', dueDay: 20, paid: true, paidDate: '2026-11-20' },
  { id: 'b8', name: 'ClearWater Utility', amount: 64, category: 'utilities', dueDay: 22, paid: true, paidDate: '2026-11-22' },
  { id: 'b9', name: "Kids' Swim School", amount: 95, category: 'kids', dueDay: 28, paid: false, paidDate: null },
  { id: 'b10', name: 'GasWorks Heating', amount: 58, category: 'utilities', dueDay: 30, paid: false, paidDate: null },
];

// What the family is saving for.
export const SAMPLE_GOALS = [
  { id: 'g1', name: 'Emergency Fund', target: 10000, saved: 6400, note: 'Six months of essentials, for peace of mind.' },
  { id: 'g2', name: 'Japan Family Trip', target: 3500, saved: 2150, note: 'Two weeks in Kyoto and Tokyo, spring 2027.' },
  { id: 'g3', name: 'New Family Car', target: 12000, saved: 4800, note: 'Replace the 2016 wagon before next winter.' },
  { id: 'g4', name: "Kids' College Fund", target: 20000, saved: 7300, note: 'A little every month for Lily and Noah.' },
];

export function money(n) {
  return '$' + Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function money0(n) {
  return '$' + Math.round(Number(n)).toLocaleString('en-US');
}

export function monthLabel(monthId) {
  const found = MONTHS.find((m) => m.id === monthId);
  return found ? found.label : monthId;
}

export function categoryById(id) {
  return CATEGORIES.find((c) => c.id === id) || { id, name: 'Other', color: '#888888', budget: 0 };
}

export function totalBudget() {
  return CATEGORIES.reduce((sum, c) => sum + c.budget, 0);
}
